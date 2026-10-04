import * as THREE from "three";
import type { ModelContext, ModelHandle } from "../types";

/**
 * The Community Building of Pewe, the centrepiece of the village map.
 *
 * Everything is procedural: geometry built here and facades painted on
 * canvases. Layout (metres, +X east, -Z north, origin at the centre of the
 * footprint at ground level):
 *   - a two-storey main block, 16 m east-west by 20 m north-south, with
 *     pilasters, arch hoods, cornices and a frieze of small blind arches
 *     under the parapet; an open terrace under a low hipped sheet roof;
 *   - square corner towers with onion domes at NW and SW (the two ends of
 *     the west facade that faces the road and the paddy) and a shorter one
 *     at SE;
 *   - a slender tall tower at NE with an open eight-column pavilion;
 *   - the entrance portal in the middle of the north facade, crowned by a
 *     plain green lattice panel;
 *   - a paved courtyard inside a low compound wall.
 *
 * Draw calls: one "stucco" mesh (every painted surface shares one canvas
 * atlas; plain trims use vertex colours over a white swatch), domes, bronze
 * finials, roof sheets and pavers.
 */

// ───────────────────────────────────────────── dimensions (metres)

const HX = 8; // half of the main block's east-west extent
const HZ = 10; // half of its north-south extent
const PLINTH_H = 0.45;
const GF_SILL = 1.05;
const GF_SPRING = 2.62;
const FF_SILL = 5.25;
const FF_SPRING = 6.62;
const WIN_A = 0.56; // half-width of a facade window
const BAND_Y0 = 4.3;
const BAND_Y1 = 4.46;
const CORNICE_Y0 = 8.3;
const CORNICE_Y1 = 8.62;
const FRIEZE_TOP = 9.22;
const PARAPET_TOP = 9.42;
const HOOD_T = 0.23; // arch hood band thickness
const HOOD_D = 0.42; // arch hood projection
const PIL_W = 0.6;
const PIL_D = 0.22;

const TW = 3.4; // corner tower width
const TP = 0.9; // how far a corner tower stands out of the walls
const TOWER_TOP = 11.85;
const SLAB = 5.2; // broad sloped cap slab on the corner towers
const JALI_A = 0.7; // half-width of the lattice screen on a tower face
const JALI_TOP = 7.05; // its springing line

const TALL_H = 1.06; // half-width of the tall tower's shaft
const TALL_C = 0.28; // its chamfer
const TALL_P = 0.8; // how far it stands out of the walls
const TALL_SHAFT = 14.6; // top of the painted shaft
const TALL_FLUTES: Pt[] = [
  [3.75, BAND_Y0],
  [7.75, CORNICE_Y0],
  [14.05, TALL_SHAFT],
];
const TALL_PANELS: Pt[] = [
  [1.15, 3.55],
  [4.8, 7.55],
  [9.05, 13.85],
];

const EAVE_Y = 11.35;
const RIDGE_Y = 12.15;
const OVER = 0.8; // roof overhang

const PLOT_X = 17;
const PLOT_Z = 18;
const GATE_W = 4.6;

// ───────────────────────────────────────────── palette

const PAL = {
  cream: "#ead9c0",
  creamLit: "#f1e5d0",
  creamShade: "#dcc8aa",
  tan: "#c38c5a",
  tanLight: "#d4a476",
  tanDark: "#ad7a4b",
  portal: "#c08a58",
  brown: "#9a6a43",
  plinth: "#a8784e",
  dome: "#f2d6b6", // #efdcc4 nudged warmer so it still reads peach after tone mapping
  slab: "#ecd6ba",
  drum: "#d9a87d",
  frame: "#c9c3b8",
  bronze: "#b08a4a",
  roof: "#3d4347",
  paver: "#6f4a3e",
  compound: "#d4cec3",
  lattice: "#3e7b51",
  steel: "#2f3538",
  terrace: "#9f988b",
  stone: "#a9a093",
};

// ───────────────────────────────────────────── small helpers

type Pt = [number, number];
type UV = [number, number];
const UP = new THREE.Vector3(0, 1, 0);
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const C = (hex: string) => new THREE.Color(hex);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const g = c.getContext("2d");
  if (!g) throw new Error("community-building: 2D canvas unavailable");
  return [c, g];
}

// ───────────────────────────────────────────── arch outlines
// Shared by the canvas painters and THREE.Shape (both expose these calls).

interface PathSink {
  moveTo(x: number, y: number): unknown;
  lineTo(x: number, y: number): unknown;
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): unknown;
}

type ArchKind = "round" | "pointed";

/**
 * Arch from the springing point (cx - a, ys) over the crown to (cx + a, ys);
 * reversed when `rev`. The current point must already be at the start.
 * "pointed" is a two-centred arch with a slight ogee flick at the crown.
 */
function arch(p: PathSink, cx: number, ys: number, a: number, h: number, kind: ArchKind, rev = false) {
  const s = rev ? -1 : 1;
  if (kind === "round") {
    const k = 0.5523;
    p.bezierCurveTo(cx - s * a, ys + k * h, cx - s * k * a, ys + h, cx, ys + h);
    p.bezierCurveTo(cx + s * k * a, ys + h, cx + s * a, ys + k * h, cx + s * a, ys);
    return;
  }
  p.bezierCurveTo(cx - s * a, ys + 0.45 * h, cx - s * 0.84 * a, ys + 0.72 * h, cx - s * 0.48 * a, ys + 0.84 * h);
  p.bezierCurveTo(cx - s * 0.24 * a, ys + 0.92 * h, cx - s * 0.07 * a, ys + 0.93 * h, cx, ys + h);
  p.bezierCurveTo(cx + s * 0.07 * a, ys + 0.93 * h, cx + s * 0.24 * a, ys + 0.92 * h, cx + s * 0.48 * a, ys + 0.84 * h);
  p.bezierCurveTo(cx + s * 0.84 * a, ys + 0.72 * h, cx + s * a, ys + 0.45 * h, cx + s * a, ys);
}

/** Closed outline of an arched opening: straight jambs from y0 to the springing line, then the arch. */
function opening(p: PathSink, cx: number, y0: number, ys: number, a: number, h: number, kind: ArchKind) {
  p.moveTo(cx - a, y0);
  p.lineTo(cx - a, ys);
  arch(p, cx, ys, a, h, kind);
  p.lineTo(cx + a, y0);
  p.lineTo(cx - a, y0);
}

function fillOpening(
  c: CanvasRenderingContext2D,
  cx: number,
  y0: number,
  ys: number,
  a: number,
  h: number,
  kind: ArchKind,
  style: string | CanvasGradient,
) {
  c.fillStyle = style;
  c.beginPath();
  opening(c, cx, y0, ys, a, h, kind);
  c.closePath();
  c.fill();
}

const hoodRise = (span: number, kind: ArchKind) => (kind === "round" ? span / 2 : Math.min(span * 0.6, 1.55));

// ───────────────────────────────────────────── texture atlas

interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
  wm: number;
  hm: number;
}

type Painter = (c: CanvasRenderingContext2D, e: CanvasRenderingContext2D, wm: number, hm: number) => void;

/**
 * One colour canvas and one emissive canvas sharing a shelf-packed layout.
 * Regions are painted in metres (origin bottom-left, y up).
 */
class Atlas {
  readonly regions = new Map<string, Region>();
  readonly W: number;
  readonly H: number;
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly ecanvas: HTMLCanvasElement;
  readonly ectx: CanvasRenderingContext2D;
  readonly es: number;

  constructor(specs: Array<[string, number, number]>, width: number, ppm: number, emissiveScale: number) {
    const pad = 8;
    let p = ppm;
    let H = 0;
    for (let attempt = 0; attempt < 12; attempt++) {
      this.regions.clear();
      const sorted = [...specs].sort((a, b) => b[2] - a[2] || b[1] - a[1]);
      let x = pad;
      let y = pad;
      let shelf = 0;
      for (const [key, wm, hm] of sorted) {
        const w = Math.max(8, Math.ceil(wm * p));
        const h = Math.max(8, Math.ceil(hm * p));
        if (x + w + pad > width) {
          x = pad;
          y += shelf + pad;
          shelf = 0;
        }
        this.regions.set(key, { x, y, w, h, wm, hm });
        x += w + pad;
        shelf = Math.max(shelf, h);
      }
      H = y + shelf + pad;
      if (H <= width) break;
      p *= 0.92;
    }
    this.W = width;
    this.H = Math.ceil(H / 4) * 4;
    this.es = emissiveScale;
    [this.canvas, this.ctx] = makeCanvas(this.W, this.H);
    [this.ecanvas, this.ectx] = makeCanvas(this.W * this.es, this.H * this.es);
    this.ctx.fillStyle = PAL.cream;
    this.ctx.fillRect(0, 0, this.W, this.H);
    this.ectx.fillStyle = "#000";
    this.ectx.fillRect(0, 0, this.ecanvas.width, this.ecanvas.height);
  }

  private region(key: string): Region {
    const r = this.regions.get(key);
    if (!r) throw new Error(`community-building: no atlas region ${key}`);
    return r;
  }

  /** UV of a point given in region metres. */
  uv(key: string, xm: number, ym: number): UV {
    const r = this.region(key);
    return [(r.x + (xm / r.wm) * r.w) / this.W, 1 - (r.y + r.h - (ym / r.hm) * r.h) / this.H];
  }

  paint(key: string, base: string, fn: Painter) {
    const r = this.region(key);
    const { ctx: c, ectx: e, es } = this;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = base;
    c.fillRect(r.x - 5, r.y - 5, r.w + 10, r.h + 10);
    e.setTransform(1, 0, 0, 1, 0, 0);
    e.fillStyle = "#000";
    e.fillRect((r.x - 5) * es, (r.y - 5) * es, (r.w + 10) * es, (r.h + 10) * es);
    c.save();
    e.save();
    c.beginPath();
    c.rect(r.x, r.y, r.w, r.h);
    c.clip();
    e.beginPath();
    e.rect(r.x * es, r.y * es, r.w * es, r.h * es);
    e.clip();
    const sx = r.w / r.wm;
    const sy = r.h / r.hm;
    c.setTransform(sx, 0, 0, -sy, r.x, r.y + r.h);
    e.setTransform(sx * es, 0, 0, -sy * es, r.x * es, (r.y + r.h) * es);
    fn(c, e, r.wm, r.hm);
    c.restore();
    e.restore();
    c.setTransform(1, 0, 0, 1, 0, 0);
    e.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** Fine plaster grain over the painted regions (not over the flat swatches). */
  grain(keys: string[], seed: number, amount: number) {
    const rnd = mulberry32(seed);
    for (const key of keys) {
      const r = this.region(key);
      const img = this.ctx.getImageData(r.x, r.y, r.w, r.h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = (rnd() - 0.5) * amount;
        d[i] += n;
        d[i + 1] += n;
        d[i + 2] += n * 0.9;
      }
      this.ctx.putImageData(img, r.x, r.y);
    }
  }
}

// ───────────────────────────────────────────── geometry builder

const BOTTOM = 1;
const TOP = 2;
const BACK = 4;
const FRONT = 8;
const LEFT = 16;
const RIGHT = 32;
const HEXA_FACES = [
  [0, 1, 2, 3], // bottom (y0)
  [4, 5, 6, 7], // top (y1)
  [0, 1, 5, 4], // back (d0)
  [3, 2, 6, 7], // front (d1)
  [0, 3, 7, 4], // left (s0)
  [1, 2, 6, 5], // right (s1)
];

type ColorArg = THREE.Color | ((face: number) => THREE.Color);
type UVFn = (face: number) => UV[] | null;

/** Accumulates non-indexed triangles with position, normal, uv and colour. */
class Builder {
  private pos: number[] = [];
  private nor: number[] = [];
  private uvs: number[] = [];
  private col: number[] = [];
  /** Optional per-vertex brightness (weathering, ambient occlusion). */
  shade: ((x: number, y: number, z: number) => number) | null = null;
  /** UV of the swatch that glows at night (lamps). */
  lampUV: UV = [0, 0];

