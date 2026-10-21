import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
import { componentsForSide, realmFor, selectedComponents } from '../core/index.ts';
import type { Driver } from '../core/index.ts';
import { GuidePicker } from './guide-picker';
import { DataStore } from './data-store';
import { ProfileStore } from './profile-store';

@Component({
  selector: 'fi-profile-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
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

  protected readonly drivers = this.store.drivers;

  /** Where client/server came from, in words. */
  protected readonly actorsHint = computed(() => {
    const kb = this.kb();
    const p = this.p();
    if (!kb || !p) return '';
    const names = p.drivers
      .map((s) => kb.drivers.find((d) => d.id === s.id)?.short)
      .filter((n): n is string => !!n);
    return names.length
      ? `Set from what ${names.join(' and ')} cover${names.length === 1 ? 's' : ''}. Untick a part you're not building.`
      : 'Which parts of the exchange your system implements.';
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

  protected isOn(d: Driver): boolean {
    return !!this.p()?.drivers.some((x) => x.id === d.id);
  }

  protected activeComponents(d: Driver): string[] {
    const p = this.p();
    return p ? selectedComponents(d, p).map((c) => c.id) : [];
  }

  protected sideOf(d: Driver): string | undefined {
    return this.p()?.drivers.find((x) => x.id === d.id)?.side;
  }

  protected componentsFor(d: Driver) {
    return componentsForSide(d, this.sideOf(d));
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
