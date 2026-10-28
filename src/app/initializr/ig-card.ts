import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { publishedR4 } from '../core/index.ts';
import type { ManifestIg, ManifestWarning } from '../core/index.ts';
import { DataStore } from './data-store';
import { ProfileStore } from './profile-store';
import { BASIS_LABEL, Timeline } from './timeline';

@Component({
  selector: 'fi-ig-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule, Timeline],
  template: `
    @let g = ig();
    <article class="card" [class.conflict]="!g.pin">
      <header>
        <div class="title">
          @if (g.links.home) {
            <a [href]="g.links.home" target="_blank" rel="noopener">{{ g.title }}</a>
          } @else {
            <span>{{ g.title }}</span>
          }
          <span class="npm mono">{{ g.package }}</span>
        </div>
        <div class="right">
          <span class="pill" [class]="g.strength">{{ g.strength }}</span>
          @if (g.pin) {
            <span
              class="pin"
              [class.chosen]="g.chosen"
              [matTooltip]="g.chosen ? 'Your choice' : 'Picked by Initializr for ' + asOf()"
              >{{ g.pin }}</span
            >
          } @else {
            <span class="pin none">conflict</span>
          }
          <button
            mat-icon-button
            type="button"
            class="remove"
            (click)="store.removeIg(g)"
            [matTooltip]="removeTip()"
            [attr.aria-label]="'Remove ' + g.title + ' from the scope'"
          >
            <mat-icon fontSet="material-symbols-outlined">close</mat-icon>
          </button>
        </div>
      </header>

      <div class="meta">
        @if (g.allowed.length) {
          <span class="lbl">Accepted on {{ asOf() }}</span>
          @for (v of g.allowed; track v) {
            <button
              type="button"
              class="ver mono"
              [class.is-pin]="v === g.pin"
              [attr.aria-pressed]="v === g.pin"
              (click)="store.setPin(g.package, v)"
              [matTooltip]="v === g.pin ? 'Pinned' : 'Use ' + v"
            >
              {{ v }}
            </button>
          }
        }
        @if (others().length) {
          <button type="button" class="more" [matMenuTriggerFor]="otherVersions">
            {{ g.allowed.length ? 'other version' : 'choose a version' }}
            <mat-icon fontSet="material-symbols-outlined">expand_more</mat-icon>
          </button>
          <mat-menu #otherVersions="matMenu" class="fi-version-menu">
            <p class="menu-head">
              {{ g.allowed.length ? 'Not accepted on ' + asOf() : 'Published R4 versions' }}
            </p>
            @for (v of others(); track v) {
              <button mat-menu-item type="button" (click)="store.setPin(g.package, v)">
                <span class="mono">{{ v }}</span>
                @if (v === g.pin) {
                  <mat-icon fontSet="material-symbols-outlined">check</mat-icon>
                }
              </button>
            }
          </mat-menu>
        }
        @if (g.chosen) {
          <button type="button" class="more" (click)="store.setPin(g.package, null)">
            let Initializr pick
          </button>
        }
        @if (g.actors.length) {
          <span class="sep">·</span><span class="lbl">as {{ g.actors.join(' + ') }}</span>
        }
        @if (g.groupLabel) {
          <span class="sep">·</span><span class="lbl">{{ g.groupLabel }}</span>
        }
      </div>
      @if (g.pinNote) {
        <p class="note">{{ g.pinNote }}</p>
      }
      @for (w of actions(); track $index) {
        <p class="inline-warn" [class]="'sev-' + w.severity">
          <mat-icon fontSet="material-symbols-outlined">{{
            w.severity === 'error' ? 'error' : 'warning'
          }}</mat-icon>
          <span>{{ w.title }}</span>
        </p>
      }
      @if (headsUps().length) {
        <details class="heads-up">
          <summary>
            {{ headsUps().length }} heads-up{{ headsUps().length === 1 ? '' : 's' }}
          </summary>
          <ul>
            @for (w of headsUps(); track $index) {
              <li>{{ w.title }}</li>
            }
          </ul>
        </details>
      }

      <details>
        <summary>Why, with sources</summary>
        @for (r of g.reasons; track $index) {
          <div class="reason">
            @if (r.kind === 'rule') {
              <p class="rhead">
                <span class="pill" [class]="r.strength">{{ r.strength }}</span>
                <strong>{{ r.driverName }}</strong> — {{ r.componentName }}
                <span class="faint"
                  >({{ r.actor }};
                  {{ r.status === 'upcoming' ? 'from ' + r.inForceFrom : 'in force' }})</span
                >
              </p>
              @if (r.text) {
                <p class="rtext">{{ r.text }}</p>
              }
              @if (r.cite; as c) {
                <p class="cite">
                  <a [href]="c.url" target="_blank" rel="noopener"
                    >{{ c.title }}{{ c.pin ? ' ' + c.pin : '' }}</a
                  >
                  @if (c.quote) {
                    <q>{{ c.quote }}</q>
                  }
                </p>
              }
              <fi-timeline [reason]="r" [asOf]="asOf()" />
              <ul class="windows">
                @for (w of r.windows; track $index) {
                  <li [class.active]="w.active">
                    <span class="mark">{{ w.active ? '✓' : '✗' }}</span>
                    <span class="mono v">{{ w.version }}</span>
                    <span class="basis" [class]="w.basis">{{ basis(w.basis) }}</span>
                    <span class="span faint">{{ w.from ?? '…' }} → {{ w.expires ?? '…' }}</span>
                    <a
                      [href]="w.cite.url"
                      target="_blank"
                      rel="noopener"
                      [matTooltip]="w.cite.quote ?? ''"
                      >{{ w.cite.title }}{{ w.cite.pin ? ' ' + w.cite.pin : '' }}</a
                    >
                    @if (w.note) {
                      <span class="wnote faint">{{ w.note }}</span>
                    }
                  </li>
                }
              </ul>
            } @else {
              <p class="rhead">
                <span class="pill optional">{{
                  r.kind === 'realm' ? 'foundation' : 'selected'
                }}</span>
                {{ r.text }}
              </p>
            }
          </div>
        }
        <nav class="links" aria-label="Links">
          @if (g.links.home) {
            <a [href]="g.links.home" target="_blank" rel="noopener">IG {{ g.pin }}</a>
          }
          @if (g.links.profiles) {
            <a [href]="g.links.profiles" target="_blank" rel="noopener">Artifacts</a>
          }
          @for (c of g.links.capstmts; track c.url) {
            <a [href]="c.url" target="_blank" rel="noopener">{{ c.title }}</a>
          }
          @for (t of g.links.testkits; track t.url) {
            <a [href]="t.url" target="_blank" rel="noopener">{{ t.title }}</a>
          }
          @if (g.links.chat; as chat) {
            <a [href]="chat.url" target="_blank" rel="noopener">chat.fhir.org #{{ chat.stream }}</a>
          }
          @if (g.links.history) {
            <a [href]="g.links.history" target="_blank" rel="noopener">Version history</a>
          }
        </nav>
      </details>
    </article>
  `,
  styles: `
    .card {
      border: 1px solid var(--fi-line);
      border-radius: 12px;
      background: var(--fi-panel);
      padding: 12px 14px;
    }
    .card.conflict {
      border-color: color-mix(in srgb, var(--fi-error) 60%, transparent);
    }
    header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .title {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .title a,
    .title span:first-child {
      font-weight: 600;
      font-size: 15px;
      color: var(--fi-text);
    }
    .title a:hover {
      color: var(--fi-lime);
    }
    .npm {
      color: var(--fi-faint);
      font-size: 12px;
      overflow-wrap: anywhere;
    }
    .right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 6px;
      margin-top: 8px;
      font-size: 12.5px;
    }
    .lbl {
      color: var(--fi-faint);
    }
    .sep {
      color: var(--fi-faint);
    }
    .ver {
      padding: 0 6px;
      border-radius: 4px;
      background: var(--fi-panel-3);
      color: var(--fi-muted);
      font-size: 12px;
    }
    button.ver {
      border: 1px solid transparent;
      line-height: 1.5;
      cursor: pointer;
    }
    button.ver:hover {
      border-color: var(--mat-sys-outline);
      color: var(--fi-text);
    }
    button.ver:focus-visible,
    .more:focus-visible {
      outline: 2px solid var(--fi-lime);
      outline-offset: 1px;
    }
    .ver.is-pin {
      background: color-mix(in srgb, var(--fi-lime) 22%, transparent);
      color: var(--fi-lime);
    }
    .more {
      display: inline-flex;
      align-items: center;
      padding: 0 2px;
      border: 0;
      background: none;
      color: var(--fi-lime);
      font: inherit;
      font-size: 12px;
      cursor: pointer;
    }
    .more mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .menu-head {
      margin: 4px 16px 6px;
      font-size: 12px;
      color: var(--fi-faint);
    }
    .pin.chosen {
      outline: 1px dashed var(--fi-lime);
      outline-offset: 2px;
    }
    .remove {
      --mat-icon-button-state-layer-size: 30px;
      width: 30px;
      height: 30px;
      padding: 3px;
      margin: -4px -6px -4px -2px;
      color: var(--fi-faint);
    }
    .remove:hover {
      color: var(--fi-text);
    }
    .remove mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .note {
      margin: 8px 0 0;
      font-size: 12.5px;
      color: var(--fi-muted);
      font-style: italic;
    }
    .inline-warn {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin: 6px 0 0;
      font-size: 12.5px;
    }
    .inline-warn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      margin-top: 1px;
    }
    details {
      margin-top: 10px;
    }
    .heads-up {
      margin-top: 6px;
    }
    .heads-up summary {
      color: var(--fi-faint);
    }
    .heads-up ul {
      margin: 4px 0 0;
      padding-left: 18px;
      font-size: 12.5px;
      color: var(--fi-muted);
    }
    summary {
      cursor: pointer;
      color: var(--fi-muted);
      font-size: 12.5px;
    }
    summary:hover {
      color: var(--fi-text);
    }
    .reason {
      margin: 12px 0;
      padding-top: 10px;
      border-top: 1px dashed var(--fi-line);
    }
    .rhead {
      margin: 0;
      line-height: 1.7;
    }
    .rhead .pill {
      margin-right: 6px;
    }
    .rtext {
      margin: 6px 0 0;
      color: var(--fi-muted);
      font-size: 13px;
    }
    .cite {
      margin: 6px 0 8px;
      font-size: 12.5px;
    }
    .cite q {
      display: block;
      margin-top: 4px;
      padding-left: 10px;
      border-left: 2px solid var(--fi-line);
      color: var(--fi-muted);
      quotes: none;
    }
    .windows {
      list-style: none;
      margin: 6px 0 0;
      padding: 0;
      font-size: 12px;
    }
    .windows li {
      display: flex;
      flex-wrap: wrap;
      gap: 2px 8px;
      align-items: baseline;
      padding: 2px 0;
      color: var(--fi-faint);
    }
    .windows li.active {
      color: var(--fi-text);
    }
    .mark {
      width: 12px;
    }
    .windows li.active .mark {
      color: var(--fi-lime);
    }
    .v {
      min-width: 44px;
    }
    .basis {
      font-size: 11px;
      padding: 0 6px;
      border-radius: 4px;
      background: var(--fi-panel-3);
    }
    .basis.adopted {
      color: var(--fi-basis-adopted);
    }
    .basis.program {
      color: var(--fi-basis-program);
    }
    .basis.svap {
      color: var(--fi-basis-svap);
    }
    .basis.permitted-update {
      color: var(--fi-basis-permitted-update);
    }
    .basis.recommended {
      color: var(--fi-basis-recommended);
    }
    .basis.enforcement-discretion {
      color: var(--fi-basis-enforcement-discretion);
    }
    .basis.proposed {
      color: var(--fi-basis-proposed);
    }
    .basis.profile {
      color: var(--fi-basis-profile);
    }
    .wnote {
      flex-basis: 100%;
      padding-left: 20px;
    }
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--fi-line);
      font-size: 12.5px;
    }
  `,
})
export class IgCard {
  protected readonly store = inject(ProfileStore);
  private readonly data = inject(DataStore);
  readonly ig = input.required<ManifestIg>();
  readonly allWarnings = input<ManifestWarning[]>([]);
  readonly asOf = input.required<string>();
  private readonly mine = computed(() =>
    this.allWarnings().filter((w) => w.package === this.ig().package),
  );
  /** Shown in full: what needs fixing. */
  protected readonly actions = computed(() => this.mine().filter((w) => w.action));
  /** One collapsed line; the Warnings tab has them all. */
  protected readonly headsUps = computed(() => this.mine().filter((w) => !w.action));
  /** Published R4 versions outside the accepted list, newest first. */
  protected readonly others = computed(() => {
    const g = this.ig();
    const all = publishedR4(this.data.registry()?.packages[g.package]);
    return all.filter((v) => !g.allowed.includes(v));
  });

  protected readonly removeTip = computed(() => {
    const g = this.ig();
    const by = [
      ...new Set(g.reasons.filter((r) => r.kind === 'rule').map((r) => r.driverName ?? '')),
    ].join(' and ');
    if (g.strength === 'required' && by)
      return `Remove from the scope. ${by} requires it, so the scope will flag the gap.`;
    if (g.strength === 'recommended' && by) return `Remove from the scope. ${by} recommends it.`;
    return 'Remove from the scope';
  });

  protected basis(b: string) {
    return BASIS_LABEL[b] ?? b;
  }
}
