import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * Mappr's section: its two page links under the Matchbook header, the page, and the trademark
 * line. The FHIR release is the header's, shared by every section.
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
      <router-outlet />
    </main>

    <footer>
      <p>
        FHIR® is the registered trademark of HL7. This site isn't affiliated with or endorsed by
        HL7.
      </p>
    </footer>
  `,
  // The page switch, page width and footer are Browsr's.
  styleUrl: '../browsr/browsr-shell.scss',
})
export class MapprShell {}
