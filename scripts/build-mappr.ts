// Compiles FHIR Mappr's patterns (data/mappr/patterns/*.yaml) with the guides and resources they
// name into public/data/mappr.json. Runs after Browsr's build: guide names, one-liners, links and
// releases come from public/data/guides.json, and the resource sentences from Browsr's
// resources-content.ts, so Mappr shows the same words as Browsr.
//
// Fails on a pattern that names an unknown guide, resource, lane or Initializr driver.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parse } from 'yaml';
import { RESOURCE_GROUPS } from '../src/app/browsr/resources-content.ts';
import type { Dataset, Release as BrowsrRelease } from '../src/core/browsr/types.ts';
import { isR4Resource } from '../src/core/mappr/release.ts';
import type { VectorFile } from '../src/core/mappr/semantic.ts';
import { embeddedTexts, textHash } from './lib/mappr-texts.ts';
import type {
  MapprData,
  MapprGuide,
  MapprResource,
  Pattern,
  Release,
  Walkthrough,
} from '../src/core/mappr/types.ts';

const DIR = 'data/mappr/patterns';
// Extra phrasings for the wider tier, by guide id or resource name.
const wider = (parse(readFileSync('data/mappr/wider.yaml', 'utf8')) ?? {}) as Record<
  string,
  string[]
>;
const TYPES = new Set(['workflow', 'exchange', 'data-shape', 'guide-stack', 'safeguard']);
const RELEASES: readonly Release[] = ['R4', 'R4B', 'R5', 'R6'];
// Ballots, drafts and builds don't count as published for a release. Unlike Browsr's default
// scope, 0.x releases do: Mappr points at early guides (US Behavioral Health Profiles is 0.1.0).
const UNPUBLISHED = new Set(['ballot', 'draft', 'ci-build', 'preview', 'qa-preview', 'withdrawn']);

if (!existsSync('public/data/guides.json')) {
  console.error(
    "public/data/guides.json is missing: run Browsr's build (scripts/build-browsr.ts) first.",
  );
  process.exit(1);
}
const dataset = JSON.parse(readFileSync('public/data/guides.json', 'utf8')) as Dataset;
const drivers = new Set(
  readdirSync('data/kb/drivers')
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => (parse(readFileSync(join('data/kb/drivers', f), 'utf8')) as { id: string }).id),
);

const published = (r: BrowsrRelease) =>
  !UNPUBLISHED.has(r.status ?? '') && !/-(ballot|snapshot|draft)/.test(r.version);

// Mappr is US only for now: US and universal-realm guides.
const guides: Record<string, MapprGuide> = {};
for (const g of dataset.guides) {
  if (g.use !== 'us' && g.use !== 'generic') continue;
  const current = g.releases.find((r) => r.current) ?? g.releases[0];
  guides[g.id] = {
    id: g.id,
    name: g.name,
    blurb: g.blurb,
    fhir: RELEASES.filter((f) => g.releases.some((r) => published(r) && r.fhir.includes(f))),
    url: current?.url ?? `https://packages.fhir.org/${g.id}`,
    withdrawn: g.withdrawn,
    phrasings: wider[g.id] ?? [],
  };
}

const resources: Record<string, MapprResource> = {};
for (const group of RESOURCE_GROUPS)
  for (const r of group.resources)
    resources[r.name] = {
      name: r.name,
      group: group.name,
      blurb: r.blurb,
      phrasings: wider[r.name] ?? [],
    };

const errors: string[] = [];
for (const id of Object.keys(wider))
  if (!guides[id] && !resources[id])
    errors.push(`data/mappr/wider.yaml: unknown guide or resource ${id}`);
const patterns: Pattern[] = [];
for (const file of readdirSync(DIR)
  .filter((f) => f.endsWith('.yaml'))
  .sort()) {
  const p = parse(readFileSync(join(DIR, file), 'utf8')) as Pattern;
  const where = `${DIR}/${file}`;
  const err = (m: string) => errors.push(`${where}: ${m}`);
  if (p.id !== basename(file, '.yaml')) err(`id "${p.id}" doesn't match the file name`);
  if (!TYPES.has(p.type)) err(`unknown type "${p.type}"`);
  if (p.type === 'workflow' && p.kind !== 'established' && p.kind !== 'gap')
    err('a workflow needs kind: established or gap');
  if (p.kind === 'gap' && !p.gap) err('a gap needs gap: (thin, who, help)');
  for (const field of ['title', 'ask', 'summary'] as const) if (!p[field]) err(`no ${field}`);
  const named = [
    ...(p.stack ? [...p.stack.moves, ...p.stack.carries, ...(p.stack.builtOn ?? [])] : []).map(
      (s) => s.guide,
    ),
    ...(p.guides ?? []),
  ];
  for (const id of named) if (!guides[id]) err(`unknown or non-US guide ${id}`);
  for (const r of p.resources ?? []) if (!isR4Resource(r)) err(`${r} isn't an R4 resource`);
  const walks: Omit<Walkthrough, 'kind' | 'takeaway'>[] =
    p.drawing?.kind === 'walkthrough'
      ? [p.drawing]
      : p.drawing?.kind === 'contrast'
        ? p.drawing.sides.map((s) => s.walkthrough)
        : [];
  for (const w of walks) {
    const lanes = new Set(w.lanes.map((l) => l.id));
    for (const s of w.steps)
      if (!lanes.has(s.lane)) err(`step "${s.title}" is in unknown lane ${s.lane}`);
  }
  for (const d of p.initializr?.drivers ?? [])
    if (!drivers.has(d.split('@')[0])) err(`unknown Initializr driver ${d}`);
  if (!p.readFirst?.length) err('no readFirst pages');
  const seen = new Set<string>();
  for (const ph of p.phrasings ?? []) {
    const k = ph.toLowerCase();
    if (seen.has(k)) err(`phrasing "${ph}" appears twice`);
    seen.add(k);
  }
  if (!p.phrasings?.length) err('no phrasings');
  patterns.push({ ...p, resources: p.resources ?? [] });
}

if (errors.length) {
  for (const e of errors) console.error(e);
  console.error(`[mappr] ${errors.length} error(s); not writing data.`);
  process.exit(1);
}

const out: MapprData = { patterns, guides, resources };

// The lookup's meaning-based fallback needs a vector for every text it searches, made from these
// same texts by `npm run vectors`.
const vectors = JSON.parse(readFileSync('data/mappr/vectors.json', 'utf8')) as VectorFile;
if (vectors.textHash !== textHash(embeddedTexts(out))) {
  console.error(
    '[mappr] data/mappr/vectors.json is stale: a pattern, phrasing, guide or resource changed. ' +
      'Run `npm run vectors` and commit the result.',
  );
  process.exit(1);
}

writeFileSync('public/data/mappr.json', JSON.stringify(out));
writeFileSync('public/data/mappr-vectors.json', JSON.stringify(vectors));
const phrasings = patterns.reduce((n, p) => n + p.phrasings.length, 0);
console.log(
  `[mappr] mappr.json: ${patterns.length} patterns (${phrasings} phrasings), ` +
    `${Object.keys(guides).length} guides, ${Object.keys(resources).length} resources`,
);