  constructor(public defUV: UV = [0, 0]) {}

  get triangles() {
    return this.pos.length / 9;
  }

  vert(p: THREE.Vector3, n: THREE.Vector3, uv: UV, c: THREE.Color) {
    const k = this.shade ? this.shade(p.x, p.y, p.z) : 1;
    this.pos.push(p.x, p.y, p.z);
    this.nor.push(n.x, n.y, n.z);
    this.uvs.push(uv[0], uv[1]);
    this.col.push(c.r * k, c.g * k, c.b * k);
  }

  /** Planar convex polygon, counter-clockwise seen from its front, as a fan. */
  poly(pts: THREE.Vector3[], c: THREE.Color, uv?: UV[]) {
    const n = newell(pts);
    for (let i = 1; i < pts.length - 1; i++) {
      for (const j of [0, i, i + 1]) this.vert(pts[j], n, uv ? uv[j] : this.defUV, c);
    }
  }

  /** Appends a three.js geometry transformed by m. */
  add(
    src: THREE.BufferGeometry,
    m: THREE.Matrix4,
    color: THREE.Color | ((n: THREE.Vector3, p: THREE.Vector3) => THREE.Color),
    opts: { keepUV?: boolean; keep?: (n: THREE.Vector3) => boolean; flat?: boolean } = {},
  ) {
    const g = src.index ? src.toNonIndexed() : src;
    const pa = g.getAttribute("position");
    const na = g.getAttribute("normal");
    const ua = g.getAttribute("uv");
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    const p = [V(0, 0, 0), V(0, 0, 0), V(0, 0, 0)];
    const n = [V(0, 0, 0), V(0, 0, 0), V(0, 0, 0)];
    const fnrm = V(0, 0, 0);
    const e1 = V(0, 0, 0);
    const e2 = V(0, 0, 0);
    for (let i = 0; i + 2 < pa.count; i += 3) {
      for (let k = 0; k < 3; k++) {
        p[k].fromBufferAttribute(pa, i + k).applyMatrix4(m);
        n[k].fromBufferAttribute(na, i + k).applyMatrix3(nm).normalize();
      }
      e1.subVectors(p[1], p[0]);
      e2.subVectors(p[2], p[0]);
      fnrm.crossVectors(e1, e2);
      if (fnrm.lengthSq() < 1e-12) continue;
      fnrm.normalize();
      if (opts.keep && !opts.keep(fnrm)) continue;
      for (let k = 0; k < 3; k++) {
        const nn = opts.flat ? fnrm : n[k];
        const c = typeof color === "function" ? color(nn, p[k]) : color;
        const uv: UV = opts.keepUV && ua ? [ua.getX(i + k), ua.getY(i + k)] : this.defUV;
        this.vert(p[k], nn, uv, c);
      }
    }
    if (g !== src) g.dispose();
  }

  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uvs, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }
}

function newell(pts: THREE.Vector3[]): THREE.Vector3 {
  const n = V(0, 0, 0);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    n.x += (a.y - b.y) * (a.z + b.z);
    n.y += (a.z - b.z) * (a.x + b.x);
    n.z += (a.x - b.x) * (a.y + b.y);
  }
  return n.lengthSq() > 0 ? n.normalize() : n.set(0, 1, 0);
}

/** Six-sided solid from 8 corners (bottom 0-3, top 4-7). Faces are flipped outward automatically. */
function hexa(b: Builder, c8: THREE.Vector3[], col: ColorArg, skip = 0, uvf?: UVFn) {
  const centre = V(0, 0, 0);
  for (const p of c8) centre.add(p);
  centre.multiplyScalar(1 / 8);
  for (let f = 0; f < 6; f++) {
    if (skip & (1 << f)) continue;
    let pts = HEXA_FACES[f].map((i) => c8[i]);
    let uv = uvf ? uvf(f) : null;
    const fc = V(0, 0, 0);
    for (const p of pts) fc.add(p);
    fc.multiplyScalar(0.25).sub(centre);
    if (newell(pts).dot(fc) < 0) {
      pts = pts.slice().reverse();
      if (uv) uv = uv.slice().reverse();
    }
    b.poly(pts, typeof col === "function" ? col(f) : col, uv ?? undefined);
  }
}

/** A local frame on a facade: s runs left to right seen from outside, y up, d outward. */
class Frame {
  readonly T: THREE.Vector3;
  constructor(
    readonly o: THREE.Vector3,
    readonly N: THREE.Vector3,
  ) {
    this.T = V(0, 0, 0).crossVectors(UP, N);
  }
  p(s: number, y: number, d: number): THREE.Vector3 {
    return this.o.clone().addScaledVector(this.T, s).addScaledVector(UP, y).addScaledVector(this.N, d);
  }
  matrix(s: number, y: number, d: number): THREE.Matrix4 {
    return new THREE.Matrix4().makeBasis(this.T, UP, this.N).setPosition(this.p(s, y, d));
  }
}

const WORLD = new Frame(V(0, 0, 0), V(0, 0, 1)); // s = x, d = z

function fbox(
  b: Builder,
  f: Frame,
  s0: number,
  s1: number,
  y0: number,
  y1: number,
  d0: number,
  d1: number,
  col: ColorArg,
  skip = 0,
  uvf?: UVFn,
) {
  hexa(
    b,
    [
      f.p(s0, y0, d0),
      f.p(s1, y0, d0),
      f.p(s1, y0, d1),
      f.p(s0, y0, d1),
      f.p(s0, y1, d0),
      f.p(s1, y1, d0),
      f.p(s1, y1, d1),
      f.p(s0, y1, d1),
    ],
    col,
    skip,
    uvf,
  );
}

/** World-axis box from its centre and size. */
function wbox(b: Builder, x: number, y: number, z: number, sx: number, sy: number, sz: number, col: ColorArg, skip = 0) {
  fbox(b, WORLD, x - sx / 2, x + sx / 2, y - sy / 2, y + sy / 2, z - sz / 2, z + sz / 2, col, skip);
}

/** Square-section bar between two points. `w` is across, `h` along the hint direction. */
function beam(b: Builder, a: THREE.Vector3, c: THREE.Vector3, w: number, h: number, col: ColorArg, hint = UP) {
  const dir = V(0, 0, 0).subVectors(c, a).normalize();
  const side = V(0, 0, 0).crossVectors(dir, hint);
  if (side.lengthSq() < 1e-8) side.set(1, 0, 0);
  side.normalize();
  const up = V(0, 0, 0).crossVectors(side, dir).normalize();
  const q = (p: THREE.Vector3, u: number, s: number) =>
    p
      .clone()
      .addScaledVector(up, (u * h) / 2)
      .addScaledVector(side, (s * w) / 2);
  hexa(b, [q(a, -1, -1), q(c, -1, -1), q(c, -1, 1), q(a, -1, 1), q(a, 1, -1), q(c, 1, -1), q(c, 1, 1), q(a, 1, 1)], col);
}

// ── outlines in plan (x, z), counter-clockwise on a north-up map

function square(cx: number, cz: number, h: number): Pt[] {
  return [
    [cx - h, cz - h],
    [cx - h, cz + h],
    [cx + h, cz + h],
    [cx + h, cz - h],
  ];
}

function chamfered(cx: number, cz: number, h: number, c: number): Pt[] {
  return [
    [cx - h, cz - h + c],
    [cx - h, cz + h - c],
    [cx - h + c, cz + h],
    [cx + h - c, cz + h],
    [cx + h, cz + h - c],
    [cx + h, cz - h + c],
    [cx + h - c, cz - h],
    [cx - h + c, cz - h],
  ];
}

/** Regular polygon with a flat face towards the west (axis aligned for n = 4k). */
function ngon(cx: number, cz: number, r: number, n: number): Pt[] {
  const out: Pt[] = [];
  const start = Math.PI + Math.PI / n;
  for (let k = 0; k < n; k++) {
    const t = start - (k * 2 * Math.PI) / n;
    out.push([cx + r * Math.cos(t), cz + r * Math.sin(t)]);
  }
  return out;
}

/** Vertical walls of a prism. `uvKey(i)` maps face i onto an atlas region (u = metres along the face). */
function prismWalls(
  b: Builder,
  out: Pt[],
  y0: number,
  y1: number,
  col: THREE.Color,
  atlas?: Atlas,
  uvKey?: (i: number) => string | null,
) {
  for (let i = 0; i < out.length; i++) {
    const [x0, z0] = out[i];
    const [x1, z1] = out[(i + 1) % out.length];
    const pts = [V(x0, y0, z0), V(x1, y0, z1), V(x1, y1, z1), V(x0, y1, z0)];
    const key = uvKey ? uvKey(i) : null;
    if (key && atlas) {
      const len = Math.hypot(x1 - x0, z1 - z0);
      b.poly(pts, col, [atlas.uv(key, 0, y0), atlas.uv(key, len, y0), atlas.uv(key, len, y1), atlas.uv(key, 0, y1)]);
    } else b.poly(pts, col);
  }
}

function cap(b: Builder, out: Pt[], y: number, col: THREE.Color, up: boolean) {
  const pts = out.map(([x, z]) => V(x, y, z));
  b.poly(up ? pts : pts.reverse(), col);
}

/** Closed prism (walls + caps). */
function prism(b: Builder, out: Pt[], y0: number, y1: number, col: THREE.Color, caps = 3) {
  prismWalls(b, out, y0, y1, col);
  if (caps & 1) cap(b, out, y0, col, false);
  if (caps & 2) cap(b, out, y1, col, true);
}

