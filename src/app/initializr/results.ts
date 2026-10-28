import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { ManifestIg, ManifestWarning, ResolvedCitation } from '../core/index.ts';
import { FilesView } from './files-view';
import { IgCard } from './ig-card';
import { DataStore } from './data-store';
import { ProfileStore } from './profile-store';
import { SurfaceView } from './surface-view';

@Component({
  selector: 'fi-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTooltipModule,
    IgCard,
    SurfaceView,
    FilesView,
  ],
  templateUrl: './results.html',
  styleUrl: './results.scss',
})
export class Results {
  protected readonly store = inject(ProfileStore);
  protected readonly data = inject(DataStore);
  protected readonly m = this.store.manifest;
  protected readonly tab = signal(0);

  protected readonly groups = computed(() => {
    const m = this.m();
    if (!m) return [];
    const by = (pred: (i: ManifestIg) => boolean) => m.igs.filter(pred);
    const ruled = (i: ManifestIg) => i.reasons.some((r) => r.kind === 'rule');
    return [
      {
        id: 'required',
        title: 'Required',
        hint: 'A regulation in scope requires these.',
        igs: by((i) => ruled(i) && i.strength === 'required'),
      },
      {
        id: 'recommended',
        title: 'Recommended',
        hint: 'Agency-recommended, or the profile you chose names them.',
        igs: by((i) => ruled(i) && i.strength === 'recommended'),
      },
      {
        id: 'optional',
        title: 'Optional',
        hint: 'Useful for this project; nothing requires them.',
        igs: by((i) => ruled(i) && i.strength === 'optional'),
      },
      {
        id: 'realm',
        title: `Foundation for ${m.realm.id === 'intl' ? 'international projects' : m.realm.name}`,
        hint: m.realm.fallback
          ? m.realm.id === 'intl'
            ? 'No country chosen, so the international defaults apply.'
            : `${m.realm.name} has no usable published national base, so the international defaults apply.`
          : 'The national foundation every project here starts from.',
        igs: by((i) => !ruled(i) && i.reasons.some((r) => r.kind === 'realm')),
      },
      {
        id: 'selected',
        title: 'Added by you',
        hint: 'Guides you picked or already implement.',
        igs: by((i) => !ruled(i) && !i.reasons.some((r) => r.kind === 'realm')),
      },
    ].filter((g) => g.igs.length);
  });

  protected readonly counts = computed(() => {
    const w = this.m()?.warnings ?? [];
    return {
      action: w.filter((x) => x.action).length,
      headsUp: w.filter((x) => !x.action).length,
    };
  });

  /** "Needs action" always shows, empty or not; heads-ups follow. */
  protected readonly warningGroups = computed(() => {
    const w = this.m()?.warnings ?? [];
    return [
      { id: 'action', title: 'Needs action', items: w.filter((x) => x.action) },
      { id: 'heads-up', title: 'Heads-ups', items: w.filter((x) => !x.action) },
    ];
  });

  protected readonly multi = computed(() => {
    const deps = this.m()?.dependencies ?? [];
    const n = new Map<string, number>();
    for (const d of deps) n.set(d.name, (n.get(d.name) ?? 0) + 1);
    return n;
  });

  protected readonly sources = computed(() => {
    const m = this.m();
    const kb = this.data.kb();
    if (!m || !kb) return [];
    const seen = new Map<string, ResolvedCitation>();
    const add = (c?: ResolvedCitation) => {
      if (c && !seen.has(c.title)) seen.set(c.title, c);
    };
    for (const ig of m.igs)
      for (const r of ig.reasons) {
        add(r.cite);
        r.windows.forEach((w) => add(w.cite));
      }
    for (const w of m.warnings) w.cites.forEach(add);
    const byTitle = new Map(Object.values(kb.sources).map((s) => [s.title, s]));
    return [...seen.values()]
      .map((c) => ({ c, s: byTitle.get(c.title) }))
      .sort(
        (a, b) =>
          (a.s?.kind ?? '').localeCompare(b.s?.kind ?? '') || a.c.title.localeCompare(b.c.title),
      );
  });

  protected icon(w: ManifestWarning): string {
    return w.severity === 'error' ? 'error' : w.severity === 'warn' ? 'warning' : 'info';
  }

  protected kindLabel(k: string): string {
    return k.replace(/-/g, ' ');
  }
}
