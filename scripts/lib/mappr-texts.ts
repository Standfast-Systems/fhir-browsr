// The texts FHIR Mappr embeds for its meaning-based lookup, in a fixed order, and a hash of them.
// Shared by scripts/mappr-vectors.ts (which embeds them) and scripts/build-mappr.ts (which
// checks the committed vectors still match).

import { createHash } from 'node:crypto';
import type { ItemKind } from '../../src/core/mappr/lookup.ts';
import type { MapprData } from '../../src/core/mappr/types.ts';

export interface EmbeddedText {
  kind: ItemKind;
  id: string;
  text: string;
}

export function embeddedTexts(data: MapprData): EmbeddedText[] {
  const out: EmbeddedText[] = [];
  for (const p of data.patterns)
    for (const text of [p.title, p.ask, ...p.phrasings])
      out.push({ kind: 'pattern', id: p.id, text });
  for (const g of Object.values(data.guides))
    for (const text of [`${g.name}: ${g.blurb}`, ...g.phrasings])
      out.push({ kind: 'guide', id: g.id, text });
  for (const r of Object.values(data.resources)) {
    const name = r.name.replace(/([a-z])([A-Z])/g, '$1 $2');
    for (const text of [`${name}: ${r.blurb}`, ...r.phrasings])
      out.push({ kind: 'resource', id: r.name, text });
  }
  return out;
}

export function textHash(texts: EmbeddedText[]): string {
  const h = createHash('sha256');
  for (const t of texts) h.update(`${t.kind}\u0000${t.id}\u0000${t.text}\u0001`);
  return h.digest('hex').slice(0, 16);
}
