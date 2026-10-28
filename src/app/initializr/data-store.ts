import { Injectable, signal } from '@angular/core';
import type { KnowledgeBase, PackageSnapshot, RegistrySnapshot } from '../../core/initializr/index.ts';

/**
 * The static data the app runs on: the compiled knowledge base and the registry snapshot, loaded
 * once, plus per-package detail (profiles and CapabilityStatements) fetched on demand.
 */
@Injectable({ providedIn: 'root' })
export class DataStore {
  private readonly _kb = signal<KnowledgeBase | null>(null);
  private readonly _registry = signal<RegistrySnapshot | null>(null);
  private readonly _error = signal<string | null>(null);
  private readonly _deep = signal<ReadonlyMap<string, PackageSnapshot>>(new Map());
  private readonly _loadingDeep = signal(0);

  readonly kb = this._kb.asReadonly();
  readonly registry = this._registry.asReadonly();
  readonly error = this._error.asReadonly();
  readonly deep = this._deep.asReadonly();
  readonly loadingDeep = this._loadingDeep.asReadonly();

  private readonly requested = new Set<string>();

  constructor() {
    void this.load();
  }

  /** Fetch detail for these name@version keys, each at most once. */
  ensureDeep(keys: string[]) {
    const missing = keys.filter((k) => !this.requested.has(k));
    if (missing.length) void this.fetchDeep(missing);
  }

  private async load() {
    try {
      const [kb, reg] = await Promise.all([
        this.json<KnowledgeBase>('data/kb.json'),
        this.json<RegistrySnapshot>('data/registry.json'),
      ]);
      this._kb.set(kb);
      this._registry.set(reg);
    } catch (e) {
      this._error.set(`Couldn't load the knowledge base (${e instanceof Error ? e.message : e}).`);
    }
  }

  private async fetchDeep(keys: string[]) {
    keys.forEach((k) => this.requested.add(k));
    // Only versions the snapshot holds detail for; the rest would 404.
    const available = new Set(this._registry()?.deepKeys ?? []);
    const wanted = keys.filter((k) => available.has(k));
    if (!wanted.length) return;
    this._loadingDeep.update((n) => n + 1);
    const results = await Promise.all(
      wanted.map(async (k) => {
        try {
          return [
            k,
            await this.json<PackageSnapshot>(`data/pkg/${encodeURIComponent(k)}.json`),
          ] as const;
        } catch {
          return null;
        }
      }),
    );
    this._loadingDeep.update((n) => n - 1);
    const hits = results.filter((r): r is readonly [string, PackageSnapshot] => !!r);
    if (!hits.length) return;
    this._deep.update((m) => {
      const next = new Map(m);
      for (const [k, v] of hits) next.set(k, v);
      return next;
    });
  }

  private async json<T>(path: string): Promise<T> {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return (await res.json()) as T;
  }
}
