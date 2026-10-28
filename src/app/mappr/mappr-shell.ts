import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RELEASES } from '../../core/mappr/release';
import { MapprStore } from './mappr-store';

/**
 * Mappr's section: its two page links under the Matchbook header, the FHIR release control both
 * pages share, the page, and the trademark line.
 */
@Component({
  selector: 'app-mappr-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="pages" aria-label="Mappr pages">
      <ul>
        <li>
          <a routerLink="lookup" routerLinkActive="active" ariaCurrentWhenActive="page">Lookup</a>
        </li>
        <li>
          <a routerLink="patterns" routerLinkActive="active" ariaCurrentWhenActive="page"
            >Patterns</a
          >
        </li>
      </ul>
    </nav>

    <main>
      <section class="release" aria-labelledby="release-label">
        <div class="control" role="radiogroup" aria-labelledby="release-label">
          <span id="release-label" class="label">FHIR release</span>
          @for (r of releases; track r.id) {
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="store.release() === r.id"
              [class.on]="store.release() === r.id"
              (click)="store.release.set(r.id)"
            >
              {{ r.label }}
            </button>
          }
        </div>
        <p class="notice">
          Most US guides, and the federal rules behind them, are built on FHIR R4. That's why R4 is
          the default here. Where R5 changes a pattern, the pattern says so.
        </p>
      </section>

      <router-outlet />
    </main>

    <footer>
      <p>
        FHIR® is the registered trademark of HL7. This site isn't affiliated with or endorsed by
        HL7.
      </p>
    </footer>
  `,
  // The page switch, page width and footer are Browsr's; the release control is Mappr's own.
  styleUrls: ['../browsr/browsr-shell.scss', './mappr-shell.scss'],
})
export class MapprShell {
  protected readonly store = inject(MapprStore);
  protected readonly releases = RELEASES;
}
