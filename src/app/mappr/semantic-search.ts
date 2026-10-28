import { Injectable } from '@angular/core';
import type { Hit } from '../../core/mappr/lookup';
import { MODEL, nearest, type VectorFile, type Vectors } from '../../core/mappr/semantic';

type Embed = (
  text: string,
  o: { pooling: 'mean'; normalize: true },
) => Promise<{ data: ArrayLike<number> }>;

/**
 * The lookup's meaning-based fallback in the browser. Nothing loads until the word match comes up
 * empty: then the library, the model (~23 MB, from Hugging Face's CDN, cached by the browser) and
 * the vectors load once. Where they can't load (offline, or a network that blocks the CDN), it
 * stays quiet and the lookup says "no good match".
 */
@Injectable({ providedIn: 'root' })
export class SemanticSearch {
  private ready: Promise<{ embed: Embed; vectors: Vectors }> | null = null;

  private load() {
    this.ready ??= (async () => {
      const [{ env, pipeline }, file] = await Promise.all([
        import('@huggingface/transformers'),
        fetch('data/mappr-vectors.json').then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as Promise<VectorFile>;
        }),
      ]);
      env.allowLocalModels = false;
      const embed = (await pipeline('feature-extraction', MODEL, {
        dtype: 'q8',
      })) as unknown as Embed;
      const bytes = Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0));
      const vectors: Vectors = {
        dims: file.dims,
        entries: file.entries,
        values: new Int8Array(bytes.buffer),
      };
      return { embed, vectors };
    })();
    // A failed load can be tried again later.
    this.ready.catch(() => (this.ready = null));
    return this.ready;
  }

  /** Every item's similarity to the query, best first; null when the model can't load. */
  async search(query: string): Promise<Hit[] | null> {
    try {
      const { embed, vectors } = await this.load();
      const out = await embed(query, { pooling: 'mean', normalize: true });
      return nearest(vectors, out.data);
    } catch {
      return null;
    }
  }
}
