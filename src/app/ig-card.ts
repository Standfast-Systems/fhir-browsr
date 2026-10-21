import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { ManifestIg, ManifestWarning } from '../core/index.ts';
import { BASIS_LABEL, Timeline } from './timeline';

@Component({
  selector: 'fi-ig-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatTooltipModule, Timeline],
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
            <span class="pin" [matTooltip]="'Recommended pin for ' + asOf()">{{ g.pin }}</span>
          } @else {
            <span class="pin none">conflict</span>
          }
        </div>
      </header>

      <div class="meta">
        @if (g.allowed.length) {
          <span class="lbl">Accepted on {{ asOf() }}</span>
          @for (v of g.allowed; track v) {
            <span class="ver mono" [class.is-pin]="v === g.pin">{{ v }}</span>
          }
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
      @for (w of warnings(); track $index) {
        <p class="inline-warn" [class]="'sev-' + w.severity">
          <mat-icon fontSet="material-symbols-outlined">{{
            w.severity === 'error' ? 'error' : w.severity === 'warn' ? 'warning' : 'info'
          }}</mat-icon>
          <span>{{ w.title }}</span>
        </p>
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
                  r.kind === 'implemented' ? 'implemented' : 'selected'
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
    .ver.is-pin {
      background: color-mix(in srgb, var(--fi-lime) 22%, transparent);
      color: var(--fi-lime);
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
  readonly ig = input.required<ManifestIg>();
  readonly allWarnings = input<ManifestWarning[]>([]);
  readonly asOf = input.required<string>();
  protected readonly warnings = computed(() =>
    this.allWarnings().filter((w) => w.package === this.ig().package && w.severity !== 'info'),
  );
  protected basis(b: string) {
    return BASIS_LABEL[b] ?? b;
  }
}
