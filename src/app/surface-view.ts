import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import type { ActorSurface, MergedResource } from '../core/index.ts';

@Component({
  selector: 'fi-surface-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonToggleModule, MatSlideToggleModule],
  template: `
    @let s = current();
    <div class="bar">
      <mat-button-toggle-group
        [value]="actor()"
        (change)="actor.set($event.value)"
        aria-label="Side of the surface"
      >
        @for (x of surface(); track x.actor) {
          <mat-button-toggle [value]="x.actor"
            >{{ x.actor === 'server' ? 'What you serve' : 'What you call' }} ({{
              x.resources.length
            }})</mat-button-toggle
          >
        }
      </mat-button-toggle-group>
      <mat-slide-toggle [checked]="shallOnly()" (change)="shallOnly.set($event.checked)"
        >SHALL only</mat-slide-toggle
      >
    </div>
    @if (s) {
      <p class="from">
        {{ s.actor === 'server' ? 'As a FHIR server' : 'As a FHIR client' }}, merged from
        @for (x of s.sources; track $index; let last = $last) {
          <span class="src"
            >{{ x.title }} <span class="faint">({{ x.ig }} {{ x.version }})</span></span
          >{{ last ? '.' : ';' }}
        }
        @if (!s.sources.length) {
          <span class="faint">no CapabilityStatements.</span>
        }
      </p>
      @if (s.narrativeOnly.length) {
        <p class="narr">
          Narrative only (no machine-readable expectations for your role):
          <span class="mono">{{ s.narrativeOnly.join(', ') }}</span
          >. Read those guides' conformance pages.
        </p>
      }
      @if (s.systemOperations.length) {
        <p class="sysops">
          System operations:
          @for (o of s.systemOperations; track o.name) {
            <span class="op mono" [class]="lvl(o.level)">\${{ bare(o.name) }}</span>
          }
        </p>
      }
      <div class="table" role="table" aria-label="Resources">
        <div class="row head" role="row">
          <span role="columnheader">Resource</span><span role="columnheader">Interactions</span
          ><span role="columnheader">Search parameters</span
          ><span role="columnheader">Operations</span>
        </div>
        @for (r of rows(); track r.type) {
          <details class="row-wrap">
            <summary class="row" role="row">
              <span role="cell" class="rtype">
                <span class="lv" [class]="lvl(r.level)">{{ r.level ?? '—' }}</span>
                {{ r.type }}
              </span>
              <span role="cell">
                @for (i of filter(r.interactions); track i.code) {
                  <span class="tok" [class]="lvl(i.level)">{{ i.code }}</span>
                }
              </span>
              <span role="cell">
                @for (p of filter(r.searchParams); track p.name) {
                  <span class="tok mono" [class]="lvl(p.level)">{{ p.name }}</span>
                }
              </span>
              <span role="cell">
                @for (o of filter(r.operations); track o.name) {
                  <span class="tok mono" [class]="lvl(o.level)">\${{ bare(o.name) }}</span>
                }
              </span>
            </summary>
            <div class="detail">
              @if (r.profiles.length) {
                <p class="lbl">Profiles</p>
                <ul>
                  @for (p of r.profiles; track p.url) {
                    <li>
                      @if (p.page) {
                        <a [href]="p.page" target="_blank" rel="noopener">{{ p.title ?? p.url }}</a>
                      } @else {
                        <span class="mono">{{ p.url }}</span>
                      }
                      <span class="faint"> — {{ p.from }}</span>
                    </li>
                  }
                </ul>
              }
              @if (r.combinations.length) {
                <p class="lbl">Search combinations</p>
                <ul>
                  @for (c of r.combinations; track $index) {
                    <li>
                      <span class="tok mono" [class]="lvl(c.level)">{{
                        c.params.join(' + ')
                      }}</span>
                      <span class="faint">{{ c.level ?? '' }}</span>
                    </li>
                  }
                </ul>
              }
              <p class="lbl">Sources</p>
              <p class="faint">{{ sourcesOf(r) }}</p>
            </div>
          </details>
        }
      </div>
      <p class="legend">
        <span class="tok shall">SHALL</span><span class="tok should">SHOULD</span
        ><span class="tok may">MAY</span><span class="tok none">unstated</span>
      </p>
    } @else {
      <p class="muted">No surface yet: pick a driver, or wait for the IG data to load.</p>
    }
  `,
  styles: `
    .bar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      margin-bottom: 10px;
    }
    .from,
    .narr,
    .sysops {
      font-size: 12.5px;
      color: var(--fi-muted);
      margin: 6px 0;
    }
    .narr {
      color: var(--fi-info);
    }
    .src {
      margin-right: 4px;
    }
    .table {
      border: 1px solid var(--fi-line);
      border-radius: 10px;
      overflow: hidden;
    }
    .row {
      display: grid;
      grid-template-columns: 190px 1fr 1.6fr 1fr;
      gap: 8px;
      padding: 7px 10px;
      align-items: start;
      font-size: 12.5px;
    }
    .head {
      background: var(--fi-panel-3);
      color: var(--fi-faint);
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .row-wrap {
      border-top: 1px solid var(--fi-line);
    }
    .row-wrap > summary {
      cursor: pointer;
      list-style: none;
    }
    .row-wrap > summary::-webkit-details-marker {
      display: none;
    }
    .row-wrap > summary:hover {
      background: var(--fi-panel-2);
    }
    .row-wrap[open] > summary {
      background: var(--fi-panel-2);
    }
    .rtype {
      font-weight: 600;
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .lv {
      font-size: 10px;
      font-weight: 500;
      padding: 0 5px;
      border-radius: 3px;
      border: 1px solid var(--fi-line);
    }
    .tok {
      display: inline-block;
      margin: 0 4px 3px 0;
      padding: 0 5px;
      border-radius: 4px;
      background: var(--fi-panel-3);
      font-size: 11.5px;
    }
    .shall {
      color: var(--fi-lime);
    }
    .should {
      color: var(--fi-info);
    }
    .may {
      color: var(--fi-muted);
    }
    .none {
      color: var(--fi-faint);
    }
    .op {
      margin-right: 6px;
    }
    .detail {
      padding: 6px 12px 12px 22px;
      font-size: 12.5px;
      background: var(--fi-panel);
    }
    .detail ul {
      margin: 2px 0 8px;
      padding-left: 16px;
    }
    .lbl {
      margin: 8px 0 2px;
      color: var(--fi-faint);
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .legend {
      margin-top: 8px;
      font-size: 11.5px;
    }
    @media (max-width: 760px) {
      .row {
        grid-template-columns: 1fr;
      }
      .head {
        display: none;
      }
    }
  `,
})
export class SurfaceView {
  readonly surface = input.required<ActorSurface[]>();
  protected readonly actor = signal<'server' | 'client'>('server');
  protected readonly shallOnly = signal(false);

  protected readonly current = computed(() => {
    const all = this.surface();
    return all.find((s) => s.actor === this.actor()) ?? all[0];
  });

  protected readonly rows = computed(() => {
    const s = this.current();
    if (!s) return [];
    return this.shallOnly() ? s.resources.filter((r) => r.level === 'SHALL') : s.resources;
  });

  protected filter<T extends { level?: string }>(xs: T[]): T[] {
    return this.shallOnly() ? xs.filter((x) => x.level === 'SHALL') : xs;
  }

  protected lvl(level?: string): string {
    return level === 'SHALL'
      ? 'shall'
      : level === 'SHOULD'
        ? 'should'
        : level === 'MAY'
          ? 'may'
          : 'none';
  }

  protected bare(name: string): string {
    return name.replace(/^\$/, '');
  }

  protected sourcesOf(r: MergedResource): string {
    const from = new Set([
      ...r.profiles.map((p) => p.from),
      ...r.interactions.flatMap((i) => i.from),
      ...r.searchParams.flatMap((p) => p.from),
    ]);
    return [...from].join(', ') || '—';
  }
}
