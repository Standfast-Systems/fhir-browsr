import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/** Browsr's section: its two page links under the Matchbook header, the page, the trademark line. */
@Component({
  selector: 'app-browsr-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './browsr-shell.html',
  styleUrl: './browsr-shell.scss',
})
export class BrowsrShell {}
