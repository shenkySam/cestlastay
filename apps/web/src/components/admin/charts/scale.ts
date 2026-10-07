/** Width of one 11px Geist Mono glyph — axis labels are mono, so gutters can be computed. */
export const AXIS_CHAR_W = 6.7;

export interface Scale {
  /** Top of the y-domain (>= the data max) */
  top: number;
  /** Tick values from 0 to `top` */
  ticks: number[];
}

/** Round, human tick steps (1 / 2 / 2.5 / 5 × 10^n) covering 0..max in about `count` steps. */
export function niceScale(max: number, count = 4): Scale {
  if (!Number.isFinite(max) || max <= 0) return { top: 1, ticks: [0, 1] };
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { top, ticks };
}

/** Fixed domain (e.g. 0–100 %) split into `count` equal steps. */
export function fixedScale(top: number, count = 4): Scale {
  return { top, ticks: Array.from({ length: count + 1 }, (_, i) => (top / count) * i) };
}

/** Indices to label on a crowded x-axis — about `target` evenly spaced labels. */
export function thinIndices(n: number, target = 6): Set<number> {
  const step = Math.max(1, Math.ceil(n / target));
  const out = new Set<number>();
  for (let i = 0; i < n; i += step) out.add(i);
  return out;
}

/** Left gutter wide enough for the longest y tick label. */
export function axisGutter(labels: string[]): number {
  const longest = labels.reduce((m, l) => Math.max(m, l.length), 1);
  return Math.ceil(longest * AXIS_CHAR_W) + 14;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Monotone cubic interpolation (Fritsch–Carlson, as d3's curveMonotoneX).
 * Smooth, but never overshoots the data — a run of zero days stays on the baseline.
 */
export function monotonePath(pts: ReadonlyArray<readonly [number, number]>): string {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  if (n === 2) return `M${pts[0][0]},${pts[0][1]}L${pts[1][0]},${pts[1][1]}`;

  const secant: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0];
    secant.push(dx === 0 ? 0 : (pts[i + 1][1] - pts[i][1]) / dx);
  }

  const tangent: number[] = new Array(n);
  tangent[0] = secant[0];
  tangent[n - 1] = secant[n - 2];
  for (let i = 1; i < n - 1; i++) {
    tangent[i] = secant[i - 1] * secant[i] <= 0 ? 0 : (secant[i - 1] + secant[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (secant[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / secant[i];
    const b = tangent[i + 1] / secant[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      tangent[i] = t * a * secant[i];
      tangent[i + 1] = t * b * secant[i];
    }
  }

  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const h = (x1 - x0) / 3;
    d += `C${x0 + h},${y0 + tangent[i] * h} ${x1 - h},${y1 - tangent[i + 1] * h} ${x1},${y1}`;
  }
  return d;
}
