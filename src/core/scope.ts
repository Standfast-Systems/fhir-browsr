import type { Country, Fhir, Guide, Party, Release, ScopeOptions } from './types.ts';

// Statuses package-list.json uses for real releases. HL7 Terminology, WHO and many IHE guides
// publish as `release`, so the three ballot-level statuses alone would drop them.
const PUBLISHED = new Set([
  'trial-use',
  'normative',
  'informative',
  'release',
  'normative+trial-use',
  'corrected',
  'update',
]);

export const DEFAULT_SCOPE: ScopeOptions = { drafts: false, r5: false, otherPublishers: false };

const isR4 = (f: Fhir) => f === 'R4' || f === 'R4B';
const isR5 = (f: Fhir) => f === 'R5' || f === 'R6';

/** A real release: published status, not 0.x, not a -ballot/-snapshot version. */
export function isPublished(r: Release): boolean {
  if (r.version.startsWith('0.') || r.version.includes('-')) return false;
  // No package-list.json at all: trust a plain semver npm release.
  if (r.status === null) return true;
  return PUBLISHED.has(r.status);
}

/**
 * The release a guide should link to under these options, or null when it's out of scope.
 * A published R4 release always wins, so turning a toggle on never swaps a guide's link for a
 * newer ballot; the toggles only bring in guides that had nothing to show.
 */
export function pickRelease(g: Guide, o: ScopeOptions): Release | null {
  const live = g.releases.filter((r) => r.status !== 'withdrawn');
  const tiers: ((r: Release) => boolean)[] = [(r) => isPublished(r) && r.fhir.some(isR4)];
  if (o.r5) tiers.push((r) => isPublished(r) && r.fhir.some(isR5));
  if (o.drafts) tiers.push((r) => r.fhir.some(isR4));
  if (o.drafts && o.r5) tiers.push((r) => r.fhir.some(isR5));
  for (const t of tiers) {
    const hit = live.find(t);
    if (hit) return hit;
  }
  return null;
}

export interface ScopedGuide extends Guide {
  release: Release;
  region: RegionKey;
}

/** US shows US-specific and generic guides; International shows guides strictly for outside it. */
export function inCountry(g: Guide, c: Country): boolean {
  return c === 'intl' ? g.use === 'intl' : g.use !== 'intl';
}

export function applyScope(guides: Guide[], o: ScopeOptions, c: Country): ScopedGuide[] {
  const out: ScopedGuide[] = [];
  for (const g of guides) {
    if (g.withdrawn || (!g.knownPublisher && !o.otherPublishers) || !inCountry(g, c)) continue;
    const release = pickRelease(g, o);
    if (release) out.push({ ...g, release, region: regionOf(g.parties) });
  }
  return out;
}

// Regions of the three-circle diagram ---------------------------------------------------------

export type RegionKey = 'all' | 'pt-pr' | 'pr-py' | 'pt-py' | 'pt' | 'pr' | 'py' | 'none';

export interface Region {
  key: RegionKey;
  parties: Party[];
  label: string;
}

export const REGIONS: readonly Region[] = [
  { key: 'all', parties: ['patient', 'provider', 'payer'], label: 'All three' },
  { key: 'pt-pr', parties: ['patient', 'provider'], label: 'Patient + Provider' },
  { key: 'pr-py', parties: ['provider', 'payer'], label: 'Provider + Payer' },
  { key: 'pt-py', parties: ['patient', 'payer'], label: 'Patient + Payer' },
  { key: 'pt', parties: ['patient'], label: 'Patient only' },
  { key: 'pr', parties: ['provider'], label: 'Provider only' },
  { key: 'py', parties: ['payer'], label: 'Payer only' },
  { key: 'none', parties: [], label: 'Outside all three' },
];

export const REGION_KEYS = REGIONS.map((r) => r.key);

export function regionOf(parties: readonly Party[]): RegionKey {
  const has = new Set(parties);
  return (
    REGIONS.find((r) => r.parties.length === has.size && r.parties.every((p) => has.has(p)))?.key ??
    'none'
  );
}

export function regionsWith(party: Party): RegionKey[] {
  return REGIONS.filter((r) => r.parties.includes(party)).map((r) => r.key);
}

export function countByRegion(guides: readonly ScopedGuide[]): Record<RegionKey, number> {
  const c = Object.fromEntries(REGION_KEYS.map((k) => [k, 0])) as Record<RegionKey, number>;
  for (const g of guides) c[g.region]++;
  return c;
}

// Table ----------------------------------------------------------------------------------------

export type SortKey = 'start' | 'name' | 'date' | 'family';

export function matches(g: Guide, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = `${g.name} ${g.blurb} ${g.id} ${g.group}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

const rank = (g: Guide) => g.start || Number.MAX_SAFE_INTEGER;

/**
 * `family` groups guides by program family in `families` order (guides in no family last), and
 * keeps each family's reading order so CRD, DTR and PAS sit together in workflow order.
 */
export function sortGuides(
  guides: ScopedGuide[],
  key: SortKey,
  families: readonly string[] = [],
): ScopedGuide[] {
  const byName = (a: ScopedGuide, b: ScopedGuide) =>
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
  const byStart = (a: ScopedGuide, b: ScopedGuide) => rank(a) - rank(b) || byName(a, b);
  const fam = (g: Guide) => {
    const i = g.family ? families.indexOf(g.family) : -1;
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  const cmp: Record<SortKey, (a: ScopedGuide, b: ScopedGuide) => number> = {
    start: byStart,
    name: byName,
    date: (a, b) => (b.release.date ?? '').localeCompare(a.release.date ?? '') || byName(a, b),
    family: (a, b) =>
      fam(a) - fam(b) || (a.family ? a.familyRank - b.familyRank || byName(a, b) : byStart(a, b)),
  };
  return [...guides].sort(cmp[key]);
}

export interface Page<T> {
  items: T[];
  page: number;
  pages: number;
  from: number;
  to: number;
  total: number;
}

export function paginate<T>(items: readonly T[], page: number, size: number): Page<T> {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const p = Math.min(Math.max(1, page), pages);
  const start = (p - 1) * size;
  const slice = items.slice(start, start + size);
  return {
    items: slice,
    page: p,
    pages,
    from: slice.length ? start + 1 : 0,
    to: start + slice.length,
    total: items.length,
  };
}

// View state --------------------------------------------------------------------------------------

export interface ViewState {
  country: Country;
  regions: RegionKey[];
  /** "What are you working on?" filter, only while Provider-only is selected. */
  bucket: string | null;
  /** Family filter from a row's family chip: shows the whole family, whatever its regions. */
  family: string | null;
  scope: ScopeOptions;
  query: string;
  sort: SortKey;
  page: number;
}

/** Where every visit starts: US, the shared foundation, so US Core and friends show straight away. */
export const DEFAULT_VIEW: ViewState = {
  country: 'us',
  regions: ['all'],
  bucket: null,
  family: null,
  scope: DEFAULT_SCOPE,
  query: '',
  sort: 'start',
  page: 1,
};
