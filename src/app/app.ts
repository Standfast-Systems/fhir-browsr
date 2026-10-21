import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  REGIONS,
  REGION_KEYS,
  applyScope,
  countByRegion,
  matches,
  regionsWith,
  sortGuides,
  type ScopedGuide,
} from '../core/scope';
import type { Dataset, Family, ScopeOptions } from '../core/types';
import { GuideTable } from './guide-table';
import { Venn } from './venn';
import { ViewStore } from './view-store';

@Component({
  selector: 'app-root',
  imports: [Venn, GuideTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly data = signal<Dataset | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly store = inject(ViewStore);
  protected readonly view = this.store.view;
  protected readonly selected = this.store.selected;

  protected readonly toggles: { key: keyof ScopeOptions; label: string; hint: string }[] = [
    {
      key: 'drafts',
      label: 'Include ballots and drafts',
      hint: 'Guides with no published release yet',
    },
    { key: 'r5', label: 'Include R5/R6', hint: 'Guides published only for newer FHIR versions' },
    {
      key: 'otherPublishers',
      label: 'Include other publishers',
      hint: 'Beyond HL7, IHE, US agencies and WHO',
    },
  ];

  protected readonly scoped = computed(() =>
    applyScope(this.data()?.guides ?? [], this.view().scope, this.view().country),
  );
  protected readonly counts = computed(() => countByRegion(this.scoped()));
  protected readonly patientTotal = computed(() =>
    regionsWith('patient').reduce((n, k) => n + this.counts()[k], 0),
  );
  protected readonly regions = REGIONS;
  protected readonly outside = REGIONS.find((r) => r.key === 'none')!;

  protected readonly families = computed(
    () => new Map<string, Family>((this.data()?.families ?? []).map((f) => [f.id, f])),
  );
  private readonly familyOrder = computed(() => (this.data()?.families ?? []).map((f) => f.id));
  protected readonly activeFamily = computed(() => {
    const id = this.view().family;
    return id ? (this.families().get(id) ?? null) : null;
  });

  /**
   * Rows before the bucket filter: a whole family when a family chip was clicked, otherwise the
   * selected regions. Both go through the search box; with nothing selected, search covers all.
   */
  private readonly pool = computed(() => {
    const v = this.view();
    const sel = this.selected();
    const searchAll = !sel.size && v.query.trim().length > 0;
    const inView = (g: ScopedGuide) =>
      v.family ? g.family === v.family : searchAll || sel.has(g.region);
    return this.scoped().filter((g) => inView(g) && matches(g, v.query));
  });

  /** "What are you working on?" chips: only with Provider-only selected, and only non-empty. */
  protected readonly bucketChips = computed(() => {
    if (this.view().family || !this.selected().has('pr')) return [];
    const n = new Map<string, number>();
    for (const g of this.pool()) n.set(g.bucket, (n.get(g.bucket) ?? 0) + 1);
    return (this.data()?.buckets ?? [])
      .map((b) => ({ ...b, count: n.get(b.id) ?? 0 }))
      .filter((b) => b.count > 0);
  });
  protected readonly poolSize = computed(() => this.pool().length);

  protected readonly rows = computed(() => {
    const v = this.view();
    const bucket = this.bucketChips().length ? v.bucket : null;
    const pool = bucket ? this.pool().filter((g) => g.bucket === bucket) : this.pool();
    return sortGuides(pool, v.sort, this.familyOrder());
  });

  protected readonly heading = computed(() => {
    const family = this.activeFamily();
    if (family) return `${family.label} family`;
    const sel = this.view().regions;
    if (!sel.length)
      return this.view().query.trim() ? 'Search results, all regions' : 'No regions selected';
    if (sel.length === REGION_KEYS.length) return 'Every region';
    if (sel.length === 1 && sel[0] === 'all') return 'The Foundation';
    return REGIONS.filter((r) => sel.includes(r.key))
      .map((r) => r.label)
      .join(', ');
  });

  protected readonly scopeLine = computed(() => {
    const s = this.view().scope;
    const status = s.drafts ? 'published, ballot and draft' : 'published';
    const fhir = s.r5 ? 'R4, R5 and R6' : 'R4';
    const who = s.otherPublishers ? 'any publisher' : 'HL7, IHE, US agencies and WHO';
    const where = this.view().country === 'us' ? 'for US projects' : 'for use outside the US';
    return `${status} FHIR ${fhir} guides ${where}, from ${who}`;
  });

  protected readonly snapshotDate = computed(() => this.data()?.snapshot.slice(0, 10) ?? '');

  constructor() {
    fetch('data/guides.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Dataset>;
      })
      .then((d) => this.data.set(d))
      .catch((e) => this.error.set(`Couldn't load the guide list (${e.message}).`));
  }
}
