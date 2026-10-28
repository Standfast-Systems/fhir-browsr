import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Reason } from '../core/index.ts';

interface Row {
  version: string;
  segments: { x: number; w: number; basis: string; openEnd: boolean; label: string }[];
  accepted: boolean;
}

const BASIS_LABEL: Record<string, string> = {
  adopted: 'adopted in regulation',
  program: 'named in program rules',
  svap: 'SVAP-approved',
  recommended: 'agency-recommended',
  'enforcement-discretion': 'enforcement discretion',
  'permitted-update': 'permitted updated version',
  proposed: 'proposed rule only',
  profile: 'profile choice',
};

/** Version windows for one reason, drawn on a year axis with the target date marked. */
@Component({
  selector: 'fi-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let v = view();
    <svg
      [attr.viewBox]="'0 0 ' + W + ' ' + v.height"
      class="tl"
      role="img"
      [attr.aria-label]="v.aria"
    >
      @for (t of v.ticks; track t.year) {
        <line [attr.x1]="t.x" [attr.x2]="t.x" y1="14" [attr.y2]="v.height - 4" class="grid" />
        <text [attr.x]="t.x + 3" y="10" class="tick">{{ t.year }}</text>
      }
      @for (r of v.rows; track r.version; let i = $index) {
        <text x="0" [attr.y]="26 + i * 20 + 9" class="ver" [class.on]="r.accepted">
          {{ r.version }}
        </text>
        @for (s of r.segments; track $index) {
          <rect
            [attr.x]="s.x"
            [attr.y]="26 + i * 20"
            [attr.width]="s.w"
            height="12"
            rx="3"
            [attr.class]="'bar ' + s.basis + (s.openEnd ? ' open' : '')"
          >
            <title>{{ s.label }}</title>
          </rect>
        }
      }
      @if (v.inForce !== null) {
        <line
          [attr.x1]="v.inForce"
          [attr.x2]="v.inForce"
          y1="16"
          [attr.y2]="v.height - 2"
          class="inforce"
        />
      }
      <line [attr.x1]="v.target" [attr.x2]="v.target" y1="14" [attr.y2]="v.height" class="target" />
      <text [attr.x]="v.target + 4" [attr.y]="v.height - 4" class="tlabel">target</text>
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    .tl {
      width: 100%;
      height: auto;
      font-family: var(--fi-mono);
    }
    .grid {
      stroke: var(--fi-line);
      stroke-width: 1;
    }
    .tick {
      fill: var(--fi-faint);
      font-size: 9px;
    }
    .ver {
      fill: var(--fi-faint);
      font-size: 10px;
    }
    .ver.on {
      fill: var(--fi-text);
      font-weight: 600;
    }
    .bar {
      opacity: 0.9;
    }
    .bar.adopted {
      fill: var(--fi-basis-adopted);
    }
    .bar.program {
      fill: var(--fi-basis-program);
    }
    .bar.svap {
      fill: var(--fi-basis-svap);
    }
    .bar.permitted-update {
      fill: var(--fi-basis-permitted-update);
    }
    .bar.recommended {
      fill: var(--fi-basis-recommended);
    }
    .bar.enforcement-discretion {
      fill: var(--fi-basis-enforcement-discretion);
    }
    .bar.profile {
      fill: var(--fi-basis-profile);
    }
    .bar.proposed {
      fill: transparent;
      stroke: var(--fi-basis-proposed);
      stroke-dasharray: 3 2;
    }
    .target {
      stroke: #fff;
      stroke-width: 1.5;
    }
    .tlabel {
      fill: #fff;
      font-size: 9px;
    }
    .inforce {
      stroke: var(--fi-warn);
      stroke-width: 1;
      stroke-dasharray: 2 2;
    }
  `,
})
export class Timeline {
  readonly reason = input.required<Reason>();
  readonly asOf = input.required<string>();
  protected readonly W = 560;

  protected readonly view = computed(() => {
    const r = this.reason();
    const asOf = this.asOf();
    const dates = [
      asOf,
      ...r.windows.flatMap((w) => [w.from, w.expires]).filter((d): d is string => !!d),
    ];
    const years = dates.map((d) => Number(d.slice(0, 4)));
    const y0 = Math.max(2019, Math.min(...years) - 1);
    const y1 = Math.max(...years) + 2;
    const left = 58;
    const right = this.W - 6;
    const t = (d: string) => {
      const [y, m, day] = d.split('-').map(Number);
      const v = y + (m - 1) / 12 + (day - 1) / 365;
      return left + ((v - y0) / (y1 - y0)) * (right - left);
    };
    const versions = [...new Set(r.windows.map((w) => w.version))];
    const rows: Row[] = versions.map((version) => ({
      version,
      accepted: r.accepts.includes(version),
      segments: r.windows
        .filter((w) => w.version === version)
        .map((w) => {
          const x = w.from ? t(w.from) : left;
          const end = w.expires ? t(w.expires) : right;
          return {
            x,
            w: Math.max(3, end - x),
            basis: w.basis,
            openEnd: !w.expires,
            label: `${version}: ${BASIS_LABEL[w.basis] ?? w.basis}, ${w.from ?? 'open'} → ${w.expires ? `${w.expires} (exclusive)` : 'open'}`,
          };
        }),
    }));
    const ticks = [];
    for (let y = y0; y <= y1; y++) ticks.push({ year: y, x: t(`${y}-01-01`) });
    return {
      rows,
      ticks,
      target: t(asOf),
      inForce: r.inForceFrom && r.inForceFrom > `${y0}-01-01` ? t(r.inForceFrom) : null,
      height: 30 + rows.length * 20 + 10,
      aria: `Version windows: ${rows.map((x) => `${x.version}${x.accepted ? ' (accepted)' : ''}`).join(', ')}`,
    };
  });
}

export { BASIS_LABEL };
