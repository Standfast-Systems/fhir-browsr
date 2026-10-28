// The lookup's fallback: meaning, not words. When the word match finds nothing good, the query is
// embedded in the browser with the same small model that embedded every pattern phrasing and
// every guide and resource at build time (scripts/mappr-vectors.ts), and the nearest ones win.
// This file is the plain math; loading the model is the app's job.

import type { Hit, ItemKind, LookupResult } from './lookup.ts';

/** The model both sides use: small, Apache 2.0, runs in the browser. */
export const MODEL = 'Xenova/all-MiniLM-L6-v2';

/** A pattern is a good match at this similarity. */
export const SEM_PATTERN_MIN = 0.6;
/** A guide or resource counts at this similarity. */
export const SEM_WIDER_MIN = 0.5;

/** data/mappr/vectors.json: one int8 vector per text, in entry order. */
export interface VectorFile {
  model: string;
  dims: number;
  /** A hash of every embedded text, so the build can tell when the vectors are stale. */
  textHash: string;
  /** [kind, id] for each vector. */
  entries: [ItemKind, string][];
  /** Every vector, int8 (value × 127), concatenated and base64-encoded. */
  data: string;
}

export interface Vectors {
  dims: number;
  entries: [ItemKind, string][];
  values: Int8Array;
}

/** Scale a unit vector to int8. */
export function toInt8(v: ArrayLike<number>): Int8Array {
  const out = new Int8Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = Math.max(-127, Math.min(127, Math.round(v[i] * 127)));
  return out;
}

/**
 * Each item's best similarity to the query (cosine, since both sides are unit vectors), best
 * first. An item with several vectors (one per phrasing) keeps its closest.
 */
export function nearest(vectors: Vectors, query: ArrayLike<number>): Hit[] {
  const { dims, entries, values } = vectors;
  const best = new Map<string, Hit>();
  for (let e = 0; e < entries.length; e++) {
    let dot = 0;
    const off = e * dims;
    for (let i = 0; i < dims; i++) dot += values[off + i] * query[i];
    const score = dot / 127;
    const [kind, id] = entries[e];
    const key = `${kind}:${id}`;
    const prev = best.get(key);
    if (!prev || score > prev.score) best.set(key, { kind, id, score });
  }
  return [...best.values()].sort((a, b) => b.score - a.score);
}

/**
 * The same tiers as the word match: a pattern if one is close, otherwise close guides (published
 * for the release, via `keepGuide`) and resources, otherwise nothing.
 */
export function semanticLookup(
  hits: Hit[],
  keepGuide: (id: string) => boolean,
  limits = { guides: 6, resources: 4 },
): LookupResult {
  const patterns = hits.filter((h) => h.kind === 'pattern');
  if (patterns[0] && patterns[0].score >= SEM_PATTERN_MIN) {
    return {
      tier: 'patterns',
      patterns: patterns.filter(
        (h) => h.score >= SEM_PATTERN_MIN && patterns[0].score - h.score <= 0.05,
      ),
    };
  }
  const guides = hits
    .filter((h) => h.kind === 'guide' && h.score >= SEM_WIDER_MIN && keepGuide(h.id))
    .slice(0, limits.guides);
  const resources = hits
    .filter((h) => h.kind === 'resource' && h.score >= SEM_WIDER_MIN)
    .slice(0, limits.resources);
  if (!guides.length && !resources.length) return { tier: 'none' };
  return { tier: 'wider', guides, resources };
}
