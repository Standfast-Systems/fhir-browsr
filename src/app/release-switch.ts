import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { RELEASES, RELEASE_NOTE, type ReleaseOption } from '../core/release';
import { ReleaseStore } from './release-store';

/**
 * The FHIR release switch in the shared header, read by every section. R4B and R6 show but are
 * locked: choosing one opens a note saying why (and, for R6, where to follow it). The "?" opens
 * why R4 is the default.
 */
@Component({
  selector: 'app-release-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'outside($event)',
    '(document:keydown.escape)': 'about.set(null)',
  },
  template: `
    <div class="control" role="radiogroup" aria-labelledby="release-label">
      <span id="release-label" class="label">FHIR</span>
      @for (r of releases; track r.id) {
        @if (r.locked) {
          <button
            type="button"
            role="radio"
            class="locked"
            aria-checked="false"
            aria-disabled="true"
            [attr.aria-expanded]="about() === r.id"
            aria-controls="release-about"
            [title]="r.label + ': not available here'"
            (click)="toggle(r.id)"
          >
            {{ r.label }}
          </button>
        } @else {
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="store.release() === r.id"
            [class.on]="store.release() === r.id"
            (click)="store.release.set(r.id); about.set(null)"
          >
            {{ r.label }}
          </button>
        }
      }
      <button
        type="button"
        class="why"
        aria-label="Why R4 is the default"
        [attr.aria-expanded]="about() === 'why'"
        aria-controls="release-about"
        (click)="toggle('why')"
      >
        ?
      </button>
    </div>
    <div id="release-about" class="about" role="status">
      @if (about(); as id) {
        @if (lockedOption(id); as r) {
          <p>
            {{ r.locked!.note }}
            @if (r.locked!.link; as link) {
              <a [href]="link.href" target="_blank" rel="noopener">{{ link.text }} ↗</a>
            }
          </p>
        } @else {
          <p>{{ note }} Where R5 changes something, the page says so.</p>
        }
      }
    </div>
  `,
  styleUrl: './release-switch.scss',
})
export class ReleaseSwitch {
  protected readonly store = inject(ReleaseStore);
  protected readonly releases = RELEASES;
  protected readonly note = RELEASE_NOTE;
  /** The open note: a locked release's, or why R4 is the default. */
  protected readonly about = signal<string | null>(null);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected toggle(id: string) {
    this.about.update((open) => (open === id ? null : id));
  }

  protected lockedOption(id: string): ReleaseOption | undefined {
    return RELEASES.find((r) => r.id === id && r.locked);
  }

  /** A click anywhere else closes the note. */
  protected outside(event: Event) {
    if (!this.host.nativeElement.contains(event.target as Node)) this.about.set(null);
  }
}