/** Frustum-like band between two outlines with the same vertex count. */
function loft(b: Builder, a: Pt[], ya: number, c: Pt[], yc: number, col: THREE.Color) {
  for (let i = 0; i < a.length; i++) {
    const j = (i + 1) % a.length;
    b.poly([V(a[i][0], ya, a[i][1]), V(a[j][0], ya, a[j][1]), V(c[j][0], yc, c[j][1]), V(c[i][0], yc, c[i][1])], col);
  }
}

/** Smooth lathe profile through control points (radius, height). */
function profile(ctrl: Pt[], n: number, sr: number, sh: number): THREE.Vector2[] {
  const curve = new THREE.SplineCurve(ctrl.map(([r, y]) => new THREE.Vector2(r * sr, y * sh)));
  return curve.getPoints(n).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
}

const ONION: Pt[] = [
  [0.8, 0.0],
  [0.9, 0.055],
  [0.965, 0.13],
  [0.995, 0.22],
  [1.0, 0.3],
  [0.985, 0.39],
  [0.945, 0.48],
  [0.875, 0.575],
  [0.78, 0.665],
  [0.655, 0.75],
  [0.51, 0.825],
  [0.36, 0.885],
  [0.22, 0.935],
  [0.11, 0.968],
  [0.045, 0.988],
  [0.0, 1.0],
];

const FINIAL: Pt[] = [
  [0.15, 0.0],
  [0.15, 0.035],
  [0.06, 0.07],
  [0.05, 0.17],
  [0.11, 0.24],
  [0.125, 0.3],
  [0.11, 0.36],
  [0.045, 0.42],
  [0.04, 0.5],
  [0.085, 0.55],
  [0.09, 0.59],
  [0.08, 0.63],
  [0.035, 0.67],
  [0.032, 0.73],
  [0.06, 0.76],
  [0.03, 0.8],
  [0.016, 0.93],
  [0.0, 1.0],
];

// ───────────────────────────────────────────── canvas painting

function wash(c: CanvasRenderingContext2D, W: number, H: number, rnd: () => number) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#d9c4a6");
  g.addColorStop(Math.min(0.12, 1.2 / H), "#e5d3b9");
  g.addColorStop(0.5, PAL.cream);
  g.addColorStop(1, "#eddfc8");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  const n = Math.round(W * H * 1.2);
  for (let i = 0; i < n; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const r = 0.12 + rnd() * 0.7;
    c.fillStyle = rnd() < 0.55 ? `rgba(130,100,64,${0.03 * rnd()})` : `rgba(255,248,236,${0.04 * rnd()})`;
    c.beginPath();
    c.ellipse(x, y, r * 1.5, r, 0, 0, Math.PI * 2);
    c.fill();
  }
}

function plinthBand(c: CanvasRenderingContext2D, W: number) {
  c.fillStyle = PAL.plinth;
  c.fillRect(0, 0, W, 0.8);
  c.fillStyle = "#8c6240";
  c.fillRect(0, 0.76, W, 0.05);
  c.fillStyle = "rgba(60,40,25,0.25)";
  c.fillRect(0, 0, W, 0.5);
}

function streaks(c: CanvasRenderingContext2D, x0: number, x1: number, top: number, len: number, rnd: () => number, n: number) {
  for (let i = 0; i < n; i++) {
    const x = x0 + rnd() * (x1 - x0);
    const w = 0.02 + rnd() * 0.05;
    const l = len * (0.35 + rnd() * 0.65);
    const g = c.createLinearGradient(0, top, 0, top - l);
    g.addColorStop(0, `rgba(96,78,56,${0.05 + rnd() * 0.07})`);
    g.addColorStop(1, "rgba(96,78,56,0)");
    c.fillStyle = g;
    c.fillRect(x, top - l, w, l);
  }
}

const glowPick = (rnd: () => number) => {
  const r = rnd();
  return r < 0.14 ? 0.05 : r < 0.38 ? 0.32 + rnd() * 0.2 : 0.78 + rnd() * 0.22;
};

/** A casement window with a fanlight; glass also painted into the emissive canvas. */
function paintWindow(
  c: CanvasRenderingContext2D,
  e: CanvasRenderingContext2D,
  cx: number,
  y0: number,
  ys: number,
  a: number,
  h: number,
  kind: ArchKind,
  glow: number,
  leaves = 2,
) {
  // reveal in shadow, frame, glass
  fillOpening(c, cx, y0 - 0.03, ys, a + 0.075, h + 0.075, kind, "#bea380");
  fillOpening(c, cx, y0, ys, a, h, kind, PAL.frame);
  const gi = 0.06;
  const ga = a - gi;
  const gh = h - gi;
  const g = c.createLinearGradient(0, y0, 0, ys + h);
  g.addColorStop(0, "#141c1b");
  g.addColorStop(0.55, "#202b2a");
  g.addColorStop(1, "#3c4b4b");
  c.save();
  c.beginPath();
  opening(c, cx, y0 + gi, ys, ga, gh, kind);
  c.closePath();
  c.fillStyle = g;
  c.fill();
  c.clip();
  // sky sheen and the shadow of the head
  c.fillStyle = "rgba(205,222,228,0.09)";
  c.beginPath();
  c.moveTo(cx - a, y0 + (ys - y0) * 0.25);
  c.lineTo(cx - a + 0.42, ys + h);
  c.lineTo(cx - a + 0.62, ys + h);
  c.lineTo(cx - a + 0.2, y0 + (ys - y0) * 0.25);
  c.closePath();
  c.fill();
  const sg = c.createLinearGradient(0, ys + h, 0, ys + h - 0.5);
  sg.addColorStop(0, "rgba(0,0,0,0.35)");
  sg.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = sg;
  c.fillRect(cx - a, ys + h - 0.5, 2 * a, 0.5);
  c.restore();

  // glazing bars, clipped to the frame
  const bars = (k: CanvasRenderingContext2D) => {
    k.save();
    k.beginPath();
    opening(k, cx, y0, ys, a, h, kind);
    k.closePath();
    k.clip();
    const mw = 0.042;
    for (let i = 1; i < leaves; i++) {
      const x = cx - a + (2 * a * i) / leaves;
      k.fillRect(x - mw / 2, y0, mw, ys - y0 + h);
    }
    k.fillRect(cx - a, ys - mw / 2, 2 * a, mw);
    k.fillRect(cx - a, y0 + (ys - y0) * 0.52, 2 * a, mw * 0.8);
    if (kind === "round" && a > 0.4) {
      k.lineWidth = 0.04;
      k.beginPath();
      for (const t of [Math.PI / 4, (3 * Math.PI) / 4]) {
        k.moveTo(cx, ys);
        k.lineTo(cx + Math.cos(t) * a * 1.2, ys + Math.sin(t) * h * 1.2);
      }
      k.stroke();
    } else if (leaves === 1) {
      k.fillRect(cx - mw / 2, ys, mw, h);
    }
    k.restore();
  };
  c.fillStyle = PAL.frame;
  c.strokeStyle = PAL.frame;
  bars(c);

  if (glow > 0.01) {
    const v = Math.round(255 * glow);
    const lo = Math.round(v * 0.82);
    const eg = e.createLinearGradient(0, y0, 0, ys + h);
    eg.addColorStop(0, `rgb(${lo},${lo},${lo})`);
    eg.addColorStop(1, `rgb(${v},${v},${v})`);
    e.fillStyle = eg;
    e.beginPath();
    opening(e, cx, y0 + gi, ys, ga, gh, kind);
    e.closePath();
    e.fill();
    e.fillStyle = "#000";
    e.strokeStyle = "#000";
    bars(e);
  }
}

/** Shaded tympanum inside an arch hood. */
function tympanum(c: CanvasRenderingContext2D, cx: number, ys: number, a: number, h: number, kind: ArchKind) {
  const g = c.createLinearGradient(0, ys, 0, ys + h);
  g.addColorStop(0, "#e2ceb2");
  g.addColorStop(1, "#cdb692");
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(cx - a, ys);
  arch(c, cx, ys, a, h, kind);
  c.closePath();
  c.fill();
}

function paintFrieze(c: CanvasRenderingContext2D, W: number) {
  const pitch = 0.68;
  const n = Math.max(1, Math.floor((W - 0.15) / pitch));
  const off = (W - n * pitch) / 2;
  const y0 = CORNICE_Y1 + 0.1;
  const ys = y0 + 0.17;
  const a = 0.2;
  for (let i = 0; i < n; i++) {
    const cx = off + (i + 0.5) * pitch;
    const g = c.createLinearGradient(0, y0, 0, ys + a);
    g.addColorStop(0, "#dcc6a5");
    g.addColorStop(1, "#c9b18c");
    fillOpening(c, cx, y0, ys, a, a, "round", g);
    c.strokeStyle = PAL.tan;
    c.lineWidth = 0.05;
    c.beginPath();
    opening(c, cx, y0, ys, a, a, "round");
    c.stroke();
  }
}

interface Bay {
  c: number;
  span: number;
}

interface FacadeDef {
  key: string;
  frame: Frame;
  len: number;
  pilasters: number[];
  bays: Bay[];
  portal?: Pt;
  seed: number;
}

function paintFacade(atlas: Atlas, fd: FacadeDef) {
  const rnd = mulberry32(fd.seed);
  atlas.paint(fd.key, PAL.cream, (c, e, W, H) => {
    wash(c, W, H, rnd);
    plinthBand(c, W);
    c.fillStyle = PAL.tan;
    c.fillRect(0, BAND_Y0, W, BAND_Y1 - BAND_Y0);
    c.fillRect(0, CORNICE_Y0, W, CORNICE_Y1 - CORNICE_Y0);
    c.fillRect(0, FRIEZE_TOP, W, H - FRIEZE_TOP);
    // soft shadow under the cornice
    const sg = c.createLinearGradient(0, CORNICE_Y0, 0, CORNICE_Y0 - 0.6);
    sg.addColorStop(0, "rgba(80,60,40,0.16)");
    sg.addColorStop(1, "rgba(80,60,40,0)");
    c.fillStyle = sg;
    c.fillRect(0, CORNICE_Y0 - 0.6, W, 0.6);
    paintFrieze(c, W);
    for (const bay of fd.bays) {
      const A = bay.span / 2;
      const ai = A - HOOD_T;
      tympanum(c, bay.c, GF_SPRING, ai, ai, "round");
      tympanum(c, bay.c, FF_SPRING, ai, hoodRise(bay.span, "pointed") - HOOD_T * 1.3, "pointed");
      paintWindow(c, e, bay.c, GF_SILL, GF_SPRING, WIN_A, WIN_A, "round", glowPick(rnd));
      paintWindow(c, e, bay.c, FF_SILL, FF_SPRING, WIN_A, WIN_A * 1.45, "pointed", glowPick(rnd));
      streaks(c, bay.c - 0.62, bay.c + 0.62, GF_SILL - 0.11, 0.55, rnd, 5);
      streaks(c, bay.c - 0.62, bay.c + 0.62, FF_SILL - 0.11, 0.8, rnd, 6);
    }
    streaks(c, 0, W, CORNICE_Y0, 0.9, rnd, Math.round(W * 1.5));
  });
}

