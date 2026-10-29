import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Lane, Walkthrough } from '../../core/mappr/types';

/** Box and lane geometry, in SVG units: about a pixel each, since the drawing barely scales. */
const LABEL_W = 104;
const BOX_W = 176;
/**
 * Steps in different lanes overlap like a staircase: each box starts this far after the last, so
 * the arrow between them drops straight down (or up) through the overlap. Steps in the same lane
 * sit side by side, a gap apart.
 */
const STEP = 120;
const GAP = 30;
const PAD = 12;
/** Line heights for titles, body text and the result note. */
const TITLE_LINE = 19;
const LINE = 18;
const RESULT_LINE = 16;
/** Wrap widths, in characters, for the box width and each font size. */
const CHARS = 21;
const TITLE_CHARS = 17;
const RESULT_CHARS = 19;
/** The drawing may shrink this far to fit its frame; past that, the frame scrolls. */
const MIN_SCALE = 0.88;

/** Greedy word wrap for SVG text, which doesn't wrap on its own. */
function wrap(text: string, chars = CHARS): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && (line + ' ' + word).length > chars) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

interface LaneRow {
  lane: Lane;
  y: number;
  h: number;
  label: string[];
}

interface Box {
  n: number;
  x: number;
  y: number;
  h: number;
  kind: Lane['kind'];
  via: string | null;
  title: string[];
  text: string[];
  /** First baselines of the title and body text. */
  titleY: number;
  textY: number;
  result: { y: number; h: number; lines: string[] } | null;
}

/**
 * A pattern's walkthrough, drawn like the diagrams in learning/: a lane per person or system,
 * steps left to right in time, each in its lane, joined by arrows. Phones (and screen readers)
 * get the same steps as a numbered list.
 */
