import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { isR4, publishedR4, r4PackageFor } from '../core/index.ts';
import type { CatalogGuide } from '../core/index.ts';
import { DataStore } from './data-store';
import { ProfileStore } from './profile-store';

interface Section {
  id: string;
  title: string;
  hint?: string;
  groups: { id: string; label: string; guides: GuideRow[] }[];
}

interface GuideRow {
  guide: CatalogGuide;
  status: string;
  statusKind: 'ok' | 'warn' | 'bad';
  inScope: boolean;
}

/** Workflow groups arranged by the spec's question "Who do you exchange data with?". */
const AUDIENCES: { title: string; groups: string[] }[] = [
  { title: 'Patients', groups: ['wf-patient-access', 'wf-portable'] },
  { title: 'Payers', groups: ['wf-prior-auth', 'wf-payer-exchange', 'wf-payments-value'] },
  { title: 'Other providers', groups: ['wf-care-coord', 'wf-orders', 'wf-doc-sharing'] },
  {
    title: 'Government & programs',
    groups: ['wf-public-health', 'wf-vital-records', 'wf-quality', 'wf-regulatory', 'wf-who-smart'],
  },
  { title: 'Supporting services', groups: ['wf-cds', 'wf-research', 'wf-directories'] },
];

@Component({
  selector: 'fi-guide-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title>Add guides</h2>
    <mat-dialog-content class="content">
      <div class="bar">
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="search">
          <mat-icon matPrefix fontSet="material-symbols-outlined">search</mat-icon>
          <mat-label>Search {{ total() }} US and universal guides</mat-label>
          <input
            matInput
            [ngModel]="q()"
            (ngModelChange)="q.set($event)"
            placeholder="e.g. questionnaire, eCR, oncology, ihe.iti"
          />
        </mat-form-field>
        <mat-slide-toggle [checked]="showHidden()" (change)="showHidden.set($event.checked)"
          >Show legacy &amp; non-FHIR</mat-slide-toggle
        >
        @if (international()) {
          <mat-slide-toggle [checked]="showUs()" (change)="showUs.set($event.checked)"
            >Show US-realm guides</mat-slide-toggle
          >
        }
      </div>
      @if (international() && !showUs()) {
        <p class="hint">
          Showing universal-realm guides. US-realm guides are hidden for a project outside the US.
        </p>
      }
      @for (s of sections(); track s.id) {
        <section class="section">
          <h3>{{ s.title }}</h3>
          @if (s.hint) {
            <p class="hint">{{ s.hint }}</p>
          }
          @for (g of s.groups; track g.id) {
            <div class="group">
              <h4>{{ g.label }}</h4>
              <ul>
                @for (r of g.guides; track r.guide.npm) {
                  <li [class.scope]="r.inScope">
                    <mat-checkbox
                      [checked]="r.inScope || selected().has(r.guide.npm)"
                      [disabled]="r.inScope"
                      (change)="toggle(r.guide.npm, $event.checked)"
                    >
                      <span class="gname">{{ r.guide.name }}</span>
                    </mat-checkbox>
                    <span class="npm mono">{{ r.guide.npm }}</span>
                    <span class="status" [class]="r.statusKind">{{ r.status }}</span>
                    @if (r.guide.blurb) {
                      <span class="blurb">{{ r.guide.blurb }}</span>
                    }
                    @if (r.guide.verify) {
                      <mat-icon
                        class="verify"
                        fontSet="material-symbols-outlined"
                        [matTooltip]="'Under review: ' + r.guide.verify"
                        >help</mat-icon
                      >
                    }
                  </li>
                }
              </ul>
            </div>
          }
        </section>
      } @empty {
        <p class="muted">No guides match "{{ q() }}".</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <span class="count muted">{{ selected().size }} added</span>
      <button mat-flat-button mat-dialog-close>Done</button>
    </mat-dialog-actions>
  `,
  styles: `
    .content {
      padding-top: 4px !important;
    }
    .bar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--mat-sys-surface-container-high);
      padding: 8px 0;
    }
    .search {
      flex: 1 1 320px;
    }
    .section {
      margin-top: 14px;
    }
    h3 {
      margin: 0 0 4px;
      font-size: 13px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--fi-lime);
    }
    .hint {
      margin: 0 0 8px;
      color: var(--fi-faint);
      font-size: 12.5px;
    }
    .group {
      margin: 6px 0 10px;
    }
    h4 {
      margin: 8px 0 2px;
      font-size: 13px;
      font-weight: 600;
      color: var(--fi-muted);
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    li {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 2px 10px;
      padding: 1px 0;
      border-bottom: 1px solid color-mix(in srgb, var(--fi-line) 60%, transparent);
    }
    li.scope .gname {
      color: var(--fi-muted);
    }
    .gname {
      font-size: 13.5px;
    }
    .npm {
      color: var(--fi-faint);
      font-size: 11.5px;
    }
    .blurb {
      flex-basis: 100%;
      margin: -2px 0 4px 40px;
      font-size: 12px;
      color: var(--fi-muted);
    }
    .status {
      margin-left: auto;
      font-size: 11.5px;
      font-family: var(--fi-mono);
    }
    .status.ok {
      color: var(--fi-muted);
    }
    .status.warn {
      color: var(--fi-warn);
    }
    .status.bad {
      color: var(--fi-error);
    }
    .verify {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--fi-info);
    }
    .count {
      margin-right: auto;
      padding-left: 8px;
    }
  `,
})
export class GuidePicker {
  private readonly data = inject(DataStore);
  private readonly store = inject(ProfileStore);
  protected readonly q = signal('');
  protected readonly showHidden = signal(false);
  protected readonly showUs = signal(false);
  protected readonly international = computed(() => (this.store.profile()?.realm ?? 'us') !== 'us');
  protected readonly selected = computed(() => new Set(this.store.profile()?.extras ?? []));
  protected readonly total = computed(() => this.data.kb()?.catalog.length ?? 0);

  private readonly rows = computed(() => {
    const kb = this.data.kb();
    const reg = this.data.registry();
    const m = this.store.manifest();
    if (!kb || !reg) return new Map<string, GuideRow>();
    const inScope = new Set(
      (m?.igs ?? []).filter((i) => i.reasons.some((r) => r.kind === 'rule')).map((i) => i.package),
    );
    const out = new Map<string, GuideRow>();
    for (const g of kb.catalog) {
      const name = r4PackageFor(reg, g.npm);
      const pkg = reg.packages[name];
      const r4 = publishedR4(pkg);
      let status: string;
      let statusKind: GuideRow['statusKind'] = 'ok';
      if (!reg.packages[g.npm]?.inRegistry && !pkg?.inRegistry) {
        status = 'not on packages.fhir.org';
        statusKind = 'bad';
      } else if (r4.length) {
        status = name !== g.npm ? `R4 edition ${r4[0]}` : r4[0];
      } else if (pkg?.versions.some((v) => v.fhir.some(isR4))) {
        status = 'ballot / draft only';
        statusKind = 'warn';
      } else {
        const fhir = pkg?.versions[0]?.fhir.join(', ');
        status = fhir ? `FHIR ${fhir} only` : 'no R4 release';
        statusKind = 'warn';
      }
      out.set(g.npm, {
        guide: g,
        status,
        statusKind,
        inScope: inScope.has(g.npm) || inScope.has(name),
      });
    }
    return out;
  });

  protected readonly sections = computed<Section[]>(() => {
    const kb = this.data.kb();
    if (!kb) return [];
    const q = this.q().trim().toLowerCase();
    const rows = this.rows();
    const reg = this.data.registry();
    const realmOk = (g: CatalogGuide) => !this.international() || this.showUs() || g.realm !== 'us';
    const match = (g: CatalogGuide) =>
      realmOk(g) &&
      (!q ||
        [
          g.name,
          g.registryName,
          g.blurb,
          g.npm,
          kb.groups[g.group]?.label,
          g.registry_category,
          reg?.packages[g.npm]?.description,
        ].some((s) => s?.toLowerCase().includes(q)));
    const group = (id: string) => ({
      id,
      label: kb.groups[id]?.label ?? id,
      guides: kb.catalog
        .filter((g) => g.group === id && match(g))
        .map((g) => rows.get(g.npm)!)
        .filter(Boolean)
        .sort((a, b) => a.guide.name.localeCompare(b.guide.name)),
    });
    const byLayer = (layer: string) =>
      Object.entries(kb.groups)
        .filter(([, g]) => g.layer === layer)
        .map(([id]) => group(id));
    const sections: Section[] = AUDIENCES.map((a) => ({
      id: a.title,
      title: `Exchange with ${a.title.toLowerCase()}`,
      groups: a.groups.map(group),
    }));
    sections.push(
      {
        id: 'cap',
        title: 'Capabilities your system needs',
        hint: 'Cross-cutting plumbing: auth, identity, consent, audit, notifications, bulk, forms, terminology, bridging legacy formats.',
        groups: byLayer('capability'),
      },
      { id: 'ct', title: 'Clinical domain content packs', groups: byLayer('content') },
      {
        id: 'auto',
        title: 'Foundation & shared libraries',
        hint: 'Usually pulled in automatically as dependencies; add one only if you build on it directly.',
        groups: byLayer('auto'),
      },
    );
    if (this.showHidden())
      sections.push({
        id: 'hidden',
        title: 'Legacy, non-FHIR and tooling',
        groups: byLayer('hidden'),
      });
    return sections
      .map((s) => ({ ...s, groups: s.groups.filter((g) => g.guides.length) }))
      .filter((s) => s.groups.length);
  });

  protected toggle(npm: string, on: boolean) {
    this.store.setExtra(npm, on);
  }
}
