// Check every link Initializr can show: KB citations, IG version pages, CapabilityStatement pages
// and Inferno kits. Failures go to snapshot/dead-links.json, which the resolver turns into
// "dead-link" notes on the manifest.
//
//   node scripts/check-links.ts
//
// eCFR and the Federal Register refuse automated requests, so their links are listed as
// "not checkable" rather than reported dead.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PackageSnapshot, RegistrySnapshot } from '../src/core/initializr/types.ts';
import { loadKb, ROOT } from './lib/kb-load.ts';
import { checkLink, pool } from './lib/net.ts';

const UNCHECKABLE = [
  'www.ecfr.gov',
  'ecfr.gov',
  'www.federalregister.gov',
  'federalregister.gov',
  'chat.fhir.org',
];

const kb = loadKb();
const reg = JSON.parse(
  readFileSync(join(ROOT, 'snapshot', 'registry.json'), 'utf8'),
) as RegistrySnapshot;
const urls = new Map<string, string>(); // url -> where it came from

const add = (url: string | undefined, where: string) => {
  if (!url || !/^https?:/.test(url)) return;
  const bare = url.split('#')[0];
  if (!urls.has(bare)) urls.set(bare, where);
};

for (const s of Object.values(kb.sources)) add(s.url, `source ${s.id}`);
for (const d of kb.drivers) {
  add(d.cite.url, `driver ${d.id}`);
  for (const c of d.components) add(c.cite.url, `driver ${d.id} component ${c.id}`);
  for (const r of d.rules) {
    add(r.cite.url, `rule ${r.id}`);
    for (const w of r.versions) add(w.cite.url, `rule ${r.id} v${w.version}`);
  }
}
for (const k of kb.testkits) {
  add(k.url, `testkit ${k.id}`);
  add(k.repo, `testkit ${k.id} repo`);
}
// Version home pages for every version a manifest could pin, and CapabilityStatement pages for deep packages.
const pinnable = new Set<string>([
  ...kb.drivers.flatMap((d) =>
    d.rules.flatMap((r) => r.versions.map((w) => `${r.ig}@${w.version}`)),
  ),
  ...Object.keys(reg.manifests),
]);
for (const key of pinnable) {
  const at = key.lastIndexOf('@');
  const name = key.slice(0, at);
  const version = key.slice(at + 1);
  const v = reg.packages[name]?.versions.find((x) => x.version === version);
  if (v?.path) add(`${v.path.replace(/\/$/, '')}/`, `${key} home`);
}
for (const f of readdirSync(join(ROOT, 'snapshot', 'packages'))) {
  const snap = JSON.parse(
    readFileSync(join(ROOT, 'snapshot', 'packages', f), 'utf8'),
  ) as PackageSnapshot;
  const path = reg.packages[snap.name]?.versions
    .find((x) => x.version === snap.version)
    ?.path?.replace(/\/$/, '');
  if (path)
    for (const cs of snap.capstmts ?? [])
      add(`${path}/CapabilityStatement-${cs.id}.html`, `${snap.name}@${snap.version} capstmt`);
}

const all = [...urls.keys()];
const checkable = all.filter((u) => !UNCHECKABLE.includes(new URL(u).hostname));
console.log(
  `[links] ${all.length} unique links; checking ${checkable.length} (${all.length - checkable.length} on hosts that block automated checks)`,
);

const dead: Record<string, string> = {};
await pool(checkable, 8, async (u) => {
  const status = await checkLink(u);
  if (typeof status !== 'number' || status >= 400) dead[u] = String(status);
});

const sorted = Object.fromEntries(Object.entries(dead).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(join(ROOT, 'snapshot', 'dead-links.json'), JSON.stringify(sorted, null, 1) + '\n');
for (const [u, s] of Object.entries(sorted))
  console.log(`[links] DEAD ${s}  ${u}  (${urls.get(u)})`);
console.log(
  `[links] ${Object.keys(sorted).length} dead link(s) written to snapshot/dead-links.json`,
);