function jaliPattern(c: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number) {
  const cell = 0.2;
  const bar = 0.035;
  for (let y = y0; y < y0 + h; y += cell) {
    for (let x = x0; x < x0 + w; x += cell) {
      c.fillRect(x, y, cell, bar);
      c.fillRect(x, y, bar, cell);
      c.fillRect(x + 0.07, y + 0.07, 0.095, 0.095);
      c.fillRect(x + 0.1, y, 0.03, cell);
      c.fillRect(x, y + 0.1, cell, 0.03);
    }
  }
}

function paintTowerFace(atlas: Atlas, key: string, jali: boolean, seed: number) {
  const rnd = mulberry32(seed);
  atlas.paint(key, PAL.cream, (c, e, W, H) => {
    wash(c, W, H, rnd);
    plinthBand(c, W);
    c.fillStyle = PAL.tan;
    c.fillRect(0, BAND_Y0, W, BAND_Y1 - BAND_Y0);
    c.fillRect(0, CORNICE_Y0, W, CORNICE_Y1 - CORNICE_Y0);
    c.fillRect(0, H - 0.5, W, 0.5);
    const cx = W / 2;
    const top = JALI_TOP;
    if (jali) {
      fillOpening(c, cx, 0.8, top, JALI_A + 0.14, JALI_A + 0.14, "round", PAL.tan);
      fillOpening(c, cx, 0.86, top, JALI_A + 0.06, JALI_A + 0.06, "round", "#8d6039");
      c.save();
      c.beginPath();
      opening(c, cx, 0.92, top, JALI_A, JALI_A, "round");
      c.closePath();
      c.clip();
      c.fillStyle = "#2a1c12";
      c.fillRect(cx - 1, 0.8, 2, 8);
      c.fillStyle = "#b07d4d";
      jaliPattern(c, cx - JALI_A, 0.92, 2 * JALI_A, 7.2);
      const sg = c.createLinearGradient(cx - JALI_A, 0, cx + JALI_A, 0);
      sg.addColorStop(0, "rgba(0,0,0,0.3)");
      sg.addColorStop(0.22, "rgba(0,0,0,0)");
      c.fillStyle = sg;
      c.fillRect(cx - JALI_A, 0.9, 2 * JALI_A, 8);
      const tg = c.createLinearGradient(0, top + JALI_A, 0, top - 0.6);
      tg.addColorStop(0, "rgba(0,0,0,0.35)");
      tg.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = tg;
      c.fillRect(cx - JALI_A, top - 0.6, 2 * JALI_A, JALI_A + 0.6);
      c.restore();
      e.save();
      e.beginPath();
      opening(e, cx, 0.92, top, JALI_A, JALI_A, "round");
      e.closePath();
      e.clip();
      const eg = e.createLinearGradient(0, 0.9, 0, top + JALI_A);
      eg.addColorStop(0, "rgb(150,150,150)");
      eg.addColorStop(1, "rgb(90,90,90)");
      e.fillStyle = eg;
      e.fillRect(cx - 1, 0.8, 2, 8);
      e.fillStyle = "#000";
      jaliPattern(e, cx - JALI_A, 0.92, 2 * JALI_A, 7.2);
      e.restore();
    } else {
      fillOpening(c, cx, 0.86, top, 0.66, 0.66, "round", PAL.tan);
      const g = c.createLinearGradient(0, 0.9, 0, top + 0.6);
      g.addColorStop(0, "#dcc7a8");
      g.addColorStop(1, "#cbb390");
      fillOpening(c, cx, 0.92, top, 0.58, 0.58, "round", g);
    }
    // small arched window high on the tower
    fillOpening(c, cx, 9.18, 10.32, 0.46, 0.46, "round", PAL.tan);
    paintWindow(c, e, cx, 9.3, 10.32, 0.34, 0.34, "round", 0.5 + rnd() * 0.4, 1);
    streaks(c, cx - 0.5, cx + 0.5, 9.18, 0.8, rnd, 4);
  });
}

function paintTallFace(atlas: Atlas, key: string, main: boolean, seed: number) {
  const rnd = mulberry32(seed);
  atlas.paint(key, PAL.cream, (c, e, W, H) => {
    wash(c, W, H, rnd);
    plinthBand(c, W);
    for (const [y0, y1] of TALL_FLUTES) {
      c.fillStyle = PAL.creamLit;
      c.fillRect(0, y0, W, y1 - y0);
      c.fillStyle = "#b7895c";
      for (let x = 0.035; x < W - 0.02; x += 0.105) c.fillRect(x, y0 + 0.06, 0.04, y1 - y0 - 0.1);
      c.fillStyle = PAL.tan;
      c.fillRect(0, y0, W, 0.05);
    }
    if (main) {
      for (const [ya, yb] of TALL_PANELS) {
        for (const u of [W * 0.27, W * 0.73]) {
          fillOpening(c, u, ya - 0.04, yb - 0.16, 0.17, 0.17, "round", "#9c6c43");
          fillOpening(c, u + 0.02, ya, yb - 0.16, 0.135, 0.135, "round", "#c48f5f");
        }
      }
    }
  });
}

function paintPortalBack(atlas: Atlas) {
  atlas.paint("portalBack", PAL.creamShade, (c, e, W, H) => {
    const rnd = mulberry32(91);
    wash(c, W, H, rnd);
    c.fillStyle = "rgba(90,66,40,0.10)";
    c.fillRect(0, 0, W, H);
    plinthBand(c, W);
    const cx = W / 2;
    // doorway: tan surround, dark recess, low grille gate
    fillOpening(c, cx, 0, 2.95, 1.2, 1.15, "pointed", PAL.portal);
    const dg = c.createLinearGradient(0, 0, 0, 4);
    dg.addColorStop(0, "#1c1712");
    dg.addColorStop(1, "#2b231c");
    fillOpening(c, cx, 0, 2.95, 1.0, 0.95, "pointed", dg);
    c.fillStyle = "#3b2a1d";
    c.fillRect(cx - 0.62, PLINTH_H, 0.58, 2.35);
    c.fillRect(cx + 0.04, PLINTH_H, 0.58, 2.35);
    c.fillStyle = "#5d6466";
    for (let x = cx - 0.97; x <= cx + 0.97; x += 0.11) {
      c.fillRect(x, PLINTH_H, 0.025, 1.12);
      c.beginPath();
      c.moveTo(x - 0.02, PLINTH_H + 1.12);
      c.lineTo(x + 0.0125, PLINTH_H + 1.22);
      c.lineTo(x + 0.045, PLINTH_H + 1.12);
      c.fill();
    }
    c.fillRect(cx - 1.0, PLINTH_H + 0.08, 2.0, 0.04);
    c.fillRect(cx - 1.0, PLINTH_H + 1.06, 2.0, 0.05);
    // shadow cast by the canopy
    const sg = c.createLinearGradient(0, 4.1, 0, 3.3);
    sg.addColorStop(0, "rgba(40,28,18,0.28)");
    sg.addColorStop(1, "rgba(40,28,18,0)");
    c.fillStyle = sg;
    c.fillRect(0, 3.3, W, 0.8);
    // first-floor window
    fillOpening(c, cx, 4.85, 6.75, 1.0, 1.1, "pointed", PAL.portal);
    paintWindow(c, e, cx, 5.0, 6.75, 0.82, 0.92, "pointed", 0.95, 3);
    // inner lintel
    c.fillStyle = PAL.portal;
    c.fillRect(0, H - 0.5, W, 0.5);
    c.fillStyle = "rgba(40,28,18,0.25)";
    c.fillRect(0, H - 0.55, W, 0.05);
    // night: the lit lobby and a soft halo lifting the recess
    e.save();
    e.beginPath();
    opening(e, cx, PLINTH_H, 2.95, 1.0, 0.95, "pointed");
    e.closePath();
    e.fillStyle = "rgb(120,120,120)";
    e.fill();
    e.restore();
    e.fillStyle = "#000";
    for (let x = cx - 0.97; x <= cx + 0.97; x += 0.11) e.fillRect(x, PLINTH_H, 0.025, 1.12);
    const halo = e.createRadialGradient(cx, 2.0, 0.4, cx, 2.0, 4.2);
    halo.addColorStop(0, "rgba(255,255,255,0.14)");
    halo.addColorStop(1, "rgba(255,255,255,0)");
    e.fillStyle = halo;
    e.fillRect(0, 0, W, H);
  });
}

function paintPilaster(atlas: Atlas, h: number) {
  atlas.paint("pilaster", PAL.cream, (c, _e, W, H) => {
    const rnd = mulberry32(17);
    wash(c, W, H, rnd);
    plinthBand(c, W);
    for (let y = 1.1; y < h - 0.2; y += 0.34) {
      c.fillStyle = "#ad9271";
      c.fillRect(0, y, W, 0.035);
      c.fillStyle = "#f6ecdb";
      c.fillRect(0, y - 0.02, W, 0.02);
    }
  });
}

function paintSwatch(atlas: Atlas, key: string, color: string, emissive: string) {
  atlas.paint(key, color, (c, e, W, H) => {
    c.fillStyle = color;
    c.fillRect(0, 0, W, H);
    e.fillStyle = emissive;
    e.fillRect(0, 0, W, H);
  });
}

// ── standalone tiling textures

