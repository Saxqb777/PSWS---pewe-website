/**
 * Pewe's land, loaded once.
 *
 * terrain.bin holds two height grids (decimetres, Int16) and two water grids
 * (0–100, Uint8): a 10 m grid over the village and a 100 m grid out to the
 * sea. Heights come from the Copernicus GLO-30 elevation model; roads,
 * houses and places in village.json were traced against the owner's map.
 * All positions in the files are (x east, y north) in metres from the
 * Community Building.
 */

export type XY = [number, number];

export interface GridMeta {
  x0: number;
  y0: number;
  step: number;
  nx: number;
  ny: number;
}

export interface VillageData {
  origin: { lat: number; lng: number };
  exaggeration: number;
  inner: GridMeta;
  outer: GridMeta;
  places: Record<string, XY>;
  roads: Record<string, XY[]>;
  houses: [number, number, number][];
  paddy: XY[];
  pipes: { feed: XY[]; north: XY[]; south: XY[] };
  bridge: { x: number; y: number; angle: number; length: number };
  boats: [number, number, number][];
  busRoute: XY[];
}

export interface Grid extends GridMeta {
  /** metres above sea */
  h: Float32Array;
  /** 0 = land, 1 = water */
  w: Float32Array;
}

export interface MapData {
  village: VillageData;
  inner: Grid;
  outer: Grid;
}

export async function loadMapData(base = "/map"): Promise<MapData> {
  const [village, buf] = await Promise.all([
    fetch(`${base}/village.json`).then((r) => {
      if (!r.ok) throw new Error(`village.json ${r.status}`);
      return r.json() as Promise<VillageData>;
    }),
    fetch(`${base}/terrain.bin`).then((r) => {
      if (!r.ok) throw new Error(`terrain.bin ${r.status}`);
      return r.arrayBuffer();
    }),
  ]);
  const ni = village.inner.nx * village.inner.ny;
  const no = village.outer.nx * village.outer.ny;
  const ih = new Int16Array(buf, 0, ni);
  const oh = new Int16Array(buf, ni * 2, no);
  const iw = new Uint8Array(buf, (ni + no) * 2, ni);
  const ow = new Uint8Array(buf, (ni + no) * 2 + ni, no);
  const toGrid = (meta: GridMeta, h: Int16Array, w: Uint8Array): Grid => {
    const hh = new Float32Array(h.length);
    const ww = new Float32Array(w.length);
    for (let i = 0; i < h.length; i++) {
      hh[i] = h[i] / 10;
      ww[i] = w[i] / 100;
    }
    return { ...meta, h: hh, w: ww };
  };
  return {
    village,
    inner: toGrid(village.inner, ih, iw),
    outer: toGrid(village.outer, oh, ow),
  };
}

function bilinear(g: Grid, arr: Float32Array, x: number, y: number): number {
  let fx = (x - g.x0) / g.step;
  let fy = (g.y0 - y) / g.step;
  fx = Math.min(Math.max(fx, 0), g.nx - 1.0001);
  fy = Math.min(Math.max(fy, 0), g.ny - 1.0001);
  const i = Math.floor(fx);
  const j = Math.floor(fy);
  const tx = fx - i;
  const ty = fy - j;
  const a = arr[j * g.nx + i];
  const b = arr[j * g.nx + i + 1];
  const c = arr[(j + 1) * g.nx + i];
  const d = arr[(j + 1) * g.nx + i + 1];
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
};

export interface Pad {
  x: number;
  y: number;
  r: number;
  falloff: number;
  /** filled in from the land at the pad's centre */
  h?: number;
}

/** Sea level in the scene, after exaggeration. The water plane sits here. */
export const WATER_Y = 0.55;
/** How far below the water surface the creek bed is pushed. */
const BED_Y = -3.5;

/**
 * The land as a function: raw heights, water, and the final scene height
 * (exaggerated, creek beds pushed under the water, building plots levelled).
 */
export class Ground {
  readonly ex: number;
  private inner: Grid;
  private outer: Grid;
  private pads: Pad[] = [];
  private innerMinX: number;
  private innerMaxX: number;
  private innerMinY: number;
  private innerMaxY: number;

