// Snapshot registry metadata for every guide Initializr can recommend.
//
//   node scripts/snapshot.ts            # refresh (uses .cache for anything < 12h old)
//   node scripts/snapshot.ts --fresh    # ignore the JSON cache
//
// Writes snapshot/registry.json (versions, paths, dependency manifests) and
// snapshot/packages/<name>@<version>.json (profiles + CapabilityStatement surface) for package
// versions the KB names or the catalog would pin. Both are committed so builds are reproducible
// and a scheduled job can diff them against the live registry.

import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  compareVersions,
  isPrerelease,
  isR4,
  matchesWildcard,
  normalizeFhirVersion,
} from '../src/core/semver.ts';
import type {
  Dependency,
  PackageSnapshot,
  RegistryPackage,
  RegistrySnapshot,
  RegistryVersion,
} from '../src/core/types.ts';
import { summarizeCapStmt, summarizeStructureDefinition } from './lib/extract.ts';
import { loadKb, ROOT } from './lib/kb-load.ts';
import { getJson, getTarball, pool } from './lib/net.ts';
import { readTgz } from './lib/tar.ts';

const FRESH = process.argv.includes('--fresh');
const OUT = join(ROOT, 'snapshot');
const IG_LIST = 'https://raw.githubusercontent.com/FHIR/ig-registry/master/fhir-ig-list.json';

interface IgListEntry {
  name: string;
  description?: string;
  editions?: {
    name: string;
    'ig-version': string;
    package: string;
    'fhir-version'?: string[];
    url: string;
  }[];
  'npm-name': string;
  canonical?: string;
  history?: string;
  'ci-build'?: string;
}
interface NpmMeta {
  name: string;
  versions: Record<string, { version: string; fhirVersion?: string; description?: string }>;
}
interface PackageListEntry {
  version: string;
  path?: string;
  status?: string;
  sequence?: string;
  fhirversion?: string;
  date?: string;
  current?: boolean;
}

const log = (...a: unknown[]) => console.log('[snapshot]', ...a);

