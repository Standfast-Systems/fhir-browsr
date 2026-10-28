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
import { ResourceData, type SchemaRow } from './resource-data';
import {
  RESOURCE_GROUPS,
  RESOURCE_LIST_URL,
  RESOURCE_NOTES,
  noteParts,
  specUrl,
  type ResourceGroup,
} from './resources-content';

type View = 'schema' | 'sample';

/**
 * The FHIR Resources page: the six groups of resources in one column, and a large card for the
 * selected resource. The card is a choose-your-own-adventure: the plain sentence, then its key
 * fields (Schema) or a trimmed official example (Sample), with "show all fields" and collapsed
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
  protected readonly listUrl = RESOURCE_LIST_URL;
  protected readonly specUrl = specUrl;
  protected readonly loadError = this.data.error;

  protected readonly selected = signal('Patient');
  protected readonly view = signal<View>('schema');
  protected readonly showAll = signal(false);
  /** Nested objects opened in the schema, by path (e.g. "item", "item.enableWhen"). */
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());
  protected readonly openGroups = signal<ReadonlySet<string>>(new Set());
  protected readonly copied = signal(false);

  private readonly card = viewChild<ElementRef<HTMLElement>>('card');

  protected readonly current = computed(() => {
    const name = this.selected();
    for (const group of RESOURCE_GROUPS) {
      const entry = group.resources.find((r) => r.name === name);
      if (entry) return { group, entry };
    }
    return null;
  });
  protected readonly detail = computed(() => this.data.details()?.[this.selected()] ?? null);
  protected readonly notes = computed(() => (RESOURCE_NOTES[this.selected()] ?? []).map(noteParts));

  protected readonly keyCount = computed(
    () => this.detail()?.schema.filter((r) => r.key).length ?? 0,
  );
  protected readonly rows = computed(() => {
    const schema = this.detail()?.schema ?? [];
    return this.showAll() ? schema : schema.filter((r) => r.key);
  });

  /** The official example, trimmed to the key fields unless all fields are shown. */
  protected readonly sampleJson = computed(() => {
    const d = this.detail();
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
    untracked(() => this.openGroups.set(new Set([this.groupOf(this.selected())?.id ?? ''])));
  }

  private groupOf(name: string): ResourceGroup | undefined {
    return RESOURCE_GROUPS.find((g) => g.resources.some((r) => r.name === name));
  }

  /** Select a resource: a fresh card (key fields, nothing expanded), its group open. */
  protected select(name: string, fromList = true) {
    const group = this.groupOf(name);
    if (!group) return;
    this.selected.set(name);
    this.showAll.set(false);
    this.expanded.set(new Set());
    // A link opens just its group; a click in the list keeps whatever the reader has open.
    this.openGroups.update((s) => (fromList ? new Set([...s, group.id]) : new Set([group.id])));
    if (fromList) {
      // Keep the address shareable without adding a history entry for every click.
      history.replaceState(history.state, '', `${location.pathname}${location.search}#${name}`);
      // On phones the card sits above the list: bring it into view.
      if (matchMedia('(max-width: 900px)').matches) {
        this.card()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
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