  constructor(data: MapData) {
    this.ex = data.village.exaggeration;
    this.inner = data.inner;
    this.outer = data.outer;
    const g = data.inner;
    this.innerMinX = g.x0;
    this.innerMaxX = g.x0 + (g.nx - 1) * g.step;
    this.innerMaxY = g.y0;
    this.innerMinY = g.y0 - (g.ny - 1) * g.step;
  }

  /** How much the fine grid counts here: 1 inside, fading to 0 at its edge. */
  innerWeight(x: number, y: number): number {
    const d = Math.min(
      x - this.innerMinX,
      this.innerMaxX - x,
      y - this.innerMinY,
      this.innerMaxY - y,
    );
    return smooth(0, 120, d);
  }

  insideInner(x: number, y: number, margin = 0): boolean {
    return (
      x > this.innerMinX + margin &&
      x < this.innerMaxX - margin &&
      y > this.innerMinY + margin &&
      y < this.innerMaxY - margin
    );
  }

  raw(x: number, y: number): number {
    const w = this.innerWeight(x, y);
    const o = bilinear(this.outer, this.outer.h, x, y);
    if (w <= 0) return o;
    const i = bilinear(this.inner, this.inner.h, x, y);
    return o + (i - o) * w;
  }

  water(x: number, y: number): number {
    const w = this.innerWeight(x, y);
    const o = bilinear(this.outer, this.outer.w, x, y);
    if (w <= 0) return o;
    const i = bilinear(this.inner, this.inner.w, x, y);
    return o + (i - o) * w;
  }

  /** Level the land under a building plot. Call before building meshes. */
  addPad(p: Pad) {
    const pad = { ...p };
    pad.h = this.natural(p.x, p.y);
    this.pads.push(pad);
  }

  /** Scene height without pads. */
  natural(x: number, y: number): number {
    const base = this.raw(x, y) * this.ex;
    const t = smooth(0.3, 0.62, this.water(x, y));
    return base * (1 - t) + BED_Y * t;
  }

  /** Final scene height (metres, +Y up) at (x east, y north). */
  height(x: number, y: number): number {
    let h = this.natural(x, y);
    for (const p of this.pads) {
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < p.r + p.falloff) {
        const k = smooth(p.r + p.falloff, p.r, d);
        h = h + ((p.h ?? h) - h) * k;
      }
    }
    return h;
  }

  /** Steepness in degrees, from the final heights. */
  slope(x: number, y: number, d = 8): number {
    const dx = this.height(x + d, y) - this.height(x - d, y);
    const dy = this.height(x, y + d) - this.height(x, y - d);
    return (Math.atan(Math.hypot(dx, dy) / (2 * d)) * 180) / Math.PI;
  }
}

export function pointInPolygon(x: number, y: number, poly: XY[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Distance from a point to a polyline. */
export function distToPolyline(x: number, y: number, line: XY[]): number {
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i];
    const [bx, by] = line[i + 1];
    const abx = bx - ax;
    const aby = by - ay;
    const l2 = abx * abx + aby * aby || 1;
    const t = Math.min(Math.max(((x - ax) * abx + (y - ay) * aby) / l2, 0), 1);
    const d = Math.hypot(x - (ax + abx * t), y - (ay + aby * t));
    if (d < best) best = d;
  }
  return best;
}

/** Resample a polyline every `step` metres. */
export function resample(line: XY[], step: number): XY[] {
  const out: XY[] = [line[0]];
  let carry = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i];
    const [bx, by] = line[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    let d = step - carry;
    while (d <= len) {
      const t = d / len;
      out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
      d += step;
    }
    carry = len - (d - step);
  }
  const last = line[line.length - 1];
  const tail = out[out.length - 1];
  if (Math.hypot(last[0] - tail[0], last[1] - tail[1]) > step * 0.3) out.push(last);
  return out;
}

export function polylineLength(line: XY[]): number {
  let L = 0;
  for (let i = 0; i < line.length - 1; i++)
    L += Math.hypot(line[i + 1][0] - line[i][0], line[i + 1][1] - line[i][1]);
  return L;
}
