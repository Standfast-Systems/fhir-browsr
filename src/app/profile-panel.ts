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
import { driverApplies, realmFor, selectedComponents } from '../core/index.ts';
import type { Driver, Role } from '../core/index.ts';
import { GuidePicker } from './guide-picker';
import { DataStore } from './data-store';
import { ProfileStore } from './profile-store';

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
  protected readonly store = inject(ProfileStore);
  protected readonly data = inject(DataStore);
  private readonly dialog = inject(MatDialog);

  protected readonly kb = this.data.kb;
  protected readonly p = this.store.profile;
  protected readonly quickDates = ['2026-10-01', '2027-01-01', '2027-10-01', '2028-01-01'];

  protected readonly drivers = computed(() => {
    const kb = this.kb();
    const p = this.p();
    if (!kb || !p) return [];
    // Only the drivers that apply where the project is; those covering the chosen role first.
    return kb.drivers
      .filter((d) => driverApplies(d, p.realm))
      .sort((a, b) => Number(b.roles.includes(p.role)) - Number(a.roles.includes(p.role)));
  });

  /**
   * Drivers that require nothing of the chosen role, with the roles they do bind. CMS-0057-F binds
   * payers; an EHR developer only gets the guides for calling payers' APIs, and should know why.
   */
  protected readonly bindsOthers = computed(() => {
    const kb = this.kb();
    const p = this.p();
    const out = new Map<string, { id: Role; label: string }[]>();
    if (!kb || !p) return out;
    for (const d of kb.drivers) {
      const binds = (role: Role) =>
        d.rules.some((r) => r.strength === 'required' && (r.roles ?? d.roles).includes(role));
      if (binds(p.role)) continue;
      const others = d.roles.filter(binds);
      if (others.length)
        out.set(
          d.id,
          others.map((id) => ({ id, label: kb.roles.find((r) => r.id === id)?.label ?? id })),
        );
    }
    return out;
  });

  /** Countries for the International choice: "no particular country" first, then by name. */
  protected readonly countries = computed(() => {
    const kb = this.kb();
    if (!kb) return [];
    const others = kb.realms
      .filter((r) => r.id !== 'us' && r.id !== 'intl')
      .sort((a, b) => a.name.localeCompare(b.name));
    const intl = kb.realms.find((r) => r.id === 'intl');
    return intl ? [intl, ...others] : others;
  });

  /** What the chosen realm adds, in words. */
  protected readonly foundation = computed(() => {
    const kb = this.kb();
    const reg = this.data.registry();
    const p = this.p();
    if (!kb || !p) return '';
    const realm = realmFor(kb, p.realm);
    const names = realm.packages.map((x) => reg?.packages[x.ig]?.title ?? x.ig).join(' and ');
    if (p.realm === 'us') return `FHIR R4 (4.0.1). ${names} is the national foundation.`;
    if (!realm.fallback) return `FHIR R4 (4.0.1). Adds ${names} as the national foundation.`;
    const why =
      p.realm === 'intl'
        ? 'No country chosen'
        : `${realm.def.name} has no usable published national base${realm.def.note ? ` (${realm.def.note})` : ''}`;
    return `FHIR R4 (4.0.1). ${why}, so ${names} are added as the international defaults.`;
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

  // "Already implemented" form: local to this panel until the user adds the entry.
  protected readonly implPkg = signal('');
  protected readonly implVersion = signal('');
  protected readonly implOptions = computed(() => {
    const m = this.store.manifest();
    const reg = this.data.registry();
    const q = this.implPkg().toLowerCase();
    if (!reg) return [];
    const inScope = (m?.igs ?? []).map((i) => i.package);
    const all = [...new Set([...inScope, ...Object.keys(reg.packages)])];
    return all.filter((n) => !q || n.toLowerCase().includes(q)).slice(0, 30);
  });
  protected readonly implVersions = computed(() => {
    const pkg = this.data.registry()?.packages[this.implPkg()];
    return pkg ? pkg.versions.map((v) => v.version) : [];
  });
  protected readonly implemented = computed(() => Object.entries(this.p()?.implemented ?? {}));

  protected addImplemented() {
    this.store.setImplemented(this.implPkg().trim(), this.implVersion().trim());
    this.implPkg.set('');
    this.implVersion.set('');
  }

  protected labels(roles: { label: string }[]): string {
    return roles.map((r) => r.label).join(' and ');
  }

  protected isOn(d: Driver): boolean {
    return !!this.p()?.drivers.some((x) => x.id === d.id);
  }

  protected activeComponents(d: Driver): string[] {
    const p = this.p();
    return p ? selectedComponents(d, p).map((c) => c.id) : [];
  }

  protected componentsFor(d: Driver) {
    const role = this.p()?.role;
    return d.components.filter((c) => !c.roles || (role && c.roles.includes(role)));
  }

  protected openPicker() {
    this.dialog.open(GuidePicker, {
      width: '920px',
      maxWidth: '96vw',
      height: '86vh',
      autoFocus: 'input',
    });
  }

  protected inForceLabel(from?: string): string {
    if (!from) return '';
    const asOf = this.p()?.asOf ?? '';
    return from > asOf ? `from ${from}` : `since ${from}`;
  }
}
