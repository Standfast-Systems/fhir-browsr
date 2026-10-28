// Mappr's lookup: match what a visitor types against the curated patterns first, then against
// guides and resources directly, then say "no good match" rather than show the nearest wrong
// result. Plain TypeScript with no dependencies, so the browser and the acceptance tests run the
// same code.
//
// Each item (a pattern, a guide or a resource) has texts: its phrasings, title and one-liner. A
// query scores by coverage: how much of the query, weighting rare words above common ones, the
// item's texts account for. Words match exactly, by prefix, or with one typo. A text only counts
// when it matches at least two of the query's words (or all of a one-word query), so words picked
// from unrelated phrasings don't add up to a match.

import { guidesOf } from './library.ts';
import type { MapprData, Pattern, Release } from './types.ts';

export type ItemKind = 'pattern' | 'guide' | 'resource';

/** A pattern is a good match at this coverage; below it the lookup goes wider. */
export const PATTERN_MIN = 0.8;
/** A guide or resource counts at this coverage; with none, it's "no good match". */
export const WIDER_MIN = 0.6;
const MAX_GUIDES = 6;
const MAX_RESOURCES = 4;

const STOP = new Set(
  (
    'a an and are as at be by can do does for from get how i in into is it its my of on or our ' +
    'so that the their them then there these this to us want we what when where which who will ' +
    'with you your need needs like'
  ).split(' '),
);

/** Lowercase, split on anything that isn't a letter or digit, drop filler, and stem. */
export function terms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]s\b/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOP.has(t))
    .map(stem);
}

/** A light stemmer: plurals and -ing/-ed, enough for "reports", "reporting", "allergies". */
export function stem(t: string): string {
  if (t.length <= 3 || /\d/.test(t)) return t;
  if (t.endsWith('ies') && t.length > 4) return t.slice(0, -3) + 'y';
  if (t.endsWith('sses')) return t.slice(0, -2);
  if (t.endsWith('ing') && t.length > 5) return t.slice(0, -3);
  if (t.endsWith('ed') && t.length > 4 && !t.endsWith('eed')) return t.slice(0, -2);
  if (t.endsWith('s') && !t.endsWith('ss') && !t.endsWith('us') && !t.endsWith('is'))
    return t.slice(0, -1);
  return t;
}

/** Whether two words are one edit apart (insert, delete, substitute or swap). */
function oneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
  }
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/** How well a query word matches a word in an item: 1 exact, less for a prefix or a typo. */
function wordMatch(q: string, d: string): number {
  if (q === d) return 1;
  const short = Math.min(q.length, d.length);
  if (short >= 4 && (d.startsWith(q) || q.startsWith(d))) return 0.85;
  // A typo keeps the first letter: people rarely mistype it, and allowing it turns other words
  // into common ones ("esource" into "source").
  if (short >= 5 && q[0] === d[0] && oneEdit(q, d)) return 0.8;
  return 0;
}

interface Item {
  kind: ItemKind;
  id: string;
  /** Each text's distinct words. */
  texts: Set<string>[];
  /** The phrasings, normalized, for an exact-phrase match. */
  phrases: Set<string>;
}

export interface LookupIndex {
  items: Item[];
  /** How many items use each word: rare words weigh more. */
  df: Map<string, number>;
  data: MapprData;
}

export interface Hit {
  kind: ItemKind;
  id: string;
  /** 0 to 1: the share of the query this item accounts for, rare words weighing more. */
  score: number;
}

export type LookupResult =
  | { tier: 'patterns'; patterns: Hit[] }
  | { tier: 'wider'; guides: Hit[]; resources: Hit[] }
  | { tier: 'none' };

const norm = (s: string) => terms(s).join(' ');

/** "AllergyIntolerance" → "Allergy Intolerance", so resource names match plain words. */
const splitCamel = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2');

function item(kind: ItemKind, id: string, texts: string[], phrasings: string[]): Item {
  return {
    kind,
    id,
    texts: texts.map((t) => new Set(terms(t))).filter((t) => t.size),
    phrases: new Set(phrasings.map(norm).filter(Boolean)),
  };
}

