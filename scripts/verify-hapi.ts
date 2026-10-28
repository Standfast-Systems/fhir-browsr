// Proof-of-done check: does a HAPI server booted with Initializr's application.yaml actually carry
// the scope? Compares the server against the manifest it was generated from.
//
//   node scripts/verify-hapi.ts --base http://localhost:8090/fhir --manifest proof/onc-g10/initializr.json
//
// Checks: FHIR version; every profile on the server-side surface is a StructureDefinition on the
// server; every SHALL resource and SHALL search parameter appears in the server's own
// CapabilityStatement. Writes hapi-verification.md next to the manifest.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import type { Manifest } from '../src/core/initializr/types.ts';
import { pool } from './lib/net.ts';

const { values } = parseArgs({
  options: { base: { type: 'string' }, manifest: { type: 'string' } },
});
if (!values.base || !values.manifest) {
  console.error(
    'usage: node scripts/verify-hapi.ts --base <fhir base> --manifest <initializr.json>',
  );
  process.exit(2);
}
const base = values.base.replace(/\/$/, '');
const manifest = JSON.parse(readFileSync(values.manifest, 'utf8')) as Manifest;

async function get(path: string): Promise<any> {
  const res = await fetch(`${base}${path}`, {
    headers: { accept: 'application/fhir+json' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

const meta = await get('/metadata');
const lines: string[] = [];
const out = (s = '') => {
  lines.push(s);
  console.log(s);
};
out(`# HAPI verification: ${manifest.profile.projectName ?? 'scope'}`);
out();
out(
  `- Server: ${base} — ${meta.software?.name ?? 'unknown'} ${meta.software?.version ?? ''}, FHIR ${meta.fhirVersion}`,
);
out(
  `- Manifest: target ${manifest.profile.asOf}, KB as of ${manifest.kbAsOf}, generated ${manifest.generated}`,
);
out(
  `- IGs loaded by application.yaml: ${manifest.igs
    .filter((i) => i.pin)
    .map((i) => `${i.package}@${i.pin}`)
    .join(', ')}`,
);
out();

let failures = 0;
const fhirOk = meta.fhirVersion === '4.0.1';
if (!fhirOk) failures++;
out(`## FHIR version: ${fhirOk ? 'OK' : 'MISMATCH'} (${meta.fhirVersion})`);
out();

// Profiles
const server = manifest.surface.find((s) => s.actor === 'server');
const profiles = [
  ...new Set((server?.resources ?? []).flatMap((r) => r.profiles.map((p) => p.url))),
];
const missing: string[] = [];
await pool(profiles, 6, async (url) => {
  const b = await get(`/StructureDefinition?url=${encodeURIComponent(url)}&_summary=count`);
  if (!b.total) missing.push(url);
});
failures += missing.length;
out(
  `## Profiles on the server-side surface: ${profiles.length - missing.length}/${profiles.length} present as StructureDefinitions`,
);
for (const m of missing.sort()) out(`- missing: ${m}`);
out();

// Search surface vs the server's own CapabilityStatement
const rest = (meta.rest ?? []).find((r: any) => r.mode === 'server') ?? {};
const offered = new Map<string, Set<string>>();
for (const r of rest.resource ?? [])
  offered.set(r.type, new Set((r.searchParam ?? []).map((p: any) => p.name)));
let shallResources = 0;
let shallParams = 0;
const gaps: string[] = [];
for (const r of server?.resources ?? []) {
  if (r.level !== 'SHALL') continue;
  shallResources++;
  const params = offered.get(r.type);
  if (!params) {
    gaps.push(`${r.type}: resource not offered`);
    continue;
  }
  for (const p of r.searchParams.filter((x) => x.level === 'SHALL')) {
    shallParams++;
    if (!params.has(p.name) && !p.name.startsWith('_')) gaps.push(`${r.type}?${p.name}`);
  }
}
failures += gaps.length;
out(
  `## SHALL search surface in the server's CapabilityStatement: ${shallResources} resources, ${shallParams} search parameters, ${gaps.length} gap(s)`,
);
for (const g of gaps) out(`- gap: ${g}`);
out();
out(
  failures
    ? `**Result: ${failures} problem(s).**`
    : '**Result: clean IG load; the expected server surface is present.**',
);

writeFileSync(join(dirname(values.manifest), 'hapi-verification.md'), lines.join('\n') + '\n');
process.exitCode = failures ? 1 : 0;
