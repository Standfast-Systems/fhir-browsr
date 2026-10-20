import { Injectable, computed, effect, signal } from '@angular/core';
import { decodeProfile, deepKeysFor, encodeProfile, resolve } from '../core/index.ts';
import type {
  KnowledgeBase,
  Manifest,
  PackageSnapshot,
  ProjectProfile,
  RegistrySnapshot,
} from '../core/index.ts';

/**
 * App state: the knowledge base and registry snapshot (static JSON), the project profile (mirrored
 * in the URL so every scope is a share link), and the resolved manifest. Deep package files load on
 * demand as pins change.
 */
@Injectable({ providedIn: 'root' })
export class InitializrStore {
  readonly kb = signal<KnowledgeBase | null>(null);
  readonly registry = signal<RegistrySnapshot | null>(null);
  readonly error = signal<string | null>(null);
  readonly profile = signal<ProjectProfile | null>(null);
  readonly deep = signal<Map<string, PackageSnapshot>>(new Map());
  readonly loadingDeep = signal(0);

  private readonly requested = new Set<string>();
  private readonly now = new Date().toISOString();

  readonly manifest = computed<Manifest | null>(() => {
    const kb = this.kb();
    const reg = this.registry();
    const profile = this.profile();
    if (!kb || !reg || !profile) return null;
    return resolve(kb, reg, profile, { deep: this.deep(), now: this.now });
  });

  readonly shareQuery = computed(() => {
    const p = this.profile();
    return p ? encodeProfile(p) : '';
  });

  constructor() {
    void this.load();

    // Keep the URL in step with the profile.
    effect(() => {
      const q = this.shareQuery();
      if (!q) return;
      const url = `${location.pathname}?${q}${location.hash}`;
      if (url !== `${location.pathname}${location.search}${location.hash}`)
        history.replaceState(null, '', url);
    });

    // Fetch profiles and CapabilityStatements for whatever is pinned.
    effect(() => {
      const m = this.manifest();
      if (!m) return;
      const missing = deepKeysFor(m).filter((k) => !this.requested.has(k));
      if (missing.length) void this.fetchDeep(missing);
    });
  }

  update(change: (p: ProjectProfile) => ProjectProfile) {
    const p = this.profile();
    if (p) this.profile.set(change(structuredClone(p)));
  }

  private async load() {
    try {
      const [kb, reg] = await Promise.all([
        this.json<KnowledgeBase>('data/kb.json'),
        this.json<RegistrySnapshot>('data/registry.json'),
      ]);
      this.kb.set(kb);
      this.registry.set(reg);
      this.profile.set(decodeProfile(kb, location.search));
    } catch (e) {
      this.error.set(`Couldn't load the knowledge base (${e instanceof Error ? e.message : e}).`);
    }
  }

  private async fetchDeep(keys: string[]) {
    const reg = this.registry();
    keys.forEach((k) => this.requested.add(k));
    // Only versions the snapshot holds deep data for; the rest would 404.
    const available = new Set(reg?.deepKeys ?? []);
    const wanted = keys.filter((k) => available.has(k));
    if (!wanted.length) return;
    this.loadingDeep.update((n) => n + 1);
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
    this.loadingDeep.update((n) => n - 1);
    const hits = results.filter((r): r is readonly [string, PackageSnapshot] => !!r);
    if (!hits.length) return;
    this.deep.update((m) => {
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