@Component({
  selector: 'app-walkthrough',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let l = layout();
    <figure>
      <figcaption>{{ walk().scenario }}</figcaption>
      <div class="drawing" aria-hidden="true">
        <svg
          [attr.viewBox]="'0 0 ' + l.width + ' ' + l.height"
          [attr.width]="l.width"
          [style.min-width.px]="l.width * minScale"
        >
          <defs>
            <marker
              id="mappr-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0,0 L10,5 L0,10 z" class="head" />
            </marker>
          </defs>
          @for (r of l.rows; track r.lane.id) {
            <rect
              class="band"
              [class]="r.lane.kind"
              x="0"
              [attr.y]="r.y"
              [attr.width]="l.width"
              [attr.height]="r.h"
            />
            @for (t of r.label; track $index) {
              <text
                class="lane"
                [class]="r.lane.kind"
                x="10"
                [attr.y]="r.y + r.h / 2 + ($index - (r.label.length - 1) / 2) * 18 + 5"
              >
                {{ t }}
              </text>
            }
          }
          @for (a of l.arrows; track $index) {
            <path class="arrow" [attr.d]="a" marker-end="url(#mappr-arrow)" />
          }
          @for (b of l.boxes; track b.n) {
            <rect
              class="box"
              [class]="b.kind"
              [attr.x]="b.x"
              [attr.y]="b.y"
              [attr.width]="boxW"
              [attr.height]="b.h"
              rx="8"
            />
            <text class="n" [attr.x]="b.x + boxW - 12" [attr.y]="b.y + 20">{{ b.n }}</text>
            @if (b.via) {
              <text class="via" [attr.x]="b.x + 12" [attr.y]="b.y + 20">{{ b.via }}</text>
            }
            @for (t of b.title; track $index) {
              <text class="title" [attr.x]="b.x + 12" [attr.y]="b.titleY + $index * titleLine">
                {{ t }}
              </text>
            }
            @for (t of b.text; track $index) {
              <text class="text" [attr.x]="b.x + 12" [attr.y]="b.textY + $index * line">
                {{ t }}
              </text>
            }
            @if (b.result; as res) {
              <rect
                class="result"
                [attr.x]="b.x + 8"
                [attr.y]="res.y"
                [attr.width]="boxW - 16"
                [attr.height]="res.h"
                rx="6"
              />
              @for (t of res.lines; track $index) {
                <text
                  class="result-text"
                  [attr.x]="b.x + 16"
                  [attr.y]="res.y + 18 + $index * resultLine"
                >
                  {{ t }}
                </text>
              }
            }
          }
        </svg>
      </div>
      <ol class="steps">
        @for (s of walk().steps; track $index) {
          <li>
            <span class="who">{{ laneLabel(s.lane) }}</span>
            <b>{{ s.title }}</b> {{ s.text }}
            @if (s.via) {
              <span class="via-tag">{{ s.via }}</span>
            }
            @if (s.result) {
              <span class="res">→ {{ s.result }}</span>
            }
          </li>
        }
      </ol>
      @if (walk().takeaway; as t) {
        <p class="takeaway">{{ t }}</p>
      }
    </figure>
  `,
  styleUrl: './walkthrough.scss',
})
export class WalkthroughView {
  /** A walkthrough, or one side of a contrast (no takeaway of its own). */
  readonly walk = input.required<Omit<Walkthrough, 'kind' | 'takeaway'> & { takeaway?: string }>();

  protected readonly boxW = BOX_W;
  protected readonly line = LINE;
  protected readonly titleLine = TITLE_LINE;
  protected readonly resultLine = RESULT_LINE;
  protected readonly minScale = MIN_SCALE;

  protected laneLabel(id: string): string {
    return this.walk().lanes.find((l) => l.id === id)?.label ?? id;
  }

  protected readonly layout = computed(() => {
    const w = this.walk();
    // Each step's box: where its lines go, and its height, so every lane fits its tallest box.
    const sized = w.steps.map((s) => {
      const title = wrap(s.title, TITLE_CHARS);
      const text = wrap(s.text, CHARS);
      const result = s.result ? wrap(s.result, RESULT_CHARS) : null;
      const titleY = s.via ? 42 : 24;
      const textY = titleY + (title.length - 1) * TITLE_LINE + LINE + 3;
      const body = (text.length ? textY + (text.length - 1) * LINE : titleY) + 9;
      const resultH = result ? (result.length - 1) * RESULT_LINE + 26 : 0;
      const h = body + (result ? resultH + 6 : 0) + 4;
      return { s, title, text, result, titleY, textY, body, resultH, h };
    });
    const rows: LaneRow[] = [];
    let y = 0;
    for (const lane of w.lanes) {
      const tallest = Math.max(64, ...sized.filter((z) => z.s.lane === lane.id).map((z) => z.h));
      const h = tallest + 2 * PAD + 4;
      rows.push({ lane, y, h, label: wrap(lane.label, 11) });
      y += h;
    }
    const rowOf = new Map(rows.map((r) => [r.lane.id, r]));
    let x = LABEL_W;
    const boxes: Box[] = sized.map((z, i) => {
      const r = rowOf.get(z.s.lane)!;
      const by = r.y + (r.h - z.h) / 2;
      if (i > 0) x += z.s.lane === w.steps[i - 1].lane ? BOX_W + GAP : STEP;
      return {
        n: i + 1,
        x,
        y: by,
        h: z.h,
        kind: r.lane.kind,
        via: z.s.via ?? null,
        title: z.title,
        text: z.text,
        titleY: by + z.titleY,
        textY: by + z.textY,
        result: z.result ? { y: by + z.body, h: z.resultH, lines: z.result } : null,
      };
    });
    // Each step joins the next: straight across in the same lane, otherwise straight down (or up)
    // through the middle of the two boxes' overlap. No other box reaches that far.
    const arrows: string[] = [];
    for (let i = 0; i + 1 < boxes.length; i++) {
      const a = boxes[i];
      const b = boxes[i + 1];
      if (a.y + a.h <= b.y || b.y + b.h <= a.y) {
        const x = (b.x + a.x + BOX_W) / 2;
        const down = b.y > a.y;
        arrows.push(down ? `M${x},${a.y + a.h} V${b.y - 1}` : `M${x},${a.y} V${b.y + b.h + 1}`);
      } else {
        const y = a.y + a.h / 2;
        arrows.push(`M${a.x + BOX_W},${y} H${b.x - 1}`);
      }
    }
    const width = boxes.length ? boxes[boxes.length - 1].x + BOX_W + 14 : LABEL_W;
    return { rows, boxes, arrows, width, height: y };
  });
}
