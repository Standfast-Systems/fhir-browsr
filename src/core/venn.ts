// Geometry for the three-circle diagram: one closed SVG path per region, so every region is its
// own hit target (hover, click, focus) with no clip-path or mask tricks.
import type { RegionKey } from './scope.ts';
import type { Party } from './types.ts';

export interface Pt {
  x: number;
  y: number;
}

export interface Circle extends Pt {
  party: Party;
  r: number;
}

export interface RegionShape {
  key: Exclude<RegionKey, 'none'>;
  path: string;
  label: Pt;
}

export interface PartyLabel extends Pt {
  party: Party;
  anchor: 'start' | 'middle' | 'end';
}

export interface VennLayout {
  circles: Circle[];
  regions: RegionShape[];
  partyLabels: PartyLabel[];
}

const f = (n: number) => +n.toFixed(2);
export const inside = (c: Circle, p: Pt) => Math.hypot(p.x - c.x, p.y - c.y) < c.r - 1e-6;

function intersections(a: Circle, b: Circle): [Pt, Pt] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const l = (a.r * a.r - b.r * b.r + d * d) / (2 * d);
  const h = Math.sqrt(a.r * a.r - l * l);
  const mx = a.x + (dx * l) / d;
  const my = a.y + (dy * l) / d;
  return [
    { x: mx + (h * dy) / d, y: my - (h * dx) / d },
    { x: mx - (h * dy) / d, y: my + (h * dx) / d },
  ];
}

/** The arc of `c` from `from` to `to` whose midpoint satisfies `want`. */
function arc(c: Circle, from: Pt, to: Pt, want: (p: Pt) => boolean): string {
  const a0 = Math.atan2(from.y - c.y, from.x - c.x);
  const a1 = Math.atan2(to.y - c.y, to.x - c.x);
  const tau = 2 * Math.PI;
  const span = (((a1 - a0) % tau) + tau) % tau;
  const options = [
    { dir: 1, span },
    { dir: -1, span: tau - span },
  ];
  const mid = (o: { dir: number; span: number }) => {
    const a = a0 + (o.dir * o.span) / 2;
    return { x: c.x + c.r * Math.cos(a), y: c.y + c.r * Math.sin(a) };
  };
  const o = options.find((o) => want(mid(o))) ?? options[0];
  // SVG's y axis points down, so sweep-flag 1 is the direction of increasing atan2 angle.
  return `A ${c.r} ${c.r} 0 ${o.span > Math.PI ? 1 : 0} ${o.dir > 0 ? 1 : 0} ${f(to.x)} ${f(to.y)}`;
}

/**
 * Three equal circles on an equilateral triangle centred on (0, 0): Patient upper left,
 * Provider upper right, Payer at the bottom.
 */
export function vennLayout(r = 120, spacing = 132): VennLayout {
  const R = spacing / Math.sqrt(3);
  const at = (deg: number, party: Party): Circle => ({
    party,
    r,
    x: R * Math.cos((deg * Math.PI) / 180),
    y: R * Math.sin((deg * Math.PI) / 180),
  });
  const A = at(210, 'patient');
  const B = at(330, 'provider');
  const C = at(90, 'payer');
  const circles = [A, B, C];

  // For each pair, the intersection point inside the third circle (I) and outside it (O).
  const split = (x: Circle, y: Circle, z: Circle) => {
    const [p, q] = intersections(x, y);
    return inside(z, p) ? { I: p, O: q } : { I: q, O: p };
  };
  const AB = split(A, B, C);
  const AC = split(A, C, B);
  const BC = split(B, C, A);

  const shape = (members: Party[], start: Pt, legs: [Circle, Pt][]): string => {
    const has = new Set(members);
    // A boundary arc on circle w keeps every *other* circle's membership the same as the region's.
    const edge = (w: Circle) => (p: Pt) =>
      circles.every((v) => v === w || inside(v, p) === has.has(v.party));
    return (
      `M ${f(start.x)} ${f(start.y)} ` +
      legs.map(([w, to], i) => arc(w, i ? legs[i - 1][1] : start, to, edge(w))).join(' ') +
      ' Z'
    );
  };
  const avg = (...ps: Pt[]) => ({
    x: ps.reduce((s, p) => s + p.x, 0) / ps.length,
    y: ps.reduce((s, p) => s + p.y, 0) / ps.length,
  });
  const out = (c: Circle, k: number) => {
    const d = Math.hypot(c.x, c.y);
    return { x: c.x + (c.x / d) * k, y: c.y + (c.y / d) * k };
  };
  const pairLabel = (o: Pt, i1: Pt, i2: Pt) => avg(o, avg(i1, i2));

  const regions: RegionShape[] = [
    {
      key: 'all',
      path: shape(['patient', 'provider', 'payer'], AB.I, [
        [A, AC.I],
        [C, BC.I],
        [B, AB.I],
      ]),
      label: avg(AB.I, AC.I, BC.I),
    },
    {
      key: 'pt-pr',
      path: shape(['patient', 'provider'], AB.O, [
        [A, AC.I],
        [C, BC.I],
        [B, AB.O],
      ]),
      label: pairLabel(AB.O, AC.I, BC.I),
    },
    {
      key: 'pt-py',
      path: shape(['patient', 'payer'], AC.O, [
        [A, AB.I],
        [B, BC.I],
        [C, AC.O],
      ]),
      label: pairLabel(AC.O, AB.I, BC.I),
    },
    {
      key: 'pr-py',
      path: shape(['provider', 'payer'], BC.O, [
        [B, AB.I],
        [A, AC.I],
        [C, BC.O],
      ]),
      label: pairLabel(BC.O, AB.I, AC.I),
    },
    {
      key: 'pt',
      path: shape(['patient'], AB.O, [
        [A, AC.O],
        [C, BC.I],
        [B, AB.O],
      ]),
      label: out(A, r * 0.42),
    },
    {
      key: 'pr',
      path: shape(['provider'], AB.O, [
        [B, BC.O],
        [C, AC.I],
        [A, AB.O],
      ]),
      label: out(B, r * 0.42),
    },
    {
      key: 'py',
      path: shape(['payer'], AC.O, [
        [C, BC.O],
        [B, AB.I],
        [A, AC.O],
      ]),
      label: out(C, r * 0.42),
    },
  ];

  // Patient and Provider labels sit above their circles, leaning outward; Payer sits below.
  // `y` is the baseline of the name line; the hint line goes 17px under it.
  const top = A.y - r - 30;
  const partyLabels: PartyLabel[] = [
    { party: 'patient', x: A.x + r * 0.25, y: top, anchor: 'end' },
    { party: 'provider', x: B.x - r * 0.25, y: top, anchor: 'start' },
    { party: 'payer', x: C.x, y: C.y + r + 26, anchor: 'middle' },
  ];

  return { circles, regions, partyLabels };
}