async function main() {
  const kb = loadKb();
  const igList =
    (await getJson<{ guides: IgListEntry[] }>(IG_LIST, { fresh: FRESH }))?.guides ?? [];
  const igByNpm = new Map(igList.map((g) => [g['npm-name'], g]));
  log(`ig-registry: ${igList.length} guides`);

  const packages: Record<string, RegistryPackage> = {};
  const canonicals = new Map<string, string>();

  async function registerPackage(name: string): Promise<RegistryPackage | null> {
    if (packages[name]) return packages[name];
    const meta = await getJson<NpmMeta>(`https://packages.fhir.org/${name}`, { fresh: FRESH });
    if (!meta?.versions) return null;
    const ig = igByNpm.get(name);
    const canonical = ig?.canonical ?? canonicals.get(name);
    let list: PackageListEntry[] = [];
    if (canonical) {
      const pl = await getJson<{ list?: PackageListEntry[] }>(
        `${canonical.replace(/\/$/, '')}/package-list.json`,
        { fresh: FRESH },
      );
      list = pl?.list ?? [];
    }
    const byVersion = new Map(list.map((e) => [e.version, e]));
    const versions: RegistryVersion[] = Object.values(meta.versions)
      .map((v) => {
        const pl = byVersion.get(v.version);
        // Sibling packages (.r4/.r4b/.r5) share the base package's canonical and package-list.json,
        // so their FHIR version comes from the name, not the list.
        const suffix = /\.(r4b?|r5)$/.exec(name)?.[1];
        const fhir = suffix ? suffix.toUpperCase() : (pl?.fhirversion ?? v.fhirVersion);
        const status = pl?.status;
        return {
          version: v.version,
          fhir: fhir ? fhir.split(/[,;]\s*/).map(normalizeFhirVersion) : [],
          date: pl?.date,
          status,
          sequence: pl?.sequence,
          path: pl?.path,
          prerelease:
            isPrerelease(v.version) ||
            ['ballot', 'draft', 'ci-build', 'preview', 'qa-preview'].includes(status ?? ''),
        };
      })
      .sort((a, b) => compareVersions(b.version, a.version));
    packages[name] = {
      name,
      title: ig?.name,
      description: ig?.description?.replace(/\s+/g, ' ').slice(0, 400),
      canonical,
      history: ig?.history,
      ciBuild: ig?.['ci-build'],
      versions,
      // A release only: some publishers mark a ballot or withdrawal build current.
      current: list.find((e) => e.current && !isPrerelease(e.version) && meta.versions[e.version])
        ?.version,
      packageList: list.length > 0,
      inRegistry: true,
    };
    return packages[name];
  }

  // 1. Every catalog guide, KB rule IG and curated extra.
  const names = new Set<string>([
    ...kb.catalog.map((g) => g.npm),
    ...kb.drivers.flatMap((d) => d.rules.map((r) => r.ig)),
    ...Object.keys(kb.igs),
  ]);
  // National foundations, and their R4 siblings in case a base is published R5-first.
  const realmIgs = kb.realms.flatMap((r) => r.packages.map((p) => p.ig));
  for (const ig of realmIgs) names.add(ig).add(`${ig}.r4`);
  // Universal-realm guides that only publish R4B/R5 often ship an R4 sibling package (".r4").
  for (const g of kb.catalog) if (!g.fhir.some(isR4)) names.add(`${g.npm}.r4`);
  await pool([...names], 8, registerPackage);
  log(`registry metadata: ${Object.keys(packages).length} packages`);

  // 2. Roots: KB-named versions (deep) and the newest R4 release of each catalog guide.
  const deep = new Set<string>();
  const roots = new Set<string>();
  for (const d of kb.drivers)
    for (const r of d.rules)
      for (const w of r.versions) {
        const key = `${r.ig}@${w.version}`;
        deep.add(key);
        roots.add(key);
      }
  for (const g of kb.catalog) {
    const pick = latestR4(packages[g.npm]) ?? latestR4(packages[`${g.npm}.r4`]);
    if (pick) roots.add(pick);
  }
  // A realm's foundation is pinned to its newest R4 release, so read that one deeply.
  for (const ig of realmIgs) {
    const pick = latestR4(packages[ig]) ?? latestR4(packages[`${ig}.r4`]);
    if (pick) {
      deep.add(pick);
      roots.add(pick);
    }
  }

  // 3. Dependency closure, reading each package's own manifest.
  const manifests: Record<string, PackageSnapshot> = {};
  const deepData = new Map<string, Pick<PackageSnapshot, 'profiles' | 'capstmts'>>();
  const queue = [...roots];
  const seen = new Set<string>();
  while (queue.length) {
    const batch = queue.splice(0).filter((k) => !seen.has(k));
    batch.forEach((k) => seen.add(k));
    await pool(batch, 6, async (key) => {
      const at = key.lastIndexOf('@');
      const name = key.slice(0, at);
      const version = key.slice(at + 1);
      const tgz = await getTarball(name, version);
      if (!tgz) {
        log(`  ! no tarball for ${key}`);
        return;
      }
      const wantDeep = deep.has(key);
      const entries = readTgz(
        tgz,
        (p) =>
          p === 'package.json' ||
          /^CapabilityStatement-[^/]+\.json$/.test(p) ||
          (wantDeep && /^StructureDefinition-[^/]+\.json$/.test(p)),
      );
      const pkgJson = entries.find((e) => e.path === 'package.json');
      if (!pkgJson) {
        log(`  ! no package.json in ${key}`);
        return;
      }
      const manifest = JSON.parse(pkgJson.data.toString('utf8').replace(/^﻿/, ''));
      if (manifest.canonical && !canonicals.has(name)) canonicals.set(name, manifest.canonical);
      const deps: Dependency[] = [];
      for (const [depKey, raw] of Object.entries<string>(manifest.dependencies ?? {})) {
        const m = /^npm:(.+)@([^@]+)$/.exec(raw);
        const depName = m ? m[1] : depKey;
        let depVersion = m ? m[2] : raw;
        const reg = await registerPackage(depName);
        if (reg && (depVersion.includes('x') || depVersion === 'latest')) {
          const hit = reg.versions.find(
            (v) =>
              !v.prerelease && (depVersion === 'latest' || matchesWildcard(depVersion, v.version)),
          );
          if (hit) depVersion = hit.version;
        }
        deps.push({
          key: depKey,
          name: depName,
          version: depVersion,
          alias: !!m || depKey !== depName,
        });
        const depId = `${depName}@${depVersion}`;
        if (!seen.has(depId) && /^\d/.test(depVersion)) queue.push(depId);
      }
      const fhirVersions: string[] = (
        manifest.fhirVersions ??
        manifest['fhir-version-list'] ??
        []
      ).map(normalizeFhirVersion);
      manifests[key] = {
        name,
        version,
        canonical: manifest.canonical,
        fhirVersions,
        dependencies: deps,
      };

      const capstmts = entries
        .filter((e) => e.path.startsWith('CapabilityStatement-'))
        .map((e) => summarizeCapStmt(JSON.parse(e.data.toString('utf8').replace(/^﻿/, ''))));
      const profiles = wantDeep
        ? entries
            .filter((e) => e.path.startsWith('StructureDefinition-'))
            .map((e) =>
              summarizeStructureDefinition(JSON.parse(e.data.toString('utf8').replace(/^﻿/, ''))),
            )
            .filter((p) => p !== null)
            .sort((a, b) => a.id.localeCompare(b.id))
        : undefined;
      if (capstmts.length || profiles?.length) deepData.set(key, { capstmts, profiles });
    });
  }
  log(`manifests: ${Object.keys(manifests).length} (deep: ${deepData.size})`);

  // Packages first seen as dependencies may have gained a canonical from their manifest; retry
  // package-list.json for them so their links point at version-specific pages.
  for (const [name, canonical] of canonicals) {
    const p = packages[name];
    if (p && !p.canonical) {
      delete packages[name];
      await registerPackage(name);
      packages[name].canonical = canonical;
    }
  }

  // Catalog guides that never reached packages.fhir.org still get an entry (from the IG registry)
  // so the UI can link to them and say why they can't be pinned.
  for (const g of kb.catalog) {
    if (packages[g.npm]) continue;
    const ig = igByNpm.get(g.npm);
    packages[g.npm] = {
      name: g.npm,
      title: ig?.name ?? g.name,
      description: ig?.description?.replace(/\s+/g, ' ').slice(0, 400),
      canonical: ig?.canonical,
      history: ig?.history,
      ciBuild: ig?.['ci-build'],
      versions: (ig?.editions ?? []).map((e) => ({
        version: e['ig-version'],
        fhir: (e['fhir-version'] ?? []).map(normalizeFhirVersion),
        path: e.url,
        prerelease: isPrerelease(e['ig-version']),
      })),
      packageList: false,
      inRegistry: false,
    };
  }

  // 4. Write.
  const snapshot: RegistrySnapshot = {
    generated: new Date().toISOString(),
    packages: sortKeys(packages),
    manifests: sortKeys(manifests),
  };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'registry.json'), JSON.stringify(snapshot, null, 1) + '\n');
  const pkgDir = join(OUT, 'packages');
  rmSync(pkgDir, { recursive: true, force: true });
  mkdirSync(pkgDir, { recursive: true });
  for (const [key, d] of deepData) {
    const m = manifests[key];
    writeFileSync(join(pkgDir, `${key}.json`), JSON.stringify({ ...m, ...d }) + '\n');
  }
  log(`wrote snapshot/registry.json and ${readdirSync(pkgDir).length} package files`);
}

function latestR4(p: RegistryPackage | undefined): string | null {
  if (!p) return null;
  const v = p.versions.find((x) => !x.prerelease && x.fhir.some(isR4));
  return v ? `${p.name}@${v.version}` : null;
}

function sortKeys<T>(o: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
