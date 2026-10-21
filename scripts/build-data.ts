// Joins data/ig-map.yaml (party tags), data/notes.yaml (plain one-liners) and snapshot/registry.json
// (releases from each guide's package-list.json) into public/data/guides.json for the browser.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';
import { DEFAULT_SCOPE, REGIONS, applyScope, countByRegion } from '../src/core/scope.ts';
import type {
  Bucket,
  Dataset,
  Family,
  Fhir,
  Guide,
  Party,
  Release,
  Use,
} from '../src/core/types.ts';

interface MapGuide {
  npm: string;
  name: string;
  realm: string;
  group: string;
  parties?: string[];
}
interface Note {
  name?: string;
  blurb?: string;
  start?: boolean | number;
  /** Universal-realm guide meant strictly for outside the US. */
  intl?: boolean;
}
interface SnapVersion {
  version: string;
  fhir: string[];
  date?: string;
  status?: string;
  sequence?: string;
  path?: string;
}
interface SnapPackage {
  title?: string;
  description?: string;
  canonical?: string;
  packageList: boolean;
  versions: SnapVersion[];
}

const map = parse(readFileSync('data/ig-map.yaml', 'utf8')) as {
  groups: Record<string, { layer: string; label: string }>;
  guides: MapGuide[];
};
const notes = (parse(readFileSync('data/notes.yaml', 'utf8')) ?? {}) as Record<string, Note>;
const familyDefs = parse(readFileSync('data/families.yaml', 'utf8')) as (Family & {
  members?: string[];
  prefixes?: string[];
})[];
const bucketDefs = parse(readFileSync('data/buckets.yaml', 'utf8')) as (Bucket & {
  groups: string[];
})[];
const snap = JSON.parse(readFileSync('snapshot/registry.json', 'utf8')) as {
  generated: string;
  packages: Record<string, SnapPackage>;
};

// HL7 International, IHE, US federal agencies (ONC/ASTP, CDC, HRSA) and WHO.
const KNOWN =
  /^(hl7\.|ihe\.|who\.|smart\.who\.int\.|gov\.cdc\.|fhir\.cdc\.|fhir\.onc\.|fhir\.astp\.|fhir\.hrsa\.)/;
// WHO SMART Guidelines serve national programs outside the US.
const WHO = /^(who\.|smart\.who\.int\.)/;
function useOf(g: MapGuide, note: Note): Use {
  if (g.realm === 'us') return 'us';
  return note.intl || WHO.test(g.npm) ? 'intl' : 'generic';
}

const PARTY: Record<string, Party> = { Patient: 'patient', Provider: 'provider', Payer: 'payer' };

function fhirOf(v: string): Fhir {
  if (/^4\.0\./.test(v)) return 'R4';
  if (/^4\.3\./.test(v)) return 'R4B';
  if (/^5\.0\./.test(v)) return 'R5';
  if (/^6\./.test(v)) return 'R6';
  if (/^3\.0\./.test(v)) return 'R3';
  if (/^1\.0\./.test(v)) return 'R2';
  return 'other';
}

function semverDesc(a: string, b: string): number {
  const parse = (v: string) => {
    const [core, pre] = v.split('-', 2);
    return { nums: core.split('.').map((n) => parseInt(n, 10) || 0), pre };
  };
  const x = parse(a);
  const y = parse(b);
  for (let i = 0; i < Math.max(x.nums.length, y.nums.length); i++) {
    const d = (y.nums[i] ?? 0) - (x.nums[i] ?? 0);
    if (d) return d;
  }
  if (x.pre && !y.pre) return 1;
  if (!x.pre && y.pre) return -1;
  return (y.pre ?? '').localeCompare(x.pre ?? '');
}

function label(v: SnapVersion): string {
  // Only published pages live under /STUn; ballots carry the STU they're heading for in `sequence`.
  const stu = /\/STU(\d+(?:\.\d+)*)\/?$/i.exec(v.path ?? '')?.[1];
  return stu ? `STU ${stu}` : `v${v.version}`;
}

function cleanName(n: string): string {
  return n
    .replace(/�/g, '')
    .replace(/\bDavinci\b/g, 'Da Vinci')
    .replace(/,?\s*(Release \d+.*|STU\s*\d.*)$/i, '')
    .replace(/\s+(FHIR\s+)?(Implementation Guide|IG)(:.*)?$/i, '')
    .trim();
}

