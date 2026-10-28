// Compile the KB and registry snapshot into the static JSON the site (and any other client) reads.
//
//   node scripts/build-data.ts
//
// Output (public/data/, served as-is):
//   index.json     what's here and how fresh it is
//   kb.json        the compiled knowledge base
//   registry.json  package versions, paths and dependency manifests
//   pkg/<name>@<version>.json  profiles and CapabilityStatement surface, loaded on demand
//
// Fails on KB validation errors so a bad citation never ships.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { validateKb } from '../src/core/validate.ts';
import type { RegistrySnapshot } from '../src/core/types.ts';
import { loadKb, ROOT } from './lib/kb-load.ts';

const OUT = join(ROOT, 'public', 'data');
const kb = loadKb();
const regPath = join(ROOT, 'snapshot', 'registry.json');
if (!existsSync(regPath)) {
  console.error('snapshot/registry.json is missing; run `npm run snapshot` first.');
  process.exit(1);
}
const reg = JSON.parse(readFileSync(regPath, 'utf8')) as RegistrySnapshot;
const deadPath = join(ROOT, 'snapshot', 'dead-links.json');
if (existsSync(deadPath)) reg.deadLinks = JSON.parse(readFileSync(deadPath, 'utf8'));

const findings = validateKb(kb, reg);
for (const f of findings) console.log(`[kb] ${f.level.toUpperCase()} ${f.where}: ${f.message}`);
const errors = findings.filter((f) => f.level === 'error');
if (errors.length) {
  console.error(`[kb] ${errors.length} error(s); not writing data.`);
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'pkg'), { recursive: true });
writeFileSync(join(OUT, 'kb.json'), JSON.stringify(kb));
const pkgSrc = join(ROOT, 'snapshot', 'packages');
const files = readdirSync(pkgSrc).filter((f) => f.endsWith('.json'));
reg.deepKeys = files.map((f) => f.slice(0, -5));
writeFileSync(join(OUT, 'registry.json'), JSON.stringify(reg));
cpSync(pkgSrc, join(OUT, 'pkg'), { recursive: true });
writeFileSync(
  join(OUT, 'index.json'),
  JSON.stringify(
    {
      kbVersion: kb.kbVersion,
      kbAsOf: kb.kbAsOf,
      snapshotAsOf: reg.generated,
      drivers: kb.drivers.map((d) => ({
        id: d.id,
        name: d.name,
        components: d.components.map((c) => c.id),
      })),
      files: { kb: 'kb.json', registry: 'registry.json', packages: files.map((f) => `pkg/${f}`) },
    },
    null,
    1,
  ),
);
console.log(
  `[data] wrote public/data: kb (${kb.drivers.length} drivers, ${kb.catalog.length} catalog guides), registry (${Object.keys(reg.packages).length} packages), ${files.length} package files`,
);
