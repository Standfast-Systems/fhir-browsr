// Embeds every text FHIR Mappr's lookup searches by meaning: each pattern's phrasings (and its
// title and ask), and each guide and resource (its name and one-liner, and each extra phrasing),
// with the same model the browser uses. Writes data/mappr/vectors.json, committed so the build
// never needs the model.
//
//   npm run vectors
//
// It embeds public/data/mappr.json as the last `npm run data` (or scripts/build-mappr.ts) wrote
// it, which happens even when that build stops on stale vectors.
// Run it again whenever patterns or data/mappr/wider.yaml change; the build fails on stale
// vectors. The first run downloads the model (~23 MB) from Hugging Face into .cache/models.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { env, pipeline } from '@huggingface/transformers';
import { MODEL, toInt8, type VectorFile } from '../src/core/mappr/semantic.ts';
import type { ItemKind } from '../src/core/mappr/lookup.ts';
import type { MapprData } from '../src/core/mappr/types.ts';
import { embeddedTexts, textHash } from './lib/mappr-texts.ts';

env.cacheDir = join(import.meta.dirname, '..', '.cache', 'models');

const data = JSON.parse(readFileSync('public/data/mappr.json', 'utf8')) as MapprData;
const texts = embeddedTexts(data);
const embed = await pipeline('feature-extraction', MODEL, { dtype: 'q8' });

const entries: [ItemKind, string][] = [];
const chunks: Int8Array[] = [];
let dims = 0;
const BATCH = 64;
for (let i = 0; i < texts.length; i += BATCH) {
  const batch = texts.slice(i, i + BATCH);
  const out = await embed(
    batch.map((t) => t.text),
    { pooling: 'mean', normalize: true },
  );
  dims = out.dims[1];
  const flat = out.data as Float32Array;
  for (let j = 0; j < batch.length; j++) {
    entries.push([batch[j].kind, batch[j].id]);
    chunks.push(toInt8(flat.subarray(j * dims, (j + 1) * dims)));
  }
  process.stdout.write(`\r[vectors] ${Math.min(i + BATCH, texts.length)}/${texts.length}`);
}

const all = new Int8Array(chunks.length * dims);
chunks.forEach((c, i) => all.set(c, i * dims));
const file: VectorFile = {
  model: MODEL,
  dims,
  textHash: textHash(texts),
  entries,
  data: Buffer.from(all.buffer).toString('base64'),
};
writeFileSync('data/mappr/vectors.json', JSON.stringify(file) + '\n');
console.log(`\n[vectors] wrote data/mappr/vectors.json: ${entries.length} vectors × ${dims}`);
