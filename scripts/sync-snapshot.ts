// Copies the guides Matchbook needs out of FHIR Initializr's registry snapshot, which already
// merges packages.fhir.org with each guide's package-list.json (status, date, FHIR version, path).
//
//   node scripts/sync-snapshot.ts [path/to/fhir-initializr/snapshot/registry.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';

const src = process.argv[2] ?? '../fhir-initializr/snapshot/registry.json';
const reg = JSON.parse(readFileSync(src, 'utf8'));
const map = parse(readFileSync('data/ig-map.yaml', 'utf8')) as { guides: { npm: string }[] };

const packages: Record<string, unknown> = {};
const missing: string[] = [];
for (const { npm } of map.guides) {
  const p = reg.packages[npm];
  if (!p) {
    missing.push(npm);
    continue;
  }
  packages[npm] = {
    title: p.title,
    description: p.description,
    canonical: p.canonical,
    packageList: p.packageList,
    versions: p.versions.map((v: Record<string, unknown>) => ({
      version: v['version'],
      fhir: v['fhir'],
      date: v['date'],
      status: v['status'],
      sequence: v['sequence'],
      path: v['path'],
    })),
  };
}

writeFileSync(
  'snapshot/registry.json',
  JSON.stringify({ generated: reg.generated, source: 'fhir-initializr', packages }, null, 1) + '\n',
);
console.log(
  `snapshot: ${Object.keys(packages).length} guides from ${src} (generated ${reg.generated})`,
);
if (missing.length) console.warn(`not in source snapshot: ${missing.join(', ')}`);
