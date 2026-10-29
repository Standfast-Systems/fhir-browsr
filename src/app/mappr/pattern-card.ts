import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TYPES } from '../../core/mappr/library';
import { isR5OrLater, resourceAlso, resourceIn, resourceSpecUrl } from '../../core/release';
import type { Pattern, StackGuide } from '../../core/mappr/types';
import { MapprStore } from './mappr-store';
import { WalkthroughView } from './walkthrough';

/**
 * One pattern in full: what it's for, its stack in plain words, the drawing, and where to read
 * next. Spec links follow the release control; version pins and required vs. optional stay in
 * Initializr.
 */
@Component({
  selector: 'app-pattern-card',
  imports: [WalkthroughView, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pattern-card.html',
  styleUrl: './pattern-card.scss',
})
export class PatternCard {
  readonly pattern = input.required<Pattern>();
  protected readonly store = inject(MapprStore);

  protected readonly typeLabel = computed(() => {
    const p = this.pattern();
    const t = TYPES.find((x) => x.id === p.type)!.label.replace(/s$/, '');
    return p.kind === 'gap' ? `${t} · gap` : t;
  });

  /** The stack's levels that have guides, with each guide's name and page. */
  protected readonly levels = computed(() => {
    const s = this.pattern().stack;
    if (!s) return [];
    const guides = this.store.data()?.guides ?? {};
    const level = (label: string, items: StackGuide[] | undefined) => ({
      label,
      items: (items ?? []).map((i) => ({ ...i, g: guides[i.guide] })),
    });
    return [
      level('How it moves', s.moves),
      level('What it carries', s.carries),
      level("What it's built on", s.builtOn),
    ].filter((l) => l.items.length);
  });

  /** Guides named outside a stack (contrasts and other types). */
  protected readonly others = computed(() => {
    const guides = this.store.data()?.guides ?? {};
    return (this.pattern().guides ?? []).map((id) => guides[id]).filter(Boolean);
  });

  protected readonly resources = computed(() => {
    const release = this.store.release();
    const known = this.store.data()?.resources ?? {};
    return this.pattern().resources.map((name) => ({
      name,
      here: resourceIn(name, release),
      url: resourceSpecUrl(name, release),
      also: resourceAlso(name, release),
      /** Browsr's FHIR Resources page has an entry for it. */
      inBrowsr: !!known[name],
    }));
  });

  protected readonly showR5 = computed(
    () => !!this.pattern().inR5 && isR5OrLater(this.store.release()),
  );
}
