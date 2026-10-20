// Summarise what changed between two registry snapshots, for the scheduled refresh PR.
//
//   node scripts/registry-diff.ts <old registry.json> <new registry.json> [out.md]
//
// New releases of IGs the KB cites come first: a curator must decide whether a regulation,
// SVAP list or agency page now accepts them. Catalog-only changes follow.

import { readFileSync, writeFileSync } from 'node:fs';
import type { RegistrySnapshot } from '../src/core/types.ts';
import { loadKb } from './lib/kb-load.ts';

const [oldPath, newPath, outPath] = process.argv.slice(2);
if (!oldPath || !newPath) {
  console.error('usage: node scripts/registry-diff.ts <old> <new> [out.md]');
  process.exit(2);
}
const before = JSON.parse(readFileSync(oldPath, 'utf8')) as RegistrySnapshot;
const after = JSON.parse(readFileSync(newPath, 'utf8')) as RegistrySnapshot;
const kb = loadKb();
const kbIgs = new Set(kb.drivers.flatMap((d) => d.rules.map((r) => r.ig)));
const catalog = new Set(kb.catalog.map((g) => g.npm));

const added: { name: string; versions: string[]; kb: boolean }[] = [];
for (const [name, pkg] of Object.entries(after.packages)) {
  if (!kbIgs.has(name) && !catalog.has(name)) continue;
  const had = new Set(before.packages[name]?.versions.map((v) => v.version) ?? []);
  const fresh = pkg.versions
    .filter((v) => !had.has(v.version))
    .map((v) => `${v.version}${v.prerelease ? ` (${v.status ?? 'pre-release'})` : ''}`);
  if (fresh.length) added.push({ name, versions: fresh, kb: kbIgs.has(name) });
}
added.sort((a, b) => Number(b.kb) - Number(a.kb) || a.name.localeCompare(b.name));

const lines = [`## Registry changes since ${before.generated.slice(0, 10)}`, ''];
const cited = added.filter((a) => a.kb);
const other = added.filter((a) => !a.kb);
if (!added.length) lines.push('No new versions of catalog or KB guides.');
if (cited.length) {
  lines.push('### Guides the KB cites (curator decision needed)', '');
  lines.push(
    'Check whether the regulation, SVAP list or agency page now accepts these, and add version windows with citations if so.',
    '',
  );
  for (const a of cited) lines.push(`- \`${a.name}\`: ${a.versions.join(', ')}`);
  lines.push('');
}
if (other.length) {
  lines.push('### Other catalog guides', '');
  for (const a of other) lines.push(`- \`${a.name}\`: ${a.versions.join(', ')}`);
  lines.push('');
}
const ageDays = Math.floor((Date.now() - Date.parse(kb.kbAsOf)) / 86_400_000);
lines.push(
  `KB as of ${kb.kbAsOf} (${ageDays} days ago).${ageDays > 100 ? ' **Quarterly KB review is overdue.**' : ''}`,
);
const md = lines.join('\n') + '\n';
if (outPath) writeFileSync(outPath, md);
process.stdout.write(md);
