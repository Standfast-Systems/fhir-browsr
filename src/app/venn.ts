import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { REGIONS, type RegionKey } from '../core/scope';
import type { Party } from '../core/types';
import { vennLayout } from '../core/venn';

const PARTY_TEXT: Record<Party, { name: string; hint: string }> = {
  patient: { name: 'Patient', hint: 'apps people use for their own health' },
  provider: { name: 'Provider', hint: 'EHRs, hospitals, labs, public health' },
  payer: { name: 'Payer', hint: 'health plans and insurers' },
};

// Each region is painted in its own colour (see the --mb-r-* tokens in styles.scss): the three
// primaries, the colours they mix to in the overlaps, gray in the centre and in the Other circle. Unselected
// regions are a dim wash of that colour; selected ones light up and get a white outline.
@Component({
  selector: 'app-venn',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="-252 -208 568 458" class="venn" role="group" aria-label="Guides by party">
      @for (r of layout.regions; track r.key) {
        <path
          [attr.class]="'region c-' + r.key + (selected().has(r.key) ? ' on' : '')"
          [attr.d]="r.path"
          tabindex="0"
          role="button"
          [attr.aria-pressed]="selected().has(r.key)"
          [attr.aria-label]="ariaLabel(r.key)"
          (click)="toggle.emit(r.key)"
          (keydown.enter)="toggle.emit(r.key)"
          (keydown.space)="$event.preventDefault(); toggle.emit(r.key)"
        >
          <title>{{ ariaLabel(r.key) }}</title>
        </path>
      }
      @for (c of layout.circles; track c.party) {
        <circle [attr.class]="'ring ' + c.party" [attr.cx]="c.x" [attr.cy]="c.y" [attr.r]="c.r" />
      }
      <!-- Drawn after the rings, which run along every region edge and would cover it. -->
      @for (r of layout.regions; track r.key) {
        @if (selected().has(r.key)) {
          <path class="outline" [attr.d]="r.path" />
        }
      }
      @for (r of layout.regions; track r.key) {
        <text
          [attr.class]="'count c-' + r.key + (selected().has(r.key) ? ' on' : '')"
          [attr.x]="r.label.x"
          [attr.y]="r.label.y"
          dy="0.35em"
        >
          {{ counts()[r.key] }}
        </text>
      }
      @for (l of layout.partyLabels; track l.party) {
        <g
          [attr.class]="'party ' + l.party + (partyOn()[l.party] ? ' on' : '')"
          tabindex="0"
          role="button"
          [attr.aria-pressed]="partyOn()[l.party]"
          [attr.aria-label]="
            'Every ' + text[l.party].name + ' region: ' + totals()[l.party] + ' guides'
          "
          (click)="party.emit(l.party)"
          (keydown.enter)="party.emit(l.party)"
          (keydown.space)="$event.preventDefault(); party.emit(l.party)"
        >
          <text [attr.x]="l.x" [attr.y]="l.y" [attr.text-anchor]="l.anchor">
            <tspan class="name">{{ text[l.party].name }}</tspan>
            <tspan class="total" dx="6">{{ totals()[l.party] }}</tspan>
          </text>
          <text class="hint" [attr.x]="l.x" [attr.y]="l.y + 17" [attr.text-anchor]="l.anchor">
            {{ text[l.party].hint }}
          </text>
        </g>
      }
      <!-- Other: guides no party builds to, in a small circle of its own. -->
      <circle
        [attr.class]="'region c-none' + (selected().has('none') ? ' on' : '')"
        [attr.cx]="layout.other.x"
        [attr.cy]="layout.other.y"
        [attr.r]="layout.other.r"
        tabindex="0"
        role="button"
        [attr.aria-pressed]="selected().has('none')"
        [attr.aria-label]="ariaLabel('none')"
        (click)="toggle.emit('none')"
        (keydown.enter)="toggle.emit('none')"
        (keydown.space)="$event.preventDefault(); toggle.emit('none')"
      >
        <title>{{ ariaLabel('none') }}</title>
      </circle>
      <circle
        class="ring other"
        [attr.cx]="layout.other.x"
        [attr.cy]="layout.other.y"
        [attr.r]="layout.other.r"
      />
      @if (selected().has('none')) {
        <circle
          class="outline"
          [attr.cx]="layout.other.x"
          [attr.cy]="layout.other.y"
          [attr.r]="layout.other.r"
        />
      }
      <text
        [attr.class]="'count c-none' + (selected().has('none') ? ' on' : '')"
        [attr.x]="layout.other.x"
        [attr.y]="layout.other.y"
        dy="0.35em"
      >
        {{ counts().none }}
      </text>
      <!-- The circle is the focusable control; its label is just a bigger click target. -->
      <g class="party other" aria-hidden="true" (click)="toggle.emit('none')">
        <text [attr.x]="layout.other.label.x" [attr.y]="layout.other.label.y" text-anchor="middle">
          <tspan class="name">Other</tspan>
        </text>
        <text
          class="hint"
          [attr.x]="layout.other.label.x"
          [attr.y]="layout.other.label.y + 17"
          text-anchor="middle"
        >
          trial sponsors, drug makers, FDA
        </text>
      </g>
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    .venn {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
      user-select: none;
    }
    .region {
      fill: color-mix(in srgb, var(--c) 34%, var(--mb-bg));
      stroke: none;
      cursor: pointer;
      outline: none;
      transition: fill 140ms ease;
      &:hover {
        fill: color-mix(in srgb, var(--c) 50%, var(--mb-bg));
      }
      &.on {
        fill: color-mix(in srgb, var(--c) 88%, var(--mb-bg));
        &:hover {
          fill: var(--c);
        }
      }
      &:focus-visible {
        stroke: var(--mb-text);
        stroke-width: 3;
        stroke-dasharray: 6 4;
      }
    }
    .ring {
      fill: none;
      stroke-width: 1.5;
      pointer-events: none;
      &.patient {
        stroke: var(--mb-patient);
      }
      &.provider {
        stroke: var(--mb-provider);
      }
      &.payer {
        stroke: var(--mb-payer);
      }
      &.other {
        stroke: var(--mb-r-none);
      }
    }
    .outline {
      fill: none;
      stroke: #f4f4f5;
      stroke-width: 2.5;
      stroke-linejoin: round;
      pointer-events: none;
    }
    .count {
      font-size: 26px;
      font-weight: 700;
      text-anchor: middle;
      pointer-events: none;
      // One rule everywhere: light numbers on the dim, unselected wash; dark numbers on the
      // lit, selected fill.
      fill: color-mix(in srgb, var(--c) 30%, #fff);
      &.on {
        fill: #111;
      }
    }
    .party {
      cursor: pointer;
      outline: none;
      text {
        stroke: none;
      }
      .name {
        font-size: 18px;
        font-weight: 600;
      }
      &.patient .name {
        fill: var(--mb-patient);
      }
      &.provider .name {
        fill: var(--mb-provider);
      }
      &.payer .name {
        fill: var(--mb-payer);
      }
      &.other .name {
        fill: var(--mb-r-none);
      }
      .total {
        font-size: 14px;
        font-weight: 500;
        fill: var(--mb-muted);
      }
      .hint {
        font-size: 12px;
        fill: var(--mb-muted);
      }
      &:hover .name,
      &:focus-visible .name {
        text-decoration: underline;
      }
      &.on .total {
        fill: var(--mb-text);
      }
    }
    // Too small to read once the diagram shrinks to phone width.
    @media (max-width: 520px) {
      .party .hint {
        display: none;
      }
    }
  `,
})
export class Venn {
  readonly counts = input.required<Record<RegionKey, number>>();
  readonly selected = input.required<ReadonlySet<RegionKey>>();
  readonly toggle = output<RegionKey>();
  readonly party = output<Party>();

  protected readonly layout = vennLayout();
  protected readonly text = PARTY_TEXT;

  protected readonly totals = computed(() => {
    const c = this.counts();
    const t: Record<Party, number> = { patient: 0, provider: 0, payer: 0 };
    for (const r of REGIONS) for (const p of r.parties) t[p] += c[r.key];
    return t;
  });

  /** A party label reads as selected when every region inside its circle is selected. */
  protected readonly partyOn = computed(() => {
    const sel = this.selected();
    const on = (p: Party) =>
      REGIONS.filter((r) => r.parties.includes(p)).every((r) => sel.has(r.key));
    return { patient: on('patient'), provider: on('provider'), payer: on('payer') };
  });

  protected ariaLabel(key: RegionKey): string {
    const r = REGIONS.find((x) => x.key === key)!;
    const n = this.counts()[key];
    return `${r.label}: ${n} guide${n === 1 ? '' : 's'}`;
  }
}
