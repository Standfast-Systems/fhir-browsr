import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Lane, Walkthrough } from '../../core/mappr/types';

/** Box and lane geometry, in SVG units. */
const LABEL_W = 118;
const COL_W = 168;
const BOX_W = 150;
const PAD = 10;
const LINE = 15;
const CHARS = 23;

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
  result: { y: number; lines: string[] } | null;
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
        <svg [attr.viewBox]="'0 0 ' + l.width + ' ' + l.height" [attr.width]="l.width">
          <defs>
            <marker
              id="mappr-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
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
                [attr.y]="r.y + r.h / 2 + ($index - (r.label.length - 1) / 2) * 16 + 5"
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
            <text class="n" [attr.x]="b.x + boxW - 10" [attr.y]="b.y + 18">{{ b.n }}</text>
            @let top = b.y + (b.via ? 36 : 20);
            @if (b.via) {
              <text class="via" [attr.x]="b.x + 10" [attr.y]="b.y + 18">{{ b.via }}</text>
            }
            @for (t of b.title; track $index) {
              <text class="title" [attr.x]="b.x + 10" [attr.y]="top + $index * line">{{ t }}</text>
            }
            @for (t of b.text; track $index) {
              <text
                class="text"
                [attr.x]="b.x + 10"
                [attr.y]="top + (b.title.length + $index) * line + 2"
              >
                {{ t }}
              </text>
            }
            @if (b.result; as res) {
              <rect
                class="result"
                [attr.x]="b.x + 8"
                [attr.y]="res.y"
                [attr.width]="boxW - 16"
                [attr.height]="res.lines.length * line + 10"
                rx="6"
              />
              @for (t of res.lines; track $index) {
                <text class="result-text" [attr.x]="b.x + 16" [attr.y]="res.y + 17 + $index * line">
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

  protected laneLabel(id: string): string {
    return this.walk().lanes.find((l) => l.id === id)?.label ?? id;
  }

  protected readonly layout = computed(() => {
    const w = this.walk();
    // Each step's box height, so every lane is tall enough for its tallest box.
    const sized = w.steps.map((s) => {
      const title = wrap(s.title, 20);
      const text = wrap(s.text);
      const result = s.result ? wrap(s.result, 20) : null;
      const body = (s.via ? 36 : 20) + (title.length + text.length) * LINE + 4;
      const h = body + (result ? result.length * LINE + 18 : 0) + PAD;
      return { s, title, text, result, body, h };
    });
    const rows: LaneRow[] = [];
    let y = 0;
    for (const lane of w.lanes) {
      const tallest = Math.max(60, ...sized.filter((z) => z.s.lane === lane.id).map((z) => z.h));
      const h = tallest + 2 * PAD + 4;
      rows.push({ lane, y, h, label: wrap(lane.label, 13) });
      y += h;
    }
    const rowOf = new Map(rows.map((r) => [r.lane.id, r]));
    const boxes: Box[] = sized.map((z, i) => {
      const r = rowOf.get(z.s.lane)!;
      const by = r.y + (r.h - z.h) / 2;
      return {
        n: i + 1,
        x: LABEL_W + i * COL_W,
        y: by,
        h: z.h,
        kind: r.lane.kind,
        via: z.s.via ?? null,
        title: z.title,
        text: z.text,
        result: z.result ? { y: by + z.body, lines: z.result } : null,
      };
    });
    // Each step joins the next: straight across in the same lane, otherwise an elbow through the
    // gap between columns.
    const arrows: string[] = [];
    for (let i = 0; i + 1 < boxes.length; i++) {
      const a = boxes[i];
      const b = boxes[i + 1];
      const ay = a.y + Math.min(a.h / 2, 40);
      const by = b.y + Math.min(b.h / 2, 40);
      const x1 = a.x + BOX_W;
      const x2 = b.x - 2;
      const mid = (x1 + x2) / 2;
      arrows.push(
        Math.abs(ay - by) < 1
          ? `M${x1},${ay} L${x2},${by}`
          : `M${x1},${ay} L${mid},${ay} L${mid},${by} L${x2},${by}`,
      );
    }
    const width = LABEL_W + boxes.length * COL_W;
    return { rows, boxes, arrows, width, height: y };
  });
}
