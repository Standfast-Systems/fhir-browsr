import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RELEASES, releaseLabel, resourceSpecUrl } from '../../core/release';
import { ReleaseStore } from '../release-store';
import { ResourceData, type ResourceDetail, type SchemaRow } from './resource-data';
import {
  EXAMPLE_BLURB,
  EXAMPLE_DETAIL,
  EXAMPLE_NAME,
  EXAMPLE_NOTES,
  EXAMPLE_RELATIONS,
} from './resource-example';
import {
  RESOURCE_GROUPS,
  RESOURCE_NOTES,
  RESOURCE_RELATIONS,
  noteParts,
  specUrl,
  type NotePart,
  type Relation,
  type ResourceGroup,
} from './resources-content';

type View = 'schema' | 'sample';

/** What the detail card shows: a real resource, or the made-up Example on the welcome card. */
interface CardContent {
  name: string;
  /** The group's name; null for the Example. */
  group: string | null;
  blurb: string;
  /** The R4 spec page the card's content comes from; null for the Example, which has none. */
  spec: string | null;
  notes: NotePart[][];
  /** "How it relates": each line's resources (a card here, else the spec page), then how. */
  relations: { to: { name: string; card: boolean; url: string }[]; how: NotePart[] }[];
  /** Null while the data loads. */
  detail: ResourceDetail | null;
}

const CARDS = new Set(RESOURCE_GROUPS.flatMap((g) => g.resources.map((r) => r.name)));

const relationLines = (lines: readonly Relation[]) =>
  lines.map(({ to, how }) => ({
    to: to.map((name) => ({ name, card: CARDS.has(name), url: specUrl(name) })),
    how: noteParts(how),
  }));

const EXAMPLE: CardContent = {
  name: EXAMPLE_NAME,
  group: null,
  blurb: EXAMPLE_BLURB,
  spec: null,
  notes: EXAMPLE_NOTES.map(noteParts),
  relations: relationLines(EXAMPLE_RELATIONS),
  detail: EXAMPLE_DETAIL,
};

/**
 * The FHIR Resources page: the six groups of resources in one column, and a large card beside
 * them. It opens on a welcome card that explains the page, with a made-up Example resource showing
 * every part of a card. Selecting a resource fills the card: the plain sentence, notes, then its
 * key fields (Schema) or a trimmed official example (Sample), with "show all fields" and collapsed
 * nested objects for anyone who wants more. The full spec is one small link away.
 */
@Component({
  selector: 'app-resources-page',
  imports: [RouterLink, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resources-page.html',
  styleUrl: './resources-page.scss',
})
export class ResourcesPage {
  private readonly data = inject(ResourceData);
  protected readonly groups = RESOURCE_GROUPS;
  protected readonly loadError = this.data.error;

  /** The FHIR release from the shared header. The cards themselves are R4 until R5 data lands. */
  private readonly release = inject(ReleaseStore).release;
  protected readonly releaseLabel = computed(() => releaseLabel(this.release()));
  protected readonly cardsAreR4Only = computed(() => this.release() !== 'R4');
  protected readonly listUrl = computed(
    () => `${RELEASES.find((r) => r.id === this.release())!.base}resourcelist.html`,
  );
  /** A resource's page in the chosen release's spec. */
  protected releaseSpec(name: string): string | null {
    return resourceSpecUrl(name, this.release());
  }

  /** The selected resource; null shows the welcome card. */
  protected readonly selected = signal<string | null>(null);
  protected readonly view = signal<View>('schema');
  protected readonly showAll = signal(false);
  /** Nested objects opened in the schema, by path (e.g. "item", "item.enableWhen"). */
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());
  /** Only the first group starts open; selecting a resource opens its group too. */
  protected readonly openGroups = signal<ReadonlySet<string>>(new Set([RESOURCE_GROUPS[0].id]));
  protected readonly copied = signal(false);

  private readonly card = viewChild<ElementRef<HTMLElement>>('card');
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');

  /** The selected resource's card, or null on the welcome card. */
  protected readonly current = computed<CardContent | null>(() => {
    const name = this.selected();
    const group = name ? this.groupOf(name) : undefined;
    const entry = group?.resources.find((r) => r.name === name);
    if (!name || !group || !entry) return null;
    return {
      name,
      group: group.name,
      blurb: entry.blurb,
      spec: specUrl(name),
      notes: (RESOURCE_NOTES[name] ?? []).map(noteParts),
      relations: relationLines(RESOURCE_RELATIONS[name] ?? []),
      detail: this.data.details()?.[name] ?? null,
    };
  });
  protected readonly example = EXAMPLE;
  /** Whatever card is on screen; the switches and buttons below act on it. */
  private readonly shown = computed(() => this.current() ?? EXAMPLE);

  protected readonly keyCount = computed(
    () => this.shown().detail?.schema.filter((r) => r.key).length ?? 0,
  );
  protected readonly rows = computed(() => {
    const schema = this.shown().detail?.schema ?? [];
    return this.showAll() ? schema : schema.filter((r) => r.key);
  });

  /** The sample, trimmed to the key fields unless all fields are shown. */
  protected readonly sampleJson = computed(() => {
    const d = this.shown().detail;
    if (!d) return '';
    if (this.showAll()) return JSON.stringify(d.sample, null, 2);
    const keys = d.schema.filter((r) => r.key).map((r) => r.name);
    const keep = (k: string) =>
      k === 'resourceType' ||
      k === 'id' ||
      keys.some((f) => (f.endsWith('[x]') ? k.startsWith(f.slice(0, -3)) : k === f));
    return JSON.stringify(
      Object.fromEntries(Object.entries(d.sample).filter(([k]) => keep(k))),
      null,
      2,
    );
  });

  constructor() {
    // A link to /resources#ExplanationOfBenefit selects that resource.
    const fragment = toSignal(inject(ActivatedRoute).fragment);
    effect(() => {
      const name = fragment();
      if (name && untracked(() => name !== this.selected())) {
        untracked(() => this.select(name, false));
      }
    });
  }

  private groupOf(name: string): ResourceGroup | undefined {
    return RESOURCE_GROUPS.find((g) => g.resources.some((r) => r.name === name));
  }

  /** Select a resource: a fresh card (key fields, nothing expanded), its group open. */
  protected select(name: string, fromList = true) {
    const group = this.groupOf(name);
    if (!group) return;
    this.selected.set(name);
    this.reset();
    this.openGroups.update((s) => new Set([...s, group.id]));
    // Keep the address shareable without adding a history entry for every click.
    if (fromList) this.showCard(`#${name}`);
  }

  /** Back to the welcome card. */
  protected welcome() {
    this.selected.set(null);
    this.reset();
    this.showCard('');
  }

  protected jumpToList() {
    this.list()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private reset() {
    this.showAll.set(false);
    this.expanded.set(new Set());
  }

  private showCard(hash: string) {
    history.replaceState(history.state, '', `${location.pathname}${location.search}${hash}`);
    // On phones the card sits above the list: bring it into view.
    if (matchMedia('(max-width: 900px)').matches) {
      this.card()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  protected groupToggled(id: string, event: Event) {
    const open = (event.target as HTMLDetailsElement).open;
    this.openGroups.update((s) => {
      const next = new Set(s);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  protected toggleRow(path: string) {
    this.expanded.update((s) => {
      const next = new Set(s);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  protected typeText(row: SchemaRow): string {
    if (row.sameAs) return `same as ${row.sameAs}`;
    if (row.children) return `${row.children.length} fields`;
    return row.type;
  }

  protected sentence(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  protected async copy() {
    await navigator.clipboard.writeText(this.sampleJson());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}