function fallbackBlurb(p: SnapPackage, name: string, groupLabel: string): string {
  const d = (p.description ?? '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(\w+) \1\b/gi, '$1') // "The The MedMorph"
    .trim();
  const first = d.split(/(?<=[.!?])\s+(?=[A-Z])/)[0] ?? '';
  if (first.length < 25 || first.toLowerCase().startsWith(name.toLowerCase().slice(0, 20))) {
    return `${groupLabel}.`;
  }
  if (first.length <= 180) return first.replace(/([^.!?])$/, '$1.');
  return first.slice(0, 177).replace(/\s+\S*$/, '') + '…';
}

const errors: string[] = [];
const guides: Guide[] = [];
const ids = new Set(map.guides.map((g) => g.npm));
for (const id of Object.keys(notes))
  if (!ids.has(id)) errors.push(`notes.yaml: ${id} is not in ig-map.yaml`);

// Each visible ig-map group sits in exactly one bucket.
const bucketOf = new Map<string, string>();
for (const b of bucketDefs) {
  for (const g of b.groups) {
    if (!map.groups[g]) errors.push(`buckets.yaml: ${b.id} lists unknown group ${g}`);
    if (bucketOf.has(g))
      errors.push(`buckets.yaml: group ${g} is in ${bucketOf.get(g)} and ${b.id}`);
    bucketOf.set(g, b.id);
  }
}
for (const [g, def] of Object.entries(map.groups)) {
  if (def.layer !== 'hidden' && !bucketOf.has(g))
    errors.push(`buckets.yaml: group ${g} has no bucket`);
}

// A guide belongs to at most one family; members keep their listed order.
const familyOf = new Map<string, { id: string; rank: number }>();
const join = (id: string, family: string, rank: number) => {
  if (familyOf.has(id))
    errors.push(`families.yaml: ${id} is in ${familyOf.get(id)!.id} and ${family}`);
  familyOf.set(id, { id: family, rank });
};
for (const f of familyDefs) {
  (f.members ?? []).forEach((id, i) => {
    if (!ids.has(id))
      errors.push(`families.yaml: ${f.id} lists ${id}, which is not in ig-map.yaml`);
    join(id, f.id, i + 1);
  });
  for (const p of f.prefixes ?? []) for (const id of ids) if (id.startsWith(p)) join(id, f.id, 0);
}

for (const g of map.guides) {
  const group = map.groups[g.group];
  if (!group) {
    errors.push(`ig-map.yaml: ${g.npm} has unknown group ${g.group}`);
    continue;
  }
  if (group.layer === 'hidden') continue; // legacy, non-FHIR, tooling, unofficial, withdrawn
  const p = snap.packages[g.npm];
  if (!p) {
    errors.push(`snapshot: ${g.npm} missing (run npm run sync-snapshot)`);
    continue;
  }
  const note = notes[g.npm] ?? {};
  const parties = (g.parties ?? []).map((x) => PARTY[x]).filter(Boolean);
  const releases: Release[] = p.versions
    .map((v) => ({
      version: v.version,
      status: v.status ?? (p.packageList ? 'unlisted' : null),
      fhir: [...new Set(v.fhir.flatMap((f) => f.split('|')).map(fhirOf))],
      date: v.date,
      url: v.path ?? p.canonical ?? `https://packages.fhir.org/${g.npm}`,
      label: label(v),
    }))
    .sort((a, b) => semverDesc(a.version, b.version));
  const name = note.name ?? cleanName(g.name);
  guides.push({
    id: g.npm,
    name,
    use: useOf(g, note),
    group: group.label,
    bucket: bucketOf.get(g.group) ?? '',
    family: familyOf.get(g.npm)?.id ?? null,
    familyRank: familyOf.get(g.npm)?.rank ?? 0,
    parties,
    blurb: note.blurb ?? fallbackBlurb(p, name, group.label),
    curated: Boolean(note.blurb),
    start: typeof note.start === 'number' ? note.start : note.start ? 50 : 0,
    knownPublisher: KNOWN.test(g.npm),
    withdrawn: releases.some((r) => r.status === 'withdrawn'),
    releases,
  });
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const out: Dataset = {
  generated: new Date().toISOString(),
  snapshot: snap.generated,
  families: familyDefs.map(({ id, label, blurb }) => ({ id, label, blurb })),
  buckets: bucketDefs.map(({ id, label }) => ({ id, label })),
  guides,
};
mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/guides.json', JSON.stringify(out));

console.log(`guides.json: ${guides.length} guides`);
for (const c of ['us', 'intl'] as const) {
  const scoped = applyScope(guides, DEFAULT_SCOPE, c);
  const counts = countByRegion(scoped);
  const curated = scoped.filter((g) => g.curated).length;
  console.log(
    `  ${c}: ${scoped.length} in default scope (${curated} with hand-written one-liners)`,
  );
  console.log('    ' + REGIONS.map((r) => `${r.label} ${counts[r.key]}`).join(' · '));
}
