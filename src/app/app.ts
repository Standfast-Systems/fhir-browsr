import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EMITTERS } from '../core/index.ts';
import { ProfilePanel } from './profile-panel';
import { Results } from './results';
import { InitializrStore } from './store';
import { download, zip } from './zip';

export const REPO_URL = 'https://github.com/Standfast-Systems/fhir-initializr';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatTooltipModule,
    ProfilePanel,
    Results,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly store = inject(InitializrStore);
  private readonly snack = inject(MatSnackBar);
  protected readonly repo = REPO_URL;

  protected readonly cli = computed(() => {
    const p = this.store.profile();
    if (!p) return '';
    const parts = ['initializr scope', `--role ${p.role}`];
    for (const d of p.drivers)
      parts.push(`--driver ${d.id}${d.components?.length ? ':' + d.components.join('+') : ''}`);
    parts.push(`--as-of ${p.asOf}`);
    for (const a of p.actors) parts.push(`--actor ${a}`);
    for (const e of p.extras ?? []) parts.push(`--extra ${e}`);
    for (const [k, v] of Object.entries(p.implemented ?? {})) parts.push(`--implemented ${k}@${v}`);
    return parts.join(' ');
  });

  protected downloadAll() {
    const m = this.store.manifest();
    const reg = this.store.registry();
    if (!m || !reg) return;
    const slug =
      (m.profile.projectName || 'fhir-scope')
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, '-')
        .replace(/^-|-$/g, '') || 'fhir-scope';
    const files = EMITTERS.map((e) => ({ name: `${slug}/${e.filename}`, text: e.emit(m, reg) }));
    download(`${slug}-${m.profile.asOf}.zip`, zip(files));
  }

  protected async copyLink() {
    await navigator.clipboard.writeText(location.href);
    this.snack.open('Share link copied', undefined, { duration: 1800 });
  }

  protected async copyCli() {
    await navigator.clipboard.writeText(this.cli());
    this.snack.open('CLI command copied', undefined, { duration: 1800 });
  }
}
