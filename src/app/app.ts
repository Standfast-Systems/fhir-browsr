import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  REGIONS,
  REGION_KEYS,
  applyScope,
  countBy,
  countByRegion,
  inFocus,
  matches,
  regionsWith,
  sortGuides,
  addedBy,
  type AddedBy,
  type Region,
  type ScopedGuide,
} from '../core/scope';
import type { Dataset, Domain, Family, ScopeOptions } from '../core/types';
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
  ];

  protected readonly scoped = computed(() =>
    applyScope(this.data()?.guides ?? [], this.view().scope, this.view().country),
  );
  protected readonly counts = computed(() => countByRegion(this.scoped()));
  protected readonly patientTotal = computed(() =>
    regionsWith('patient').reduce((n, k) => n + this.counts()[k], 0),
  );
  protected readonly regions = REGIONS;

  protected readonly families = computed(
    () => new Map<string, Family>((this.data()?.families ?? []).map((f) => [f.id, f])),
  );
  private readonly familyOrder = computed(() => (this.data()?.families ?? []).map((f) => f.id));
  protected readonly domains = computed(
    () => new Map<string, Domain>((this.data()?.domains ?? []).map((d) => [d.id, d])),
  );

  /** A Program or Domain pick shows all of it across regions, setting the region selection aside. */
  protected readonly focused = computed(() => !!this.view().family || !!this.view().domain);

  /**
   * Every guide a Program or Domain pick could show: the current view (country and toggles), any
   * region, narrowed by the search box and the toggle chips just as the table would be.
   */
  private readonly pickable = computed(() => {
    const q = this.view().query;
    return this.scoped().filter((g) => matches(g, q) && this.inAdded()(g));
  });

  /**
   * Dropdown options with the number of rows picking each would show. Options that would show
   * nothing stay listed but disabled. Only one dropdown applies at a time.
   */
  protected readonly programOptions = computed(() => {
    const n = countBy(this.pickable(), (g) => (g.family ? [g.family] : []));
    return (this.data()?.families ?? []).map((f) => ({ ...f, count: n.get(f.id) ?? 0 }));
  });
  protected readonly domainOptions = computed(() => {
    const n = countBy(this.pickable(), (g) => g.domains);
    return [...(this.data()?.domains ?? [])]
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((d) => ({ ...d, count: n.get(d.id) ?? 0 }));
  });
  /** The picked program or domain, with the same count as its dropdown option. */
  protected readonly activeFamily = computed(
    () => this.programOptions().find((f) => f.id === this.view().family) ?? null,
  );
  protected readonly activeDomain = computed(
    () => this.domainOptions().find((d) => d.id === this.view().domain) ?? null,
  );

  /** True when there's something to list: a program or domain pick, or at least one region. */
  protected readonly hasSelection = computed(() => this.focused() || this.selected().size > 0);

  /**
   * Rows before the topic and toggle chips: everything in the picked program and domain, or else
   * the selected regions, narrowed by the search box. Nothing selected lists nothing.
   */
  private readonly pool = computed(() => {
    const v = this.view();
    const sel = this.selected();
    const inView = (g: ScopedGuide) =>
      this.focused() ? inFocus(g, v.family, v.domain) : sel.has(g.region);
    return this.scoped().filter((g) => inView(g) && matches(g, v.query));
  });

  /** "What are you working on?" chips show only with Provider-only selected. */
  private readonly showBuckets = computed(() => !this.focused() && this.selected().has('pr'));
  /** The "added by" chips show while either scope toggle is on. */
  private readonly showAdded = computed(() => this.view().scope.drafts || this.view().scope.r5);

  private readonly inBucket = computed(() => {
    const b = this.showBuckets() ? this.view().bucket : null;
    return (g: ScopedGuide) => !b || g.bucket === b;
  });
  private readonly inAdded = computed(() => {
    const a = this.showAdded() ? this.view().added : null;
    return (g: ScopedGuide) => !a || addedBy(g)[a];
  });

  /** Each chip row counts what the other row leaves, so the two combine. */
  protected readonly bucketChips = computed(() => {
    if (!this.showBuckets()) return null;
    const base = this.pool().filter(this.inAdded());
    const n = new Map<string, number>();
    for (const g of base) n.set(g.bucket, (n.get(g.bucket) ?? 0) + 1);
    return {
      all: base.length,
      chips: (this.data()?.buckets ?? [])
        .map((b) => ({ ...b, count: n.get(b.id) ?? 0 }))
        .filter((b) => b.count > 0),
    };
  });

  protected readonly addedChips = computed(() => {
    if (!this.showAdded()) return null;
    const { drafts, r5 } = this.view().scope;
    const base = this.pool().filter(this.inBucket());
    const count = (k: AddedBy) => base.filter((g) => addedBy(g)[k]).length;
    const chips: { id: AddedBy; label: string; count: number }[] = [];
    if (drafts) chips.push({ id: 'drafts', label: 'Ballots & drafts', count: count('drafts') });
    if (r5) chips.push({ id: 'r5', label: 'R5/R6', count: count('r5') });
    return { all: base.length, chips };
  });

  protected readonly rows = computed(() =>
    sortGuides(
      this.pool().filter(this.inBucket()).filter(this.inAdded()),
      this.view().sort,
      this.familyOrder(),
    ),
  );

  /** With every region selected, the bar shows one chip instead of eight. */
  protected readonly everyRegion = computed(
    () => !this.focused() && this.view().regions.length === REGION_KEYS.length,
  );

  /** The centre's chip keeps its name: "All three · Foundation". */
  protected chipLabel(r: Region): string {
    return r.key === 'all' ? `${r.label} · Foundation` : r.label;
  }

  /** The visually hidden table heading: the filter bar's chips, read out as one line. */
  protected readonly heading = computed(() => {
    const v = this.view();
    if (!this.hasSelection()) return 'No regions selected';
    const parts = this.focused()
      ? [this.activeFamily()?.label ?? '', this.activeDomain()?.label ?? '']
      : [
          this.everyRegion()
            ? 'Every region'
            : REGIONS.filter((r) => v.regions.includes(r.key))
                .map((r) => this.chipLabel(r))
                .join(', '),
        ];
    const bucket = this.bucketChips() && v.bucket;
    if (bucket) parts.push(this.data()?.buckets.find((b) => b.id === bucket)?.label ?? '');
    const added = this.addedChips()?.chips.find((c) => c.id === v.added);
    if (added) parts.push(`added by ${added.label}`);
    if (v.query.trim()) parts.push(`matching “${v.query.trim()}”`);
    return `Showing ${parts.filter(Boolean).join('; ')}`;
  });

  protected readonly scopeLine = computed(() => {
    const s = this.view().scope;
    const status = s.drafts ? 'published, ballot and draft' : 'published';
    const fhir = s.r5 ? 'R4, R5 and R6' : 'R4';
    return this.view().country === 'us'
      ? `${status} FHIR ${fhir} guides for US projects, from HL7, IHE and US agencies`
      : `${status} FHIR ${fhir} guides for use outside the US, including national and regional ` +
          `core guides, from HL7 and its national affiliates, IHE, WHO and national health authorities`;
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
