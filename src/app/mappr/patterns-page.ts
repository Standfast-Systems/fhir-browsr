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
import { ActivatedRoute } from '@angular/router';
import { shelves } from '../../core/mappr/library';
import type { Pattern } from '../../core/mappr/types';
import { PatternCard } from './pattern-card';
import { MapprStore } from './mappr-store';

/**
 * Mappr's Patterns page: the curated library by type, and the selected pattern in a card beside
 * it. Each pattern has an anchor by its id (/mappr/patterns#prior-auth); without one, the page
 * opens on the first workflow.
 */
@Component({
  selector: 'app-patterns-page',
  imports: [PatternCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h1>Patterns</h1>
      <p class="intro">
        Hand-built maps of how guides and resources fit together, by the question they answer.
      </p>

      @if (store.error(); as err) {
        <p class="error" role="alert">{{ err }}</p>
      }
      @if (store.data()) {
        <div class="layout">
          <nav class="library" aria-label="Pattern library">
            @for (s of shelves(); track s.type.id) {
              <section class="shelf">
                <h2>{{ s.type.label }}</h2>
                <p class="answers">{{ s.type.answers }}</p>
                @for (g of s.groups; track $index) {
                  @if (g.label && g.patterns.length) {
                    <h3>{{ g.label }}</h3>
                  }
                  @if (g.patterns.length) {
                    <ul>
                      @for (p of g.patterns; track p.id) {
                        <li>
                          <a
                            [href]="'mappr/patterns#' + p.id"
                            [class.on]="selected()?.id === p.id"
                            [attr.aria-current]="selected()?.id === p.id ? 'true' : null"
                            (click)="go($event, p.id)"
                            >{{ p.title }}</a
                          >
                        </li>
                      }
                    </ul>
                  } @else if (!g.label) {
                    <p class="none">None yet.</p>
                  }
                }
              </section>
            }
          </nav>
          @if (selected(); as p) {
            <app-pattern-card #card [pattern]="p" />
          }
        </div>
      }
    </section>
  `,
  styleUrl: './patterns-page.scss',
})
export class PatternsPage {
  protected readonly store = inject(MapprStore);
  private readonly card = viewChild('card', { read: ElementRef });
  private readonly picked = signal<string | null>(null);

  protected readonly shelves = computed(() => shelves(this.store.data()?.patterns ?? []));

  protected readonly selected = computed((): Pattern | null => {
    const patterns = this.store.data()?.patterns ?? [];
    return (
      patterns.find((p) => p.id === this.picked()) ??
      this.shelves()[0]?.groups[0]?.patterns[0] ??
      patterns[0] ??
      null
    );
  });

  constructor() {
    // A link to /mappr/patterns#prior-auth selects that pattern.
    const fragment = toSignal(inject(ActivatedRoute).fragment);
    effect(() => {
      const id = fragment();
      if (id) untracked(() => this.picked.set(id));
    });
  }

  /** Select in place; the address carries the pattern's anchor without a new history entry. */
  protected go(e: MouseEvent, id: string) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    this.picked.set(id);
    history.replaceState(history.state, '', `${location.pathname}${location.search}#${id}`);
    // On phones the card sits below the list: bring it into view.
    if (matchMedia('(max-width: 900px)').matches) {
      this.card()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