/** Index the patterns, guides and resources once; reuse for every query. */
export function buildIndex(data: MapprData): LookupIndex {
  const items: Item[] = [];
  for (const p of data.patterns)
    items.push(
      item('pattern', p.id, [p.title, p.ask, ...p.phrasings], [p.title, p.ask, ...p.phrasings]),
    );
  for (const g of Object.values(data.guides)) {
    items.push(item('guide', g.id, [g.name, g.blurb, ...g.phrasings], [g.name, ...g.phrasings]));
  }
  for (const r of Object.values(data.resources)) {
    const texts = [splitCamel(r.name), r.blurb, ...r.phrasings];
    items.push(item('resource', r.name, texts, [r.name, ...r.phrasings]));
  }
  const df = new Map<string, number>();
  for (const it of items)
    for (const w of new Set(it.texts.flatMap((t) => [...t]))) df.set(w, (df.get(w) ?? 0) + 1);
  return { items, df, data };
}

/** A query word's weight: rare words (and words nothing uses) count more than common ones. */
function weight(index: LookupIndex, q: string): number {
  return Math.log(1 + index.items.length / (1 + (index.df.get(q) ?? 0)));
}

/** How well one text matches each query word. */
function matchText(text: Set<string>, qs: string[]): number[] {
  return qs.map((q) => {
    if (text.has(q)) return 1;
    let best = 0;
    for (const d of text) if ((best = Math.max(best, wordMatch(q, d))) >= 0.85) break;
    return best;
  });
}

/** Score one item against a query's words. */
function score(index: LookupIndex, it: Item, qs: string[], phrase: string): number {
  if (phrase && it.phrases.has(phrase)) return 1;
  const need = Math.min(2, qs.length);
  const best = qs.map(() => 0);
  for (const text of it.texts) {
    const m = matchText(text, qs);
    if (m.filter((x) => x > 0).length < need) continue;
    m.forEach((x, i) => (best[i] = Math.max(best[i], x)));
  }
  let total = 0;
  let got = 0;
  qs.forEach((q, i) => {
    const w = weight(index, q);
    total += w;
    got += w * best[i];
  });
  return total ? got / total : 0;
}

/** Every item scored against a query, best first. */
export function rank(index: LookupIndex, query: string, kind?: ItemKind): Hit[] {
  const qs = [...new Set(terms(query))];
  if (!qs.length) return [];
  const phrase = qs.join(' ');
  return index.items
    .filter((it) => !kind || it.kind === kind)
    .map((it) => ({ kind: it.kind, id: it.id, score: score(index, it, qs, phrase) }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

/**
 * The lookup, on rails first: a good pattern match wins. Otherwise guides (published for the
 * selected FHIR release) and resources that match well. Otherwise no good match.
 */
export function lookup(index: LookupIndex, query: string, release: Release = 'R4'): LookupResult {
  const patterns = rank(index, query, 'pattern');
  const best = patterns[0];
  if (best && best.score >= PATTERN_MIN) {
    // Close runners-up too, so "payer" shows every payer pattern.
    return {
      tier: 'patterns',
      patterns: patterns.filter((h) => h.score >= PATTERN_MIN && best.score - h.score <= 0.1),
    };
  }
  const guides = rank(index, query, 'guide').filter((h) => {
    const g = index.data.guides[h.id];
    return h.score >= WIDER_MIN && !g.withdrawn && g.fhir.includes(release);
  });
  const resources = rank(index, query, 'resource').filter((h) => h.score >= WIDER_MIN);
  if (!guides.length && !resources.length) return { tier: 'none' };
  return {
    tier: 'wider',
    guides: guides.slice(0, MAX_GUIDES),
    resources: resources.slice(0, MAX_RESOURCES),
  };
}

/** The patterns a guide or resource belongs to, so wider results can point to them. */
export function patternsWith(data: MapprData, kind: 'guide' | 'resource', id: string): Pattern[] {
  return data.patterns.filter((p) =>
    kind === 'guide' ? guidesOf(p).includes(id) : p.resources.includes(id),
  );
}
