#!/usr/bin/env node
// FHIR Initializr CLI. Same core as the web app; reads the KB YAML and the committed registry snapshot.
//
//   node cli/initializr.ts scope --role payer --driver cms-0057-f --as-of 2027-01-01
//   node cli/initializr.ts scope --role ehr-developer --driver onc-g10 --out ./scope
//   node cli/initializr.ts drivers
//   node cli/initializr.ts validate

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';
import { parseArgs } from 'node:util';
import {
  DEFAULT_AS_OF,
  EMITTERS,
  defaultProfile,
  deepKeysFor,
  emitterById,
  resolve,
  validateKb,
} from '../src/core/index.ts';
import type {
  Actor,
  PackageSnapshot,
  ProjectProfile,
  RegistrySnapshot,
  Role,
} from '../src/core/index.ts';
import { loadKb, ROOT } from '../scripts/lib/kb-load.ts';

const HELP = `FHIR Initializr — which FHIR IGs and versions your project needs, with citations.

Usage:
  initializr scope [options]       Resolve a scope manifest
  initializr drivers               List drivers and their components
  initializr realms                List countries and their national foundation IGs
  initializr validate              Check the knowledge base

Scope options:
  --realm <code>         us (default), a country code from "initializr realms", or intl
  --role <role>          ehr-developer | payer | provider-org | app-developer | hie
  --driver <id[:c1+c2]>  Driver, optionally limited to components (repeatable)
  --as-of <yyyy-mm-dd>   Target date (default ${DEFAULT_AS_OF})
  --actor <a>            server | client (repeatable; default from role)
  --extra <package>      Add a catalog guide by package id (repeatable)
  --implemented <p@v>    A version you already implement (repeatable)
  --name <text>          Project name for generated files
  --format <id>          ${EMITTERS.map((e) => e.id).join(' | ')} (default report)
  --out <dir>            Write every output file into <dir>
  --now <iso>            Fixed timestamp for reproducible output
`;

function loadRegistry(): RegistrySnapshot {
  const reg = JSON.parse(
    readFileSync(join(ROOT, 'snapshot', 'registry.json'), 'utf8'),
  ) as RegistrySnapshot;
  const dead = join(ROOT, 'snapshot', 'dead-links.json');
  if (existsSync(dead)) reg.deadLinks = JSON.parse(readFileSync(dead, 'utf8'));
  return reg;
}

function loadDeep(keys: string[]): Map<string, PackageSnapshot> {
  const deep = new Map<string, PackageSnapshot>();
  for (const key of keys) {
    const f = join(ROOT, 'snapshot', 'packages', `${key}.json`);
    if (existsSync(f)) deep.set(key, JSON.parse(readFileSync(f, 'utf8')));
  }
  return deep;
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { values } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      realm: { type: 'string' },
      role: { type: 'string' },
      driver: { type: 'string', multiple: true },
      'as-of': { type: 'string' },
      actor: { type: 'string', multiple: true },
      extra: { type: 'string', multiple: true },
      implemented: { type: 'string', multiple: true },
      name: { type: 'string' },
      format: { type: 'string' },
      out: { type: 'string' },
      now: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (!cmd || values.help || cmd === 'help') {
    process.stdout.write(HELP);
    return;
  }
  const kb = loadKb();

  if (cmd === 'realms') {
    for (const r of [...kb.realms].sort((a, b) => a.id.localeCompare(b.id)))
      console.log(
        `${r.id.padEnd(5)} ${r.name.padEnd(36)} ${r.packages.length ? r.packages.map((p) => `${p.ig} (${p.kind})`).join(', ') : 'no national base: IPA + IPS'}`,
      );
    return;
  }

  if (cmd === 'drivers') {
    for (const d of kb.drivers) {
      console.log(
        `${d.id}  —  ${d.name}  [${d.kind}; roles: ${d.roles.join(', ')}; realms: ${(d.realms ?? ['any']).join(', ')}]`,
      );
      for (const c of d.components)
        console.log(
          `    ${d.id}:${c.id}  ${c.name}${c.in_force.from ? `  (from ${c.in_force.from})` : ''}${c.default === false ? '  [opt-in]' : ''}`,
        );
    }
    return;
  }

  if (cmd === 'validate') {
    const findings = validateKb(kb, loadRegistry());
    for (const f of findings) console.log(`${f.level.toUpperCase()} ${f.where}: ${f.message}`);
    console.log(findings.length ? `${findings.length} finding(s)` : 'KB is valid.');
    process.exitCode = findings.some((f) => f.level === 'error') ? 1 : 0;
    return;
  }

  if (cmd !== 'scope') {
    console.error(`Unknown command "${cmd}".\n`);
    process.stdout.write(HELP);
    process.exitCode = 2;
    return;
  }

  const role = (values.role ?? 'ehr-developer') as Role;
  if (!kb.roles.some((r) => r.id === role))
    throw new Error(`Unknown role "${role}". Roles: ${kb.roles.map((r) => r.id).join(', ')}`);
  const profile: ProjectProfile = defaultProfile(kb, role);
  if (values.realm) {
    if (!kb.realms.some((r) => r.id === values.realm))
      throw new Error(`Unknown realm "${values.realm}". Run "initializr realms".`);
    profile.realm = values.realm;
  }
  profile.drivers = (values.driver ?? []).map((s) => {
    const [id, comps] = s.split(':');
    if (!kb.drivers.some((d) => d.id === id))
      throw new Error(`Unknown driver "${id}". Run "initializr drivers".`);
    return comps ? { id, components: comps.split(/[+,]/) } : { id };
  });
  if (values['as-of']) profile.asOf = values['as-of'];
  if (values.actor?.length) profile.actors = values.actor as Actor[];
  profile.extras = values.extra ?? [];
  profile.implemented = Object.fromEntries(
    (values.implemented ?? []).map((s) => [
      s.slice(0, s.lastIndexOf('@')),
      s.slice(s.lastIndexOf('@') + 1),
    ]),
  );
  if (values.name) profile.projectName = values.name;

  const reg = loadRegistry();
  const first = resolve(kb, reg, profile, { now: values.now });
  const manifest = resolve(kb, reg, profile, {
    now: values.now,
    deep: loadDeep(deepKeysFor(first)),
  });

  if (values.out) {
    const dir = resolvePath(values.out);
    mkdirSync(dir, { recursive: true });
    for (const e of EMITTERS) writeFileSync(join(dir, e.filename), e.emit(manifest, reg));
    const errs = manifest.warnings.filter((w) => w.severity === 'error').length;
    console.log(
      `Wrote ${EMITTERS.length} files to ${dir} — ${manifest.igs.length} IGs, ${manifest.warnings.length} warnings (${errs} errors).`,
    );
    return;
  }
  const emitter = emitterById(values.format ?? 'report');
  if (!emitter)
    throw new Error(
      `Unknown format "${values.format}". Formats: ${EMITTERS.map((e) => e.id).join(', ')}`,
    );
  process.stdout.write(emitter.emit(manifest, reg));
}

try {
  main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
}