function roofTextures(size: number, aniso: number): [THREE.CanvasTexture, THREE.CanvasTexture] {
  // one tile = 2 m x 2 m; 14 trapezoidal ribs across u
  const ribs = 14;
  const [cc, c] = makeCanvas(size, size);
  const [nc, n] = makeCanvas(size, size);
  const rnd = mulberry32(5);
  const base = new THREE.Color(PAL.roof);
  const img = c.createImageData(size, size);
  const nimg = n.createImageData(size, size);
  const prof = (u: number) => {
    // height and slope of the rib profile at u in [0,1) of a rib
    if (u < 0.12) return [0, 0];
    if (u < 0.22) return [(u - 0.12) / 0.1, 1];
    if (u < 0.38) return [1, 0];
    if (u < 0.48) return [1 - (u - 0.38) / 0.1, -1];
    if (u < 0.74) return [0, 0];
    if (u < 0.78) return [0.25 * ((u - 0.74) / 0.04), 0.4];
    if (u < 0.84) return [0.25, 0];
    if (u < 0.88) return [0.25 * (1 - (u - 0.84) / 0.04), -0.4];
    return [0, 0];
  };
  const streak: number[] = [];
  for (let x = 0; x < size; x++) streak.push((rnd() - 0.5) * 0.08);
  for (let x = 0; x < size; x++) {
    const ru = ((x + 0.5) / size) * ribs;
    const [h, sl] = prof(ru - Math.floor(ru));
    const k = 0.84 + h * 0.3 + streak[x] + (Math.floor(ru / 7) % 2 === 0 ? 0.025 : -0.015);
    const nx = -sl * 0.75;
    const len = Math.hypot(nx, 1);
    for (let y = 0; y < size; y++) {
      const i = (y * size + x) * 4;
      const lap = y < 2 ? 0.75 : y < 4 ? 1.08 : 1;
      const grime = 1 - 0.06 * Math.pow(y / size, 3);
      const kk = k * lap * grime;
      img.data[i] = Math.min(255, Math.round(255 * Math.pow(base.r, 1 / 2.2) * kk));
      img.data[i + 1] = Math.min(255, Math.round(255 * Math.pow(base.g, 1 / 2.2) * kk));
      img.data[i + 2] = Math.min(255, Math.round(255 * Math.pow(base.b, 1 / 2.2) * kk));
      img.data[i + 3] = 255;
      nimg.data[i] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      nimg.data[i + 1] = 128;
      nimg.data[i + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
      nimg.data[i + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  n.putImageData(nimg, 0, 0);
  const map = new THREE.CanvasTexture(cc);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = aniso;
  const nrm = new THREE.CanvasTexture(nc);
  nrm.wrapS = nrm.wrapT = THREE.RepeatWrapping;
  nrm.anisotropy = aniso;
  return [map, nrm];
}

function paverTexture(size: number, aniso: number): THREE.CanvasTexture {
  // one tile = 2 m x 2 m of 0.2 m basket-weave blocks (two 0.2 x 0.1 pavers each)
  const [cv, c] = makeCanvas(size, size);
  const rnd = mulberry32(23);
  const px = size / 2;
  c.fillStyle = "#3a2822";
  c.fillRect(0, 0, size, size);
  const pc = new THREE.Color(PAL.paver).convertLinearToSRGB();
  const base = [pc.r * 255, pc.g * 255, pc.b * 255];
  const joint = Math.max(1, size / 320);
  for (let by = 0; by < 10; by++) {
    for (let bx = 0; bx < 10; bx++) {
      const horiz = (bx + by) % 2 === 0;
      for (let k = 0; k < 2; k++) {
        const x = bx * 0.2 + (horiz ? 0 : k * 0.1);
        const y = by * 0.2 + (horiz ? k * 0.1 : 0);
        const w = horiz ? 0.2 : 0.1;
        const h = horiz ? 0.1 : 0.2;
        const v = 0.82 + rnd() * 0.3;
        const warm = (rnd() - 0.5) * 14;
        c.fillStyle = `rgb(${Math.round(base[0] * v + warm)},${Math.round(base[1] * v)},${Math.round(base[2] * v - warm * 0.4)})`;
        c.fillRect(x * px + joint, y * px + joint, w * px - 2 * joint, h * px - 2 * joint);
        c.fillStyle = "rgba(255,235,215,0.06)";
        c.fillRect(x * px + joint, y * px + joint, w * px - 2 * joint, joint * 1.5);
      }
    }
  }
  for (let i = 0; i < 60; i++) {
    c.fillStyle = `rgba(30,22,18,${0.04 + rnd() * 0.06})`;
    c.beginPath();
    c.ellipse(rnd() * size, rnd() * size, 6 + rnd() * size * 0.12, 4 + rnd() * size * 0.08, rnd() * 3, 0, Math.PI * 2);
    c.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  return t;
}

/** Emissive ramp for the domes: soft uplight at the base, fading by the shoulder. */
function domeGlowTexture(): THREE.CanvasTexture {
  const [cv, c] = makeCanvas(4, 64);
  const g = c.createLinearGradient(0, 64, 0, 0);
  g.addColorStop(0, "rgb(255,255,255)");
  g.addColorStop(0.3, "rgb(150,150,150)");
  g.addColorStop(0.75, "rgb(40,40,40)");
  g.addColorStop(1, "rgb(18,18,18)");
  c.fillStyle = g;
  c.fillRect(0, 0, 4, 64);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ───────────────────────────────────────────── building parts

interface Quality {
  low: boolean;
  domeSeg: number;
  domePts: number;
  curve: number;
  colSeg: number;
  finSeg: number;
}

interface Builders {
  st: Builder; // stucco (atlas)
  dome: Builder;
  bronze: Builder;
  roof: Builder;
}

function evenBays(len: number, n: number): { pilasters: number[]; bays: Bay[] } {
  const span = (len - (n - 1) * PIL_W) / n;
  const bays: Bay[] = [];
  const pilasters: number[] = [];
  for (let i = 0; i < n; i++) bays.push({ c: i * (span + PIL_W) + span / 2, span });
  for (let j = 0; j < n - 1; j++) pilasters.push((j + 1) * span + j * PIL_W + PIL_W / 2);
  return { pilasters, bays };
}

function hood(b: Builder, f: Frame, cx: number, ys: number, span: number, kind: ArchKind, q: Quality) {
  const A = span / 2;
  const H = hoodRise(span, kind);
  const ai = A - HOOD_T;
  const hi = kind === "round" ? ai : H - HOOD_T * 1.3;
  const sh = new THREE.Shape();
  sh.moveTo(-A, 0);
  arch(sh, 0, 0, A, H, kind);
  sh.lineTo(ai, 0);
  arch(sh, 0, 0, ai, hi, kind, true);
  sh.lineTo(-A, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth: HOOD_D, bevelEnabled: false, curveSegments: q.curve });
  const front = C(PAL.tan);
  const side = C(PAL.tanLight);
  const under = C("#c99a6c");
  const N = f.N;
  b.add(g, f.matrix(cx, ys, 0), (n) => (Math.abs(n.dot(N)) > 0.9 ? front : n.y < -0.2 ? under : side), {
    keep: (n) => n.dot(N) > -0.9,
  });
  g.dispose();
}

function pilaster(b: Builder, atlas: Atlas, f: Frame, s0: number, s1: number, y1: number) {
  const w = s1 - s0;
  const white = C("#ffffff");
  const top = C(PAL.cream);
  fbox(
    b,
    f,
    s0,
    s1,
    0,
    y1,
    0,
    PIL_D,
    (face) => (face >= 3 ? white : top),
    BACK | BOTTOM,
    (face) => {
      if (face === 3)
        return [atlas.uv("pilaster", 0, 0), atlas.uv("pilaster", w, 0), atlas.uv("pilaster", w, y1), atlas.uv("pilaster", 0, y1)];
      if (face === 4 || face === 5)
        return [
          atlas.uv("pilaster", 0, 0),
          atlas.uv("pilaster", PIL_D, 0),
          atlas.uv("pilaster", PIL_D, y1),
          atlas.uv("pilaster", 0, y1),
        ];
      return null;
    },
  );
}

function buildFacade(B: Builders, atlas: Atlas, fd: FacadeDef, q: Quality) {
  const b = B.st;
  const f = fd.frame;
  const L = fd.len;
  const white = C("#ffffff");
  const tan = C(PAL.tan);
  const tanDark = C(PAL.tanDark);
  const segs: Pt[] = fd.portal
    ? [
        [0, fd.portal[0] + 0.05],
        [fd.portal[1] - 0.05, L],
      ]
    : [[0, L]];
  for (const [s0, s1] of segs) {
    b.poly(
      [f.p(s0, 0, 0), f.p(s1, 0, 0), f.p(s1, PARAPET_TOP, 0), f.p(s0, PARAPET_TOP, 0)],
      white,
      [atlas.uv(fd.key, s0, 0), atlas.uv(fd.key, s1, 0), atlas.uv(fd.key, s1, PARAPET_TOP), atlas.uv(fd.key, s0, PARAPET_TOP)],
    );
  }
  // inner face of the parapet (seen from the terrace)
  b.poly([f.p(L, CORNICE_Y1, -0.2), f.p(0, CORNICE_Y1, -0.2), f.p(0, FRIEZE_TOP, -0.2), f.p(L, FRIEZE_TOP, -0.2)], C(PAL.creamShade));

  for (const pc of fd.pilasters) {
    pilaster(b, atlas, f, pc - PIL_W / 2, pc + PIL_W / 2, CORNICE_Y0);
    for (const ys of [GF_SPRING, FF_SPRING]) fbox(b, f, pc - 0.37, pc + 0.37, ys - 0.2, ys, 0, 0.3, tan, BACK);
    fbox(b, f, pc - 0.36, pc + 0.36, PLINTH_H, 0.85, 0, PIL_D + 0.05, C(PAL.plinth), BACK | BOTTOM);
  }
  const segRuns: Pt[] = fd.portal
    ? [
        [0, fd.portal[0]],
        [fd.portal[1], L],
      ]
    : [[0, L]];
  for (const [s0, s1] of segRuns) {
    fbox(b, f, s0, s1, BAND_Y0, BAND_Y1, -0.02, 0.1, tan, BACK);
    fbox(b, f, s0, s1, CORNICE_Y0, 8.44, -0.02, 0.26, tanDark, BACK);
    fbox(b, f, s0, s1, 8.44, CORNICE_Y1, -0.02, 0.38, tan, BACK);
    fbox(b, f, s0, s1, FRIEZE_TOP, PARAPET_TOP, -0.27, 0.16, tan);
  }
  for (const bay of fd.bays) {
    for (const [sill, ys, kind] of [
      [GF_SILL, GF_SPRING, "round"],
      [FF_SILL, FF_SPRING, "pointed"],
    ] as const) {
      fbox(b, f, bay.c - 0.72, bay.c + 0.72, sill - 0.12, sill + 0.01, -0.01, 0.2, tan, BACK);
      hood(b, f, bay.c, ys, bay.span, kind, q);
      // corbels under the feet of the hood where no pilaster capital carries it
      for (const sgn of [-1, 1]) {
        const s = bay.c + (sgn * bay.span) / 2;
        if (fd.pilasters.some((pc) => Math.abs(pc - s) < PIL_W)) continue;
        fbox(b, f, Math.min(s, s - sgn * 0.24), Math.max(s, s - sgn * 0.24), ys - 0.22, ys, 0, 0.3, tanDark, BACK);
      }
    }
  }
}

function buildCornerTower(
  B: Builders,
  atlas: Atlas,
  cx: number,
  cz: number,
  faces: [string, string, string, string],
  outer: number[],
  domeR: number,
  domeH: number,
  drumH: number,
  q: Quality,
) {
  const b = B.st;
  const h = TW / 2;
  const out = square(cx, cz, h);
  prismWalls(b, out, 0, TOWER_TOP, C("#ffffff"), atlas, (i) => faces[i]);
  // arch hoods over the screen / blind arch and the high window on the outer faces
  for (const i of outer) {
    const [x0, z0] = out[i];
    const [x1, z1] = out[(i + 1) % 4];
    const f = new Frame(V(x0, 0, z0), V(-(z1 - z0), 0, x1 - x0).normalize());
    const jali = faces[i] === "towerJali";
    hood(b, f, h, JALI_TOP, 2 * ((jali ? JALI_A + 0.14 : 0.66) + HOOD_T), "round", q);
    hood(b, f, h, 10.32, 2 * (0.46 + HOOD_T), "round", q);
    fbox(b, f, h - 0.62, h + 0.62, 9.06, 9.18, -0.01, 0.18, C(PAL.tan), BACK);
  }
  const tan = C(PAL.tan);
  const tanDark = C(PAL.tanDark);
  const band = (y0: number, y1: number, e: number, col: THREE.Color) =>
    prism(b, square(cx, cz, h + e), y0 - 0.012, y1 + 0.012, col);
  prism(b, square(cx, cz, h + 0.06), 0, 0.85, C(PAL.plinth), 2);
  band(BAND_Y0, BAND_Y1, 0.1, tan);
  band(CORNICE_Y0, 8.44, 0.26, tanDark);
  band(8.44, CORNICE_Y1, 0.38, tan);
  band(TOWER_TOP - 0.42, TOWER_TOP - 0.22, 0.12, tanDark);
  band(TOWER_TOP - 0.22, TOWER_TOP, 0.26, tan);
  // broad sloped cap slab
  const slab = C(PAL.slab);
  const sh = SLAB / 2;
  prism(b, square(cx, cz, sh), TOWER_TOP, TOWER_TOP + 0.22, slab, 1);
  const drumR = domeR * 0.86;
  const y1 = TOWER_TOP + 0.22;
  const y2 = y1 + 0.42;
  loft(b, square(cx, cz, sh), y1, square(cx, cz, drumR + 0.3), y2, slab);
  cap(b, square(cx, cz, drumR + 0.3), y2, slab, true);
  // octagonal drum
  const drum = C(PAL.drum);
  prism(b, ngon(cx, cz, drumR + 0.16, 8), y2, y2 + 0.14, tan, 2);
  prism(b, ngon(cx, cz, drumR, 8), y2 + 0.14, y2 + 0.14 + drumH, drum, 0);
  const yd = y2 + 0.14 + drumH;
  prism(b, ngon(cx, cz, drumR + 0.12, 8), yd, yd + 0.12, tan, 3);
  // dome
  const y3 = yd + 0.12;
  const pts = profile(ONION, q.domePts, domeR, domeH);
  const lg = new THREE.LatheGeometry(pts, q.domeSeg);
  B.dome.add(lg, new THREE.Matrix4().makeTranslation(cx, y3, cz), C("#ffffff"), { keepUV: true });
  lg.dispose();
  if (!q.low) {
    const tg = new THREE.TorusGeometry(domeR * 0.8, 0.07, 6, q.domeSeg);
    tg.rotateX(Math.PI / 2);
    B.st.add(tg, new THREE.Matrix4().makeTranslation(cx, y3 + 0.06, cz), C(PAL.drum));
    tg.dispose();
  }
  finial(B.bronze, cx, y3 + domeH - 0.06, cz, domeH * 0.5, 1, q);
}

function finial(b: Builder, x: number, y: number, z: number, height: number, rs: number, q: Quality) {
  const pts = profile(FINIAL, 36, rs * height, height);
  const g = new THREE.LatheGeometry(pts, q.finSeg);
  b.add(g, new THREE.Matrix4().makeTranslation(x, y, z), C("#ffffff"));
  g.dispose();
}

function buildTallTower(B: Builders, atlas: Atlas, q: Quality) {
  const b = B.st;
  const cx = HX + TALL_P - TALL_H;
  const cz = -HZ - TALL_P + TALL_H;
  const out = chamfered(cx, cz, TALL_H, TALL_C);
  prismWalls(b, out, 0, TALL_SHAFT, C("#ffffff"), atlas, (i) => (i % 2 === 0 ? "tallMain" : "tallChamfer"));
  const tan = C(PAL.tan);
  const tanDark = C(PAL.tanDark);
  const band = (y0: number, y1: number, e: number, col: THREE.Color, caps = 3) =>
    prism(b, chamfered(cx, cz, TALL_H + e, TALL_C + e * (2 - Math.SQRT2)), y0 - 0.012, y1 + 0.012, col, caps);
  band(0, 0.85, 0.05, C(PAL.plinth), 2);
  band(BAND_Y0, BAND_Y1, 0.1, tan);
  band(CORNICE_Y0, 8.44, 0.18, tanDark);
  band(8.44, CORNICE_Y1, 0.3, tan);
  // corbelled top cornice and balcony
  let y = TALL_SHAFT;
  band(y, y + 0.15, 0.1, tanDark);
  band(y + 0.15, y + 0.35, 0.22, tan);
  band(y + 0.35, y + 0.5, 0.36, tanDark);
  y += 0.5;
  const balc = ngon(cx, cz, 1.62, 8);
  prism(b, balc, y, y + 0.62, C(PAL.cream));
  prism(b, ngon(cx, cz, 1.7, 8), y + 0.62, y + 0.74, tan);
  y += 0.74;
  // open pavilion: eight slim columns
  const colH = 2.4;
  const ring = ngon(cx, cz, 1.02, 8);
  const cream = C(PAL.creamLit);
  for (const [px, pz] of ring) {
    const cg = new THREE.CylinderGeometry(0.075, 0.09, colH - 0.36, q.colSeg, 1, true);
    b.add(cg, new THREE.Matrix4().makeTranslation(px, y + 0.18 + (colH - 0.36) / 2, pz), cream);
    cg.dispose();
    wbox(b, px, y + 0.09, pz, 0.24, 0.18, 0.24, tan, BOTTOM);
    wbox(b, px, y + colH - 0.09, pz, 0.26, 0.18, 0.26, tan);
    if (!q.low) wbox(b, px, y + colH * 0.42, pz, 0.2, 0.08, 0.2, tan);
  }
  // lantern hanging in the pavilion (glows at night)
  const savedUV = b.defUV;
  b.defUV = b.lampUV;
  prism(b, ngon(cx, cz, 0.11, 8), y + colH - 0.62, y + colH - 0.34, C("#ffe7c0"));
  b.defUV = savedUV;
  beam(b, V(cx, y + colH - 0.34, cz), V(cx, y + colH, cz), 0.025, 0.025, C(PAL.steel), V(1, 0, 0));
  y += colH;
  // cap, drum, dome, finial
  prism(b, ngon(cx, cz, 1.34, 8), y, y + 0.26, tan);
  prism(b, ngon(cx, cz, 1.5, 8), y + 0.26, y + 0.4, tanDark);
  prism(b, ngon(cx, cz, 1.08, 8), y + 0.4, y + 0.52, C(PAL.cream), 2);
  y += 0.52;
  const domeR = 0.98;
  const domeH = 1.55;
  prism(b, ngon(cx, cz, domeR * 0.82, 16), y, y + 0.36, C(PAL.drum), 2);
  y += 0.36;
  const pts = profile(ONION, q.domePts, domeR, domeH);
  const lg = new THREE.LatheGeometry(pts, Math.max(16, Math.round(q.domeSeg * 0.75)));
  B.dome.add(lg, new THREE.Matrix4().makeTranslation(cx, y, cz), C("#ffffff"), { keepUV: true });
  lg.dispose();
  if (!q.low) {
    const tg = new THREE.TorusGeometry(domeR * 0.8, 0.05, 6, Math.max(16, Math.round(q.domeSeg * 0.75)));
    tg.rotateX(Math.PI / 2);
    b.add(tg, new THREE.Matrix4().makeTranslation(cx, y + 0.04, cz), C(PAL.drum));
    tg.dispose();
  }
  finial(B.bronze, cx, y + domeH - 0.05, cz, 1.35, 0.85, q);
}

function buildPortal(B: Builders, atlas: Atlas, f: Frame, P0: number, P1: number, q: Quality) {
  const b = B.st;
  const pw = 0.75;
  const dF = 0.9;
  const dB = -0.5;
  const top = 9.75;
  const tan = C(PAL.portal);
  const reveal = C("#e3cfb3");
  const s0 = P0 + pw;
  const s1 = P1 - pw;
  // tall projecting frame
  fbox(b, f, P0, s0, 0, top, dB, dF, (face) => (face === 5 ? reveal : tan));
  fbox(b, f, s1, P1, 0, top, dB, dF, (face) => (face === 4 ? reveal : tan));
  fbox(b, f, s0, s1, 8.55, top, dB, dF, (face) => (face === 0 ? reveal : tan), LEFT | RIGHT);
  // outer moulding on the frame
  fbox(b, f, P0 - 0.08, P1 + 0.08, top - 0.18, top, dB, dF + 0.1, C(PAL.tanDark), BACK);
  // recessed back wall
  const w = s1 - s0;
  b.poly(
    [f.p(s0, 0, dB), f.p(s1, 0, dB), f.p(s1, 8.55, dB), f.p(s0, 8.55, dB)],
    C("#ffffff"),
    [atlas.uv("portalBack", 0, 0), atlas.uv("portalBack", w, 0), atlas.uv("portalBack", w, 8.55), atlas.uv("portalBack", 0, 8.55)],
  );
  // small sloped canopy over the door
  const cy = 4.2;
  hexa(
    b,
    [
      f.p(s0, cy, dB),
      f.p(s1, cy, dB),
      f.p(s1, cy - 0.16, dF + 0.3),
      f.p(s0, cy - 0.16, dF + 0.3),
      f.p(s0, cy + 0.16, dB),
      f.p(s1, cy + 0.16, dB),
      f.p(s1, cy, dF + 0.3),
      f.p(s0, cy, dF + 0.3),
    ],
    (face) => (face === 3 ? tan : face === 0 ? reveal : C(PAL.tanLight)),
  );
  for (const s of [s0 + 0.35, s1 - 0.35]) {
    hexa(
      b,
      [
        f.p(s - 0.07, cy - 0.75, dB),
        f.p(s + 0.07, cy - 0.75, dB),
        f.p(s + 0.07, cy - 0.05, dF),
        f.p(s - 0.07, cy - 0.05, dF),
        f.p(s - 0.07, cy, dB),
        f.p(s + 0.07, cy, dB),
        f.p(s + 0.07, cy - 0.02, dF),
        f.p(s - 0.07, cy - 0.02, dF),
      ],
      tan,
    );
  }
  // plain green lattice on the parapet above the portal
  const green = C(PAL.lattice);
  const greenDark = C("#2f6340");
  const ly0 = top;
  const ly1 = top + 1.12;
  const la = s0 + 0.12;
  const lb = s1 - 0.12;
  const ld = 0.25;
  const N = f.N;
  beam(b, f.p(la, ly0 + 0.04, ld), f.p(lb, ly0 + 0.04, ld), 0.08, 0.1, greenDark, N);
  beam(b, f.p(la, ly1 - 0.04, ld), f.p(lb, ly1 - 0.04, ld), 0.08, 0.1, greenDark, N);
  beam(b, f.p(la + 0.04, ly0, ld), f.p(la + 0.04, ly1, ld), 0.08, 0.1, greenDark, N);
  beam(b, f.p(lb - 0.04, ly0, ld), f.p(lb - 0.04, ly1, ld), 0.08, 0.1, greenDark, N);
  const LW = lb - la - 0.08;
  const LH = ly1 - ly0 - 0.08;
  const step = q.low ? 0.56 : 0.37;
  for (const dir of [1, -1]) {
    for (let k = -LH; k < LW + LH; k += step) {
      // line s = dir * t + k  (t = height above the frame bottom)
      const ts: number[] = [];
      if (dir > 0) {
        ts.push(Math.max(0, -k), Math.min(LH, LW - k));
      } else {
        ts.push(Math.max(0, k - LW), Math.min(LH, k));
      }
      if (ts[1] - ts[0] < 0.05) continue;
      const pa = f.p(la + 0.04 + dir * ts[0] + k, ly0 + 0.04 + ts[0], ld);
      const pb = f.p(la + 0.04 + dir * ts[1] + k, ly0 + 0.04 + ts[1], ld);
      beam(b, pa, pb, 0.05, 0.06, green, N);
    }
  }
  // two small pinnacles flanking the lattice
  for (const s of [P0 + pw / 2, P1 - pw / 2]) {
    const p = f.p(s, top, 0.2);
    wbox(b, p.x, top + 0.55, p.z, 0.44, 1.1, 0.44, C(PAL.cream), BOTTOM);
    wbox(b, p.x, top + 1.15, p.z, 0.56, 0.1, 0.56, tan);
    const pg = new THREE.LatheGeometry(profile(ONION, 8, 0.24, 0.5), 8);
    b.add(pg, new THREE.Matrix4().makeTranslation(p.x, top + 1.2, p.z), C(PAL.tanLight));
    pg.dispose();
    finial(B.bronze, p.x, top + 1.68, p.z, 0.42, 0.7, q);
  }
}

function roofHeight(x: number, z: number) {
  const X1 = HX + OVER;
  const Z1 = HZ + OVER;
  return EAVE_Y + (RIDGE_Y - EAVE_Y) * Math.max(0, Math.min((X1 - Math.abs(x)) / X1, (Z1 - Math.abs(z)) / X1));
}

function buildRoof(B: Builders, facades: FacadeDef[], q: Quality) {
  const rb = B.roof;
  const X1 = HX + OVER;
  const Z1 = HZ + OVER;
  const rz = Z1 - X1;
  const E = EAVE_Y;
  const R = RIDGE_Y;
  const sl = Math.hypot(X1, R - E);
  const t = 2; // texture tile (m)
  const white = C("#ffffff");
  // hipped roof: corrugations run down each slope
  rb.poly([V(-X1, E, -Z1), V(-X1, E, Z1), V(0, R, rz), V(0, R, -rz)], white, [
    [-Z1 / t, 0],
    [Z1 / t, 0],
    [rz / t, sl / t],
    [-rz / t, sl / t],
  ]);
  rb.poly([V(X1, E, Z1), V(X1, E, -Z1), V(0, R, -rz), V(0, R, rz)], white, [
    [Z1 / t, 0],
    [-Z1 / t, 0],
    [-rz / t, sl / t],
    [rz / t, sl / t],
  ]);
  rb.poly([V(X1, E, -Z1), V(-X1, E, -Z1), V(0, R, -rz)], white, [
    [X1 / t, 0],
    [-X1 / t, 0],
    [0, sl / t],
  ]);
  rb.poly([V(-X1, E, Z1), V(X1, E, Z1), V(0, R, rz)], white, [
    [-X1 / t, 0],
    [X1 / t, 0],
    [0, sl / t],
  ]);

  const b = B.st;
  const steel = C(PAL.steel);
  const capCol = C("#4b5256");
  // fascia, ridge and hip caps
  const corners = [V(-X1, E, -Z1), V(-X1, E, Z1), V(X1, E, Z1), V(X1, E, -Z1)];
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const c = corners[(i + 1) % 4];
    beam(b, V(a.x, E - 0.06, a.z), V(c.x, E - 0.06, c.z), 0.05, 0.16, steel);
  }
  beam(b, V(0, R + 0.03, -rz - 0.05), V(0, R + 0.03, rz + 0.05), 0.3, 0.06, capCol);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) beam(b, V(sx * X1, E + 0.03, sz * Z1), V(0, R + 0.03, sz * rz), 0.24, 0.05, capCol);

  // posts on the parapet, eaves beam, a few light trusses
  for (const fd of facades) {
    const f = fd.frame;
    const n = Math.max(2, Math.round(fd.len / 3));
    for (let i = 0; i <= n; i++) {
      const s = 0.5 + ((fd.len - 1) * i) / n;
      if (fd.portal && s > fd.portal[0] - 0.3 && s < fd.portal[1] + 0.3) continue;
      const p = f.p(s, 0, -0.12);
      const top = roofHeight(p.x, p.z) - 0.03;
      wbox(b, p.x, (PARAPET_TOP + top) / 2, p.z, 0.1, top - PARAPET_TOP, 0.1, steel, BOTTOM | TOP);
    }
    const a = f.p(-0.6, 0, -0.12);
    const c = f.p(fd.len + 0.6, 0, -0.12);
    const yb = roofHeight(a.x * 0.5 + c.x * 0.5, a.z * 0.5 + c.z * 0.5) - 0.1;
    beam(b, V(a.x, yb, a.z), V(c.x, yb, c.z), 0.08, 0.14, steel);
  }
  if (!q.low) {
    for (const z of [-6, -2, 2, 6]) {
      const yt = roofHeight(HX - 0.12, z) - 0.1;
      beam(b, V(-HX + 0.12, yt, z), V(HX - 0.12, yt, z), 0.07, 0.12, steel);
      beam(b, V(-HX + 0.12, yt + 0.05, z), V(0, R - 0.12, z), 0.07, 0.1, steel);
      beam(b, V(HX - 0.12, yt + 0.05, z), V(0, R - 0.12, z), 0.07, 0.1, steel);
      beam(b, V(0, yt, z), V(0, R - 0.12, z), 0.06, 0.06, steel, V(1, 0, 0));
    }
  }
  // warm bulbs under the eaves (night)
  const savedUV = b.defUV;
  b.defUV = b.lampUV;
  for (const fd of facades) {
    const p = fd.frame.p(fd.len / 2, 0, -0.2);
    wbox(b, p.x, roofHeight(p.x, p.z) - 0.35, p.z, 0.14, 0.14, 0.14, C("#fff1d6"));
  }
  b.defUV = savedUV;
}

function buildCompound(b: Builder, gx: number) {
  const wall = C(PAL.compound);
  const capC = C("#e1dcd2");
  const pillar = C("#ddd7cc");
  const gateP = C(PAL.cream);
  type Run = { a: Pt; c: Pt; gaps: Pt[] };
  const runs: Run[] = [
    { a: [-PLOT_X, -PLOT_Z], c: [PLOT_X, -PLOT_Z], gaps: [[PLOT_X + gx - GATE_W / 2, PLOT_X + gx + GATE_W / 2]] },
    { a: [PLOT_X, -PLOT_Z], c: [PLOT_X, PLOT_Z], gaps: [] },
    { a: [PLOT_X, PLOT_Z], c: [-PLOT_X, PLOT_Z], gaps: [] },
    { a: [-PLOT_X, PLOT_Z], c: [-PLOT_X, -PLOT_Z], gaps: [[PLOT_Z - GATE_W / 2, PLOT_Z + GATE_W / 2]] },
  ];
  b.shade = (_x, y) => 0.76 + 0.24 * Math.min(1, Math.max(0, y / 0.8));
  for (const run of runs) {
    const dx = run.c[0] - run.a[0];
    const dz = run.c[1] - run.a[1];
    const len = Math.hypot(dx, dz);
    const ux = dx / len;
    const uz = dz / len;
    const P = (t: number): Pt => [run.a[0] + ux * t, run.a[1] + uz * t];
    const segs: Pt[] = [];
    let t0 = 0;
    for (const g of run.gaps) {
      segs.push([t0, g[0]]);
      t0 = g[1];
    }
    segs.push([t0, len]);
    const f = new Frame(V(run.a[0], 0, run.a[1]), V(-uz, 0, ux));
    for (const [sa, sb] of segs) {
      const n = Math.max(1, Math.round((sb - sa) / 3.2));
      for (let i = 0; i <= n; i++) {
        const s = sa + ((sb - sa) * i) / n;
        const gate = (i === 0 && sa > 0) || (i === n && sb < len);
        if (i === n && !gate && sb >= len) continue; // corner pillar comes with the next run
        const [px, pz] = P(s);
        const half = gate ? 0.32 : 0.21;
        const hh = gate ? 1.95 : 1.55;
        wbox(b, px, hh / 2, pz, half * 2, hh, half * 2, gate ? gateP : pillar, BOTTOM);
        wbox(b, px, hh + 0.05, pz, half * 2 + 0.1, 0.1, half * 2 + 0.1, capC, BOTTOM);
        if (gate) wbox(b, px, hh + 0.22, pz, 0.22, 0.24, 0.22, capC, BOTTOM);
        if (i < n) {
          fbox(b, f, s + half, s + (sb - sa) / n - 0.21, 0, 1.3, -0.12, 0.12, wall, BOTTOM);
          fbox(b, f, s + half, s + (sb - sa) / n - 0.21, 1.3, 1.4, -0.16, 0.16, capC, BOTTOM);
        }
      }
    }
  }
  b.shade = null;
}

// ───────────────────────────────────────────── assembly

export function buildCommunityBuilding(ctx: ModelContext): ModelHandle {
  const low = ctx.lowPower;
  const q: Quality = {
    low,
    domeSeg: low ? 20 : 48,
    domePts: low ? 12 : 26,
    curve: low ? 3 : 7,
    colSeg: low ? 6 : 10,
    finSeg: low ? 8 : 12,
  };
  const group = new THREE.Group();
  group.name = "community-building";

  // ── facades (s runs left to right seen from outside)
  const tallW = 2 * TALL_H - 2 * TALL_C;
  const tallCh = TALL_C * Math.SQRT2;
  const west = new Frame(V(-HX, 0, -HZ - TP + TW), V(-1, 0, 0));
  const east = new Frame(V(HX, 0, HZ + TP - TW), V(1, 0, 0));
  const north = new Frame(V(HX + TALL_P - 2 * TALL_H, 0, -HZ), V(0, 0, -1));
  const south = new Frame(V(-HX - TP + TW, 0, HZ), V(0, 0, 1));
  const westLen = 2 * (HZ + TP - TW);
  const eastLen = HZ + TP - TW + HZ + TALL_P - 2 * TALL_H;
  const northLen = HX + TALL_P - 2 * TALL_H + HX + TP - TW;
  const southLen = 2 * (HX + TP - TW);
  const portalW = 5.2;
  const P0 = (northLen - portalW) / 2;
  const P1 = P0 + portalW;
  const nSpan = P0 - 0.55;
  const facades: FacadeDef[] = [
    { key: "west", frame: west, len: westLen, ...evenBays(westLen, 5), seed: 11 },
    { key: "east", frame: east, len: eastLen, ...evenBays(eastLen, 5), seed: 12 },
    { key: "south", frame: south, len: southLen, ...evenBays(southLen, 4), seed: 13 },
    {
      key: "north",
      frame: north,
      len: northLen,
      pilasters: [0.275, northLen - 0.275],
      bays: [
        { c: 0.55 + nSpan / 2, span: nSpan },
        { c: P1 + nSpan / 2, span: nSpan },
      ],
      portal: [P0, P1],
      seed: 14,
    },
  ];

  // ── atlas
  const specs: Array<[string, number, number]> = [
    ...facades.map((fd): [string, number, number] => [fd.key, fd.len, PARAPET_TOP]),
    ["towerJali", TW, TOWER_TOP],
    ["towerPlain", TW, TOWER_TOP],
    ["tallMain", tallW, TALL_SHAFT],
    ["tallChamfer", tallCh, TALL_SHAFT],
    ["pilaster", PIL_W, CORNICE_Y0],
    ["portalBack", portalW - 1.5, 8.55],
    ["sw_white", 0.6, 0.6],
    ["sw_lamp", 0.6, 0.6],
  ];
  const atlas = new Atlas(specs, low ? 1024 : 2048, low ? 24 : 48, 0.5);
  for (const fd of facades) paintFacade(atlas, fd);
  paintTowerFace(atlas, "towerJali", true, 31);
  paintTowerFace(atlas, "towerPlain", false, 32);
  paintTallFace(atlas, "tallMain", true, 41);
  paintTallFace(atlas, "tallChamfer", false, 42);
  paintPilaster(atlas, CORNICE_Y0);
  paintPortalBack(atlas);
  atlas.grain([...facades.map((f) => f.key), "towerJali", "towerPlain", "tallMain", "tallChamfer", "pilaster", "portalBack"], 7, low ? 6 : 9);
  paintSwatch(atlas, "sw_white", "#ffffff", "#000000");
  paintSwatch(atlas, "sw_lamp", "#ffffff", "#ffffff");

  const atlasTex = new THREE.CanvasTexture(atlas.canvas);
  atlasTex.colorSpace = THREE.SRGBColorSpace;
  atlasTex.anisotropy = ctx.anisotropy;
  const glowTex = new THREE.CanvasTexture(atlas.ecanvas);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  glowTex.anisotropy = ctx.anisotropy;
  const [roofMap, roofNrm] = roofTextures(low ? 128 : 256, ctx.anisotropy);
  const paverMap = paverTexture(low ? 160 : 320, ctx.anisotropy);
  const domeGlow = domeGlowTexture();

  // ── builders
  const st = new Builder(atlas.uv("sw_white", 0.3, 0.3));
  st.lampUV = atlas.uv("sw_lamp", 0.3, 0.3);
  const B: Builders = { st, dome: new Builder(), bronze: new Builder(), roof: new Builder() };

  for (const fd of facades) buildFacade(B, atlas, fd, q);
  buildPortal(B, atlas, north, P0, P1, q);

  const tc = TW / 2 - TP; // tower centre offset from the wall line
  // faces in outline order: west, south, east, north
  buildCornerTower(B, atlas, -HX + tc, -HZ + tc, ["towerJali", "towerPlain", "towerPlain", "towerJali"], [0, 3], 1.85, 3.0, 0.7, q);
  buildCornerTower(B, atlas, -HX + tc, HZ - tc, ["towerPlain", "towerJali", "towerPlain", "towerPlain"], [0, 1], 1.72, 2.8, 0.62, q);
  buildCornerTower(B, atlas, HX - tc, HZ - tc, ["towerPlain", "towerPlain", "towerJali", "towerPlain"], [1, 2], 1.15, 1.9, 0.4, q);
  buildTallTower(B, atlas, q);
  buildRoof(B, facades, q);

  // terrace floor
  st.poly([V(-HX + 0.2, CORNICE_Y1, -HZ + 0.2), V(-HX + 0.2, CORNICE_Y1, HZ - 0.2), V(HX - 0.2, CORNICE_Y1, HZ - 0.2), V(HX - 0.2, CORNICE_Y1, -HZ + 0.2)], C(PAL.terrace));
  // plinth walkway and entrance steps
  const px = HX + 1.25;
  const pz = HZ + 1.25;
  wbox(st, 0, PLINTH_H / 2, 0, 2 * px, PLINTH_H, 2 * pz, (face) => (face === 1 ? C(PAL.stone) : C(PAL.brown)), BOTTOM);
  const doorX = north.p((P0 + P1) / 2, 0, 0).x;
  for (let i = 0; i < 2; i++) {
    const h = PLINTH_H * (2 - i) / 3;
    wbox(st, doorX, h / 2, -pz - 0.2 - i * 0.38, portalW + 0.8, h, 0.4 + i * 0.36, (face) => (face === 1 ? C(PAL.stone) : C("#a79e90")), BOTTOM);
  }
  buildCompound(st, doorX);

  // ── materials and meshes
  const stuccoMat = new THREE.MeshStandardMaterial({
    map: atlasTex,
    emissiveMap: glowTex,
    emissive: new THREE.Color("#ffcf8f"),
    emissiveIntensity: 0,
    vertexColors: true,
    roughness: 0.86,
    metalness: 0,
  });
  const domeMat = new THREE.MeshStandardMaterial({
    color: PAL.dome,
    roughness: 0.62,
    metalness: 0,
    emissive: new THREE.Color("#ffd7a3"),
    emissiveMap: domeGlow,
    emissiveIntensity: 0,
  });
  const bronzeMat = new THREE.MeshStandardMaterial({ color: PAL.bronze, metalness: 0.7, roughness: 0.32 });
  const roofMat = new THREE.MeshStandardMaterial({
    map: roofMap,
    normalMap: roofNrm,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 0.52,
    metalness: 0.35,
    side: THREE.DoubleSide,
  });
  const paverMat = new THREE.MeshStandardMaterial({ map: paverMap, roughness: 0.93, vertexColors: true });

  const meshes: THREE.Mesh[] = [];
  const addMesh = (name: string, g: THREE.BufferGeometry, m: THREE.Material, cast: boolean, receive: boolean) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.name = name;
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    group.add(mesh);
    meshes.push(mesh);
  };
  addMesh("stucco", st.geometry(), stuccoMat, true, true);
  addMesh("domes", B.dome.geometry(), domeMat, true, true);
  addMesh("finials", B.bronze.geometry(), bronzeMat, true, false);
  addMesh("roof", B.roof.geometry(), roofMat, true, true);

  // paved courtyard
  const pv = new Builder();
  const cx0 = -PLOT_X + 0.12;
  const cx1 = PLOT_X - 0.12;
  const cz0 = -PLOT_Z + 0.12;
  const cz1 = PLOT_Z - 0.12;
  // a grid whose lines follow the plinth and the walls, so a soft occlusion
  // falloff can be baked into vertex colours (the building sits in the ground)
  const grid = (lo: number, hi: number, plinth: number) => {
    const keys = [lo, hi, -plinth, plinth, -plinth - 1.1, plinth + 1.1, -plinth - 2.6, plinth + 2.6, lo + 0.9, hi - 0.9];
    const out: number[] = [];
    const sorted = [...new Set(keys.map((k) => Math.round(k * 100) / 100))].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const n = Math.max(1, Math.ceil((b - a) / 2.6));
      for (let k = 0; k < n; k++) out.push(a + ((b - a) * k) / n);
    }
    out.push(hi);
    return out;
  };
  const xs = grid(cx0, cx1, px);
  const zs = grid(cz0, cz1, pz);
  const rnd = mulberry32(77);
  const smooth = (t: number) => {
    const u = clamp01(t);
    return u * u * (3 - 2 * u);
  };
  const occ = (x: number, z: number) => {
    const db = Math.max(Math.abs(x) - px, Math.abs(z) - pz);
    const dw = Math.min(cx1 - Math.abs(x), cz1 - Math.abs(z));
    return (0.62 + 0.38 * smooth(db / 2.6)) * (0.78 + 0.22 * smooth(dw / 0.9)) * (0.96 + rnd() * 0.08);
  };
  const shadeAt = new Map<string, number>();
  const shadeOf = (x: number, z: number) => {
    const k = `${x.toFixed(2)},${z.toFixed(2)}`;
    let v = shadeAt.get(k);
    if (v === undefined) {
      v = occ(x, z);
      shadeAt.set(k, v);
    }
    return v;
  };
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      const x0 = xs[i];
      const x1 = xs[i + 1];
      const z0 = zs[j];
      const z1 = zs[j + 1];
      if (Math.abs((x0 + x1) / 2) < px - 0.05 && Math.abs((z0 + z1) / 2) < pz - 0.05) continue; // under the plinth
      const corners: Pt[] = [
        [x0, z0],
        [x0, z1],
        [x1, z1],
        [x1, z0],
      ];
      const pts = corners.map(([x, z]) => V(x, 0.03, z));
      const uvs = corners.map(([x, z]): UV => [x / 2, -z / 2]);
      const n = V(0, 1, 0);
      for (const t of [
        [0, 1, 2],
        [0, 2, 3],
      ]) {
        for (const k of t) {
          const g = shadeOf(corners[k][0], corners[k][1]);
          pv.vert(pts[k], n, uvs[k], new THREE.Color(g, g, g));
        }
      }
    }
  }
  addMesh("courtyard", pv.geometry(), paverMat, false, true);

  // ── night light by the portal
  const lamp = new THREE.PointLight("#ffcf8f", 0, 22, 2);
  lamp.position.copy(north.p((P0 + P1) / 2, 5.2, 3.2));
  group.add(lamp);

  const setNight = (n: number) => {
    const k = clamp01(n);
    stuccoMat.emissiveIntensity = k * 1.6;
    domeMat.emissiveIntensity = k * 0.3;
    lamp.intensity = k * 12;
  };
  setNight(0);

  return {
    group,
    setNight,
    dispose() {
      for (const m of meshes) m.geometry.dispose();
      for (const m of [stuccoMat, domeMat, bronzeMat, roofMat, paverMat]) m.dispose();
      for (const t of [atlasTex, glowTex, roofMap, roofNrm, paverMap, domeGlow]) t.dispose();
      lamp.dispose();
      // release the canvas backing stores right away
      for (const cv of [atlas.canvas, atlas.ecanvas]) {
        cv.width = 1;
        cv.height = 1;
      }
      group.clear();
    },
  };
}
