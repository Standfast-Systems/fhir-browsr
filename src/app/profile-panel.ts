import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { selectedComponents } from '../core/index.ts';
import type { Actor, Driver, ProjectProfile, Role } from '../core/index.ts';
import { GuidePicker } from './guide-picker';
import { InitializrStore } from './store';

@Component({
  selector: 'fi-profile-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './profile-panel.html',
  styleUrl: './profile-panel.scss',
})
export class ProfilePanel {
  protected readonly store = inject(InitializrStore);
  private readonly dialog = inject(MatDialog);

  protected readonly kb = this.store.kb;
  protected readonly p = this.store.profile;
  protected readonly quickDates = ['2026-10-01', '2027-01-01', '2027-10-01', '2028-01-01'];

  protected readonly drivers = computed(() => {
    const kb = this.kb();
    const p = this.p();
    if (!kb || !p) return [];
    // Drivers that cover the chosen role first; the rest stay available.
    return [...kb.drivers].sort(
      (a, b) => Number(b.roles.includes(p.role)) - Number(a.roles.includes(p.role)),
    );
  });

  protected readonly extras = computed(() => {
    const kb = this.kb();
    const p = this.p();
    if (!kb || !p) return [];
    return (p.extras ?? []).map((npm) => ({
      npm,
      name: kb.catalog.find((g) => g.npm === npm)?.name ?? npm,
    }));
  });

  // "Already implemented" entry
  protected readonly implPkg = signal('');
  protected readonly implVersion = signal('');
  protected readonly implOptions = computed(() => {
    const m = this.store.manifest();
    const reg = this.store.registry();
    const q = this.implPkg().toLowerCase();
    if (!reg) return [];
    const inScope = (m?.igs ?? []).map((i) => i.package);
    const all = [...new Set([...inScope, ...Object.keys(reg.packages)])];
    return all.filter((n) => !q || n.toLowerCase().includes(q)).slice(0, 30);
  });
  protected readonly implVersions = computed(() => {
    const reg = this.store.registry();
    const pkg = reg?.packages[this.implPkg()];
    return pkg ? pkg.versions.map((v) => v.version) : [];
  });
  protected readonly implemented = computed(() => Object.entries(this.p()?.implemented ?? {}));

  protected setRole(role: Role) {
    const def = this.kb()?.roles.find((r) => r.id === role)?.defaultActors ?? ['server'];
    this.store.update((p) => ({ ...p, role, actors: [...def] }));
  }

  protected toggleActor(a: Actor, on: boolean) {
    this.store.update((p) => {
      const actors = on ? [...new Set([...p.actors, a])] : p.actors.filter((x) => x !== a);
      return {
        ...p,
        actors: actors.length
          ? (['server', 'client'] as Actor[]).filter((x) => actors.includes(x))
          : p.actors,
      };
    });
  }

  protected setDate(asOf: string) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(asOf)) this.store.update((p) => ({ ...p, asOf }));
  }

  protected isOn(d: Driver): boolean {
    return !!this.p()?.drivers.some((x) => x.id === d.id);
  }

  protected toggleDriver(d: Driver, on: boolean) {
    this.store.update((p) => ({
      ...p,
      drivers: on
        ? [...p.drivers.filter((x) => x.id !== d.id), { id: d.id }]
        : p.drivers.filter((x) => x.id !== d.id),
    }));
  }

  protected activeComponents(d: Driver): string[] {
    const p = this.p();
    return p ? selectedComponents(d, p).map((c) => c.id) : [];
  }

  protected componentsFor(d: Driver) {
    const role = this.p()?.role;
    return d.components.filter((c) => !c.roles || (role && c.roles.includes(role)));
  }

  protected toggleComponent(d: Driver, id: string) {
    this.store.update((p) => {
      const current = selectedComponents(d, p).map((c) => c.id);
      const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id];
      return {
        ...p,
        drivers: p.drivers.map((x) =>
          x.id === d.id ? { id: d.id, components: next.length ? next : current } : x,
        ),
      };
    });
  }

  protected openPicker() {
    this.dialog.open(GuidePicker, {
      width: '920px',
      maxWidth: '96vw',
      height: '86vh',
      autoFocus: 'input',
    });
  }

  protected removeExtra(npm: string) {
    this.store.update((p) => ({ ...p, extras: (p.extras ?? []).filter((x) => x !== npm) }));
  }

  protected addImplemented() {
    const pkg = this.implPkg().trim();
    const v = this.implVersion().trim();
    if (!pkg || !v) return;
    this.store.update((p) => ({ ...p, implemented: { ...(p.implemented ?? {}), [pkg]: v } }));
    this.implPkg.set('');
    this.implVersion.set('');
  }

  protected removeImplemented(pkg: string) {
    this.store.update((p) => {
      const impl = { ...(p.implemented ?? {}) };
      delete impl[pkg];
      return { ...p, implemented: impl };
    });
  }

  protected setName(name: string) {
    this.store.update((p: ProjectProfile) => ({ ...p, projectName: name || undefined }));
  }

  protected inForceLabel(from?: string): string {
    if (!from) return '';
    const asOf = this.p()?.asOf ?? '';
    return from > asOf ? `from ${from}` : `since ${from}`;
  }
}
