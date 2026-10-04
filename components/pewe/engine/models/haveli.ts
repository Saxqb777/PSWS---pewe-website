import * as THREE from "three";
import type { ModelContext, ModelHandle } from "../types";

/*
 * The Pewe haveli: the village's oldest house, where the families once lived
 * together. A long two-storey lime-washed block under a Mangalore-tile hip
 * roof, with a tiled skirt roof wrapping the building between the floors, a
 * small gabled entrance porch and a laterite compound wall with globe lamps.
 *
 * Local frame: origin = centre of the house footprint at ground level.
 * The house runs north-south along Z (40 m) and is 11 m deep along X.
 * The main facade faces -X (west); the compound wall stands 6 m in front of it.
 */

// ---------------------------------------------------------------------------
// small toolkit (kept local so every model module stands on its own)
// ---------------------------------------------------------------------------

type Rand = () => number;
type Noise2 = (u: number, v: number) => number;
type V3 = [number, number, number];

function makeRand(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth value noise that tiles over the unit square (period n cells). */
function periodicNoise(rand: Rand, n: number): Noise2 {
  const g = new Float32Array(n * n);
  for (let i = 0; i < g.length; i++) g[i] = rand();
  return (u, v) => {
    const x = (((u % 1) + 1) % 1) * n;
    const y = (((v % 1) + 1) % 1) * n;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const x1 = (x0 + 1) % n, y1 = (y0 + 1) % n;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = g[y0 * n + x0], b = g[y0 * n + x1], c = g[y1 * n + x0], d = g[y1 * n + x1];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = Math.max(4, Math.round(w));
  c.height = Math.max(4, Math.round(h));
  const g = c.getContext("2d");
  if (!g) throw new Error("haveli: 2D canvas unavailable");
  return [c, g];
}

/** Height field -> tangent-space normal map (wrapping, OpenGL convention). */
function normalCanvas(h: Float32Array, w: number, hh: number, strength: number): HTMLCanvasElement {
  const [c, g] = makeCanvas(w, hh);
  const img = g.createImageData(w, hh);
  const d = img.data;
  for (let y = 0; y < hh; y++) {
    const yu = (y - 1 + hh) % hh, yd = (y + 1) % hh;
    for (let x = 0; x < w; x++) {
      const xl = (x - 1 + w) % w, xr = (x + 1) % w;
      const dx = (h[y * w + xr] - h[y * w + xl]) * strength;
      const dy = (h[yd * w + x] - h[yu * w + x]) * strength; // canvas y runs down = -v
      const nx = -dx, ny = dy, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      const i = (y * w + x) * 4;
      d[i] = (nx / l * 0.5 + 0.5) * 255;
      d[i + 1] = (ny / l * 0.5 + 0.5) * 255;
      d[i + 2] = (nz / l * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** World-metre UVs projected along the dominant axis of each triangle. */
function boxUV(geo: THREE.BufferGeometry): void {
  const p = geo.getAttribute("position") as THREE.BufferAttribute;
  const uv = new Float32Array(p.count * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i + 2 < p.count; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    const n = b.sub(a).cross(c.sub(a));
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    for (let k = i; k < i + 3; k++) {
      const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
      let u: number, v: number;
      if (ay >= ax && ay >= az) { u = x; v = n.y > 0 ? -z : z; }
      else if (ax >= az) { u = n.x > 0 ? -z : z; v = y; }
      else { u = n.z > 0 ? x : -x; v = y; }
      uv[k * 2] = u;
      uv[k * 2 + 1] = v;
    }
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

/** Collects geometry per material key and merges each bucket into one mesh. */
class Batch {
  private parts = new Map<string, THREE.BufferGeometry[]>();

  add(key: string, geo: THREE.BufferGeometry, m?: THREE.Matrix4 | null, uvMode: "box" | "keep" = "box"): void {
    let g = geo;
    if (geo.index) {
      g = geo.toNonIndexed();
      geo.dispose();
    }
    if (m) g.applyMatrix4(m);
    if (!g.getAttribute("normal")) g.computeVertexNormals();
    if (uvMode === "box") boxUV(g);
    else if (!g.getAttribute("uv")) {
      g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.getAttribute("position").count * 2), 2));
    }
    const list = this.parts.get(key);
    if (list) list.push(g);
    else this.parts.set(key, [g]);
  }

  build(
    group: THREE.Group,
    mats: Record<string, THREE.Material>,
    shadows: (key: string) => [boolean, boolean],
    out: THREE.BufferGeometry[],
  ): void {
    for (const [key, list] of this.parts) {
      const mat = mats[key];
      if (!mat) throw new Error("haveli: no material " + key);
      let n = 0;
      for (const g of list) n += g.getAttribute("position").count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
      let o = 0;
      for (const g of list) {
        const c = g.getAttribute("position").count;
        pos.set((g.getAttribute("position") as THREE.BufferAttribute).array as Float32Array, o * 3);
        nor.set((g.getAttribute("normal") as THREE.BufferAttribute).array as Float32Array, o * 3);
        uv.set((g.getAttribute("uv") as THREE.BufferAttribute).array as Float32Array, o * 2);
        o += c;
        g.dispose();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = "haveli-" + key;
      const [cast, recv] = shadows(key);
      mesh.castShadow = cast;
      mesh.receiveShadow = recv;
      group.add(mesh);
      out.push(geo);
    }
    this.parts.clear();
  }
}

function boxGeo(w: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

/** Box given by its min/max corners. */
function boxMM(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): THREE.BufferGeometry {
  return boxGeo(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}

/** Planar convex polygon (fan) with explicit UVs; winding sets the facing. */
function polyGeo(pts: V3[], uvs: [number, number][]): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [];
  for (let i = 1; i < pts.length - 1; i++) {
    for (const k of [0, i, i + 1]) {
      pos.push(pts[k][0], pts[k][1], pts[k][2]);
      uv.push(uvs[k][0], uvs[k][1]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/** Cylinder from a to b. */
function rodGeo(a: V3, b: V3, r: number, seg: number): THREE.BufferGeometry {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1, false);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(va.add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  return g;
}

// ---------------------------------------------------------------------------
// canvas painters
// ---------------------------------------------------------------------------

const LIME_W = 8, LIME_H = 8; // metres covered by the lime-wall texture

/** Lime-washed wall, weathered at the foot, with faint grime under the eaves. */
function paintLime(ppm: number, rand: Rand): HTMLCanvasElement {
  const W = Math.round(LIME_W * ppm), H = Math.round(LIME_H * ppm);
  const [c, g] = makeCanvas(W, H);
  const n1 = periodicNoise(rand, 5), n2 = periodicNoise(rand, 13), n3 = periodicNoise(rand, 37);
  const edge = periodicNoise(rand, 23), edge2 = periodicNoise(rand, 61);
  const img = g.createImageData(W, H);
  const d = img.data;
  for (let py = 0; py < H; py++) {
    const ym = (H - py - 0.5) / ppm; // metres above ground
    const v = py / H;
    for (let px = 0; px < W; px++) {
      const u = px / W;
      let r = 238, gg = 236, b = 230;
      const k = 1 + (n1(u, v) - 0.5) * 0.06 + (n2(u, v) - 0.5) * 0.04 + (n3(u, v) - 0.5) * 0.03;
      r *= k; gg *= k; b *= k * 0.995;
      // damp, algae-tinged foot of the wall (monsoon splash zone)
      const eh = 0.75 + 0.55 * edge(u, 0.31) + 0.25 * edge2(u, 0.77);
      if (ym < eh) {
        const t = 1 - ym / eh;
        const w = 0.66 * t * Math.sqrt(t) * (0.75 + 0.5 * n3(u, v));
        r += (126 - r) * w; gg += (124 - gg) * w; b += (106 - b) * w;
      }
      // splash line above the skirt roof (the skirt meets the wall at 4.6 m)
      if (ym > 4.55 && ym < 5.05) {
        const w = 0.16 * (1 - (ym - 4.55) / 0.5) * (0.6 + 0.6 * n2(u, 0.5));
        r += (150 - r) * w; gg += (144 - gg) * w; b += (128 - b) * w;
      }
      // grime tucked under the main eaves
      if (ym > 7.15) {
        const w = 0.14 * smooth(7.15, 7.6, ym);
        r += (160 - r) * w; gg += (154 - gg) * w; b += (140 - b) * w;
      }
      const gr = (rand() - 0.5) * 7;
      const i = (py * W + px) * 4;
      d[i] = r + gr; d[i + 1] = gg + gr; d[i + 2] = b + gr; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // faint rain streaks below the eaves and the skirt line
  for (let s = 0; s < 26; s++) {
    const x = rand() * W;
    const top = rand() < 0.5 ? 7.4 : 4.4;
    const len = 0.6 + rand() * 1.8;
    const grad = g.createLinearGradient(0, (LIME_H - top) * ppm, 0, (LIME_H - top + len) * ppm);
    grad.addColorStop(0, "rgba(120,114,100,0.10)");
    grad.addColorStop(1, "rgba(120,114,100,0)");
    g.fillStyle = grad;
    g.fillRect(x, (LIME_H - top) * ppm, Math.max(1, ppm * (0.04 + rand() * 0.08)), len * ppm);
  }
  return c;
}

const TILE_W = 0.35, TILE_H = 0.25, TILE_NC = 40, TILE_NR = 28;
const TILE_WM = TILE_W * TILE_NC, TILE_HM = TILE_H * TILE_NR; // 14 m x 7 m

/** Mangalore tiles: colour canvas + height field for the normal map. */
function paintTiles(ppm: number, rand: Rand): { color: HTMLCanvasElement; normal: HTMLCanvasElement } {
  const W = Math.round(TILE_WM * ppm), H = Math.round(TILE_HM * ppm);
  const [c, g] = makeCanvas(W, H);
  const img = g.createImageData(W, H);
  const d = img.data;
  const hgt = new Float32Array(W * H);
  const blot = periodicNoise(rand, 3), blot2 = periodicNoise(rand, 7);
  const streak = periodicNoise(rand, TILE_NC); // one value per tile column
  const cols: number[][] = [];
  for (let r = 0; r < TILE_NR; r++) {
    for (let q = 0; q < TILE_NC; q++) {
      const u = (q + 0.5) / TILE_NC, v = (r + 0.5) / TILE_NR;
      const k = 0.9 + rand() * 0.14;
      let cr = 180 * k, cg = 82 * k * (0.95 + rand() * 0.1), cb = 58 * k;
      // lichen / soot streaks running down the slope, plus a faint broad mottle
      const st = smooth(0.58, 0.92, streak(u, 0.5)) * (0.45 + 0.55 * blot2(u, v));
      const w = 0.42 * st + 0.16 * smooth(0.45, 0.9, blot(u, v)) + (rand() < 0.05 ? 0.18 : 0);
      cr += (92 - cr) * w; cg += (66 - cg) * w; cb += (54 - cb) * w;
      if (rand() < 0.03) { cr = cr * 0.65 + 204 * 0.35; cg = cg * 0.65 + 110 * 0.35; cb = cb * 0.65 + 76 * 0.35; }
      cols.push([cr, cg, cb]);
    }
  }
  const tw = W / TILE_NC, th = H / TILE_NR;
  for (let y = 0; y < H; y++) {
    const r = Math.min(TILE_NR - 1, Math.floor(y / th));
    const fy = (y + 0.5 - r * th) / th; // 0 = up-slope edge, 1 = lip
    for (let x = 0; x < W; x++) {
      const q = Math.min(TILE_NC - 1, Math.floor(x / tw));
      const fx = (x + 0.5 - q * tw) / tw;
      const col = cols[r * TILE_NC + q];
      const prof = Math.cos(fx * Math.PI * 4) * 0.5 + 0.5; // two channels per tile
      let s = 0.9 + 0.13 * prof;
      if (fy < 0.28) s *= 0.5 + 0.5 * (fy / 0.28); // shadow under the lip above
      if (fy > 0.84) s *= 1.1; // lit lip
      if (fx < 0.06) s *= 0.82; // side interlock
      const gr = (rand() - 0.5) * 9;
      const i = (y * W + x) * 4;
      d[i] = col[0] * s + gr; d[i + 1] = col[1] * s + gr; d[i + 2] = col[2] * s + gr; d[i + 3] = 255;
      hgt[y * W + x] = 0.15 + 0.85 * fy + 0.18 * prof;
    }
  }
  g.putImageData(img, 0, 0);
  return { color: c, normal: normalCanvas(hgt, W, H, 1.6) };
}

const LAT_WM = 4, LAT_HM = 2, LAT_BW = 0.4, LAT_BH = 0.2;

/** Laterite blocks with mortar joints and the usual pitted surface. */
function paintLaterite(ppm: number, rand: Rand): HTMLCanvasElement {
  const W = Math.round(LAT_WM * ppm), H = Math.round(LAT_HM * ppm);
  const [c, g] = makeCanvas(W, H);
  g.fillStyle = "#8f7b6b";
  g.fillRect(0, 0, W, H);
  const bw = LAT_BW * ppm, bh = LAT_BH * ppm, mj = Math.max(1, 0.018 * ppm);
  const rows = Math.round(LAT_HM / LAT_BH), colsN = Math.round(LAT_WM / LAT_BW);
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? bw / 2 : 0;
    for (let q = -1; q < colsN + 1; q++) {
      const x = q * bw + off, y = r * bh;
      const k = 0.88 + rand() * 0.16;
      const ochre = rand() * 0.12; // some blocks lean ochre, some deeper rust
      const cr = 155 * k, cg = 79 * k * (0.94 + ochre), cb = 53 * k * (0.96 + ochre * 0.3);
      g.fillStyle = `rgb(${cr | 0},${cg | 0},${cb | 0})`;
      g.fillRect(x + mj / 2, y + mj / 2, bw - mj, bh - mj);
      // sun-bleached top edge, darker underside
      g.fillStyle = "rgba(255,220,190,0.07)";
      g.fillRect(x + mj / 2, y + mj / 2, bw - mj, bh * 0.25);
      g.fillStyle = "rgba(40,15,10,0.10)";
      g.fillRect(x + mj / 2, y + bh * 0.72, bw - mj, bh * 0.28 - mj / 2);
    }
  }
  // vesicular pits and pale specks of the laterite
  const pits = Math.round(W * H * 0.05);
  for (let i = 0; i < pits; i++) {
    const x = rand() * W, y = rand() * H, s = rand() < 0.85 ? 1 : 2;
    g.fillStyle = rand() < 0.75 ? "rgba(52,22,14,0.28)" : "rgba(200,160,118,0.2)";
    g.fillRect(x, y, s, s);
  }
  // soil splash at the foot
  const grad = g.createLinearGradient(0, H, 0, H - 0.45 * ppm);
  grad.addColorStop(0, "rgba(58,38,28,0.45)");
  grad.addColorStop(1, "rgba(58,38,28,0)");
  g.fillStyle = grad;
  g.fillRect(0, H - 0.45 * ppm, W, 0.45 * ppm);
  return c;
}

/** Panelled double door in dark teak. */
function paintDoor(pw: number, ph: number, rand: Rand): HTMLCanvasElement {
  const [c, g] = makeCanvas(pw, ph);
  const W = c.width, H = c.height;
  g.fillStyle = "#3b2617";
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < W; i += 1) {
    g.fillStyle = `rgba(${rand() < 0.5 ? "20,10,4" : "92,60,36"},${0.08 + rand() * 0.12})`;
    g.fillRect(i, 0, 1, H);
  }
  const leaf = W / 2;
  for (let l = 0; l < 2; l++) {
    const x0 = l * leaf;
    const mx = leaf * 0.16, panels = [0.08, 0.36, 0.44, 0.92];
    for (let p = 0; p < 3; p++) {
      if (p === 1) continue;
      const y0 = panels[p] * H, y1 = panels[p + 1] * H;
      const px0 = x0 + mx, px1 = x0 + leaf - mx;
      g.fillStyle = "rgba(255,210,160,0.06)";
      g.fillRect(px0, y0, px1 - px0, y1 - y0);
      g.fillStyle = "rgba(10,5,2,0.55)";
      g.fillRect(px0, y0, px1 - px0, 2);
      g.fillRect(px0, y0, 2, y1 - y0);
      g.fillStyle = "rgba(150,110,70,0.35)";
      g.fillRect(px0, y1 - 2, px1 - px0, 2);
      g.fillRect(px1 - 2, y0, 2, y1 - y0);
      // brass studs
      g.fillStyle = "rgba(196,160,92,0.75)";
      for (let sy = y0 + 6; sy < y1 - 4; sy += Math.max(8, H * 0.07)) {
        g.fillRect(px0 + (px1 - px0) / 2 - 1, sy, 2, 2);
      }
    }
  }
  g.fillStyle = "rgba(8,4,2,0.9)";
  g.fillRect(W / 2 - 1, 0, 2, H);
  g.fillStyle = "rgba(200,165,95,0.9)";
  g.fillRect(W / 2 - 5, H * 0.5, 3, 3);
  g.fillRect(W / 2 + 2, H * 0.5, 3, 3);
  return c;
}

/** Warm, slightly uneven glow for lit windows (used as an emissive map). */
function paintGlow(rand: Rand): HTMLCanvasElement {
  const [c, g] = makeCanvas(64, 64);
  const grad = g.createRadialGradient(32, 40, 4, 32, 36, 46);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.55, "#d9d2c6");
  grad.addColorStop(1, "#6f665a");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  // a drawn curtain on one side
  g.fillStyle = `rgba(60,40,24,${0.25 + rand() * 0.2})`;
  g.fillRect(0, 0, 14 + rand() * 6, 64);
  return c;
}

/** Window glass: a faint sky reflection fading into the dark room behind. */
function paintGlass(): HTMLCanvasElement {
  const [c, g] = makeCanvas(8, 64);
  const grad = g.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, "#8d9ea6");
  grad.addColorStop(0.4, "#46545b");
  grad.addColorStop(1, "#1b2124");
  g.fillStyle = grad;
  g.fillRect(0, 0, 8, 64);
  return c;
}

// ---------------------------------------------------------------------------
// the model
// ---------------------------------------------------------------------------

const HX = 5.5; // half depth (X)
const HZ = 20; // half length (Z)
const WALL_T = 0.4;
const WALL_H = 7.6;
const FLOOR = 0.5; // plinth / ground-floor level

type Kind = "up" | "gw" | "door" | "vent";
interface Opening { s: number; y0: number; w: number; h: number; kind: Kind }

export function buildHaveli(ctx: ModelContext): ModelHandle {
  const low = ctx.lowPower;
  const ppm = low ? 20 : 40;
  const rand = makeRand(0x9e3779b1);

  const group = new THREE.Group();
  group.name = "haveli";
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];

  const tex = (canvas: HTMLCanvasElement, wm: number, hm: number, srgb: boolean): THREE.CanvasTexture => {
    const t = new THREE.CanvasTexture(canvas);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ctx.anisotropy;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / wm, 1 / hm);
    t.needsUpdate = true;
    textures.push(t);
    return t;
  };
  const std = (p: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial => {
    const m = new THREE.MeshStandardMaterial(p);
    materials.push(m);
    return m;
  };

  // ---- textures ----
  const limeMap = tex(paintLime(ppm, rand), LIME_W, LIME_H, true);
  const tiles = paintTiles(ppm, rand);
  const tileMap = tex(tiles.color, TILE_WM, TILE_HM, true);
  const tileNrm = tex(tiles.normal, TILE_WM, TILE_HM, false);
  const latMap = tex(paintLaterite(ppm * 1.6, rand), LAT_WM, LAT_HM, true);
  const doorMap = tex(paintDoor(1.5 * ppm * 2, 2.4 * ppm * 2, rand), 1, 1, true);
  const glowMap = tex(paintGlow(rand), 1, 1, true);
  const glassMap = tex(paintGlass(), 1, 1, true);
  glassMap.wrapS = glassMap.wrapT = THREE.ClampToEdgeWrapping;
  doorMap.wrapS = doorMap.wrapT = THREE.ClampToEdgeWrapping;
  glowMap.wrapS = glowMap.wrapT = THREE.ClampToEdgeWrapping;

  // ---- materials ----
  const glassLit = std({ map: glassMap, roughness: 0.2, metalness: 0.1, emissive: "#ffcf8f", emissiveMap: glowMap, emissiveIntensity: 0 });
  const globe = std({ color: "#f3efe6", roughness: 0.35, emissive: "#ffd9a0", emissiveIntensity: 0 });
  const M: Record<string, THREE.Material> = {
    wall: std({ map: limeMap, roughness: 0.93 }),
    trim: std({ color: "#ebe7de", roughness: 0.82 }),
    laterite: std({ map: latMap, roughness: 0.95 }),
    coping: std({ color: "#9a948a", roughness: 0.92 }),
    frame: std({ color: "#1d2a23", roughness: 0.55 }),
    glassDark: std({ map: glassMap, roughness: 0.2, metalness: 0.1 }),
    glassLit,
    door: std({ map: doorMap, roughness: 0.7 }),
    tile: std({ map: tileMap, normalMap: tileNrm, roughness: 0.82 }),
    ridge: std({ color: "#8e3b29", roughness: 0.85 }),
    soffit: std({ color: "#d6d0c4", roughness: 0.9 }),
    wood: std({ color: "#4d3a2a", roughness: 0.85 }),
    iron: std({ color: "#2a2b2a", roughness: 0.6, metalness: 0.4 }),
    stone: std({ color: "#857e73", roughness: 0.95 }),
    floor: std({ color: "#8f978c", roughness: 0.6 }), // Kota stone
    globe,
  };
  (M.tile as THREE.MeshStandardMaterial).normalScale.set(0.9, 0.9);

  const B = new Batch();

  // ---- side frames: local (s, y, d) with the outer wall face at d = 0, d outward ----
  const sideMat = (rotY: number, x: number, z: number) => new THREE.Matrix4().makeRotationY(rotY).setPosition(x, 0, z);
  const SIDES = {
    W: sideMat(-Math.PI / 2, -HX, 0), // s = z
    E: sideMat(Math.PI / 2, HX, 0), // s = -z
    N: sideMat(Math.PI, 0, -HZ), // s = -x
    S: sideMat(0, 0, HZ), // s = x
  };
  type SideKey = keyof typeof SIDES;

  // ---- openings ----
  const UPW = 0.8, UPY = 6.1;
  const GW = 1.3, GH = 1.45, GY = 1.5;
  const DW = 1.5, DH = 2.45;
  const openings: Record<SideKey, Opening[]> = { W: [], E: [], N: [], S: [] };
  for (let i = 0; i < 15; i++) openings.W.push({ s: -17.5 + 2.5 * i, y0: UPY, w: UPW, h: UPW, kind: "up" });
  for (const s of [-16.8, -8.4, -4.6, -1.7, 5.9, 8.8, 11.7, 14.6]) openings.W.push({ s, y0: GY, w: GW, h: GH, kind: "gw" });
  openings.W.push({ s: -12.6, y0: FLOOR, w: DW, h: DH, kind: "door" });
  openings.W.push({ s: 17.7, y0: FLOOR, w: 1.6, h: 2.55, kind: "door" });
  openings.W.push({ s: 2.05, y0: 2.45, w: 0.45, h: 0.45, kind: "vent" });
  for (let i = 0; i < 11; i++) openings.E.push({ s: -17.5 + 3.5 * i, y0: UPY, w: UPW, h: UPW, kind: "up" });
  for (const s of [-15.5, -10.5, -5.5, 7.5, 12.5, 17.0]) openings.E.push({ s, y0: GY, w: GW, h: GH, kind: "gw" });
  openings.E.push({ s: 1.5, y0: FLOOR, w: DW, h: DH, kind: "door" });
  for (const k of ["N", "S"] as const) {
    for (const s of [-2.2, 2.2]) openings[k].push({ s, y0: UPY, w: UPW, h: UPW, kind: "up" });
    for (const s of [-2.3, 2.3]) openings[k].push({ s, y0: GY, w: GW, h: GH, kind: "gw" });
  }

  // ---- walls: extruded slabs with real window reveals ----
  for (const key of Object.keys(SIDES) as SideKey[]) {
    const long = key === "W" || key === "E";
    const half = long ? HZ : HX - WALL_T;
    const shape = new THREE.Shape();
    shape.moveTo(-half, 0);
    shape.lineTo(half, 0);
    shape.lineTo(half, WALL_H);
    shape.lineTo(-half, WALL_H);
    for (const o of openings[key]) {
      const hole = new THREE.Path();
      hole.moveTo(o.s - o.w / 2, o.y0);
      hole.lineTo(o.s - o.w / 2, o.y0 + o.h);
      hole.lineTo(o.s + o.w / 2, o.y0 + o.h);
      hole.lineTo(o.s + o.w / 2, o.y0);
      shape.holes.push(hole);
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: WALL_T, bevelEnabled: false, curveSegments: 1, steps: 1 });
    g.translate(0, 0, -WALL_T);
    B.add("wall", g, SIDES[key]);
  }

  // ---- window / door joinery ----
  const ring = (w: number, h: number, f: number, depth: number): THREE.BufferGeometry => {
    const sh = new THREE.Shape();
    sh.moveTo(-w / 2, -h / 2);
    sh.lineTo(w / 2, -h / 2);
    sh.lineTo(w / 2, h / 2);
    sh.lineTo(-w / 2, h / 2);
    const hole = new THREE.Path();
    hole.moveTo(-w / 2 + f, -h / 2 + f);
    hole.lineTo(-w / 2 + f, h / 2 - f);
    hole.lineTo(w / 2 - f, h / 2 - f);
    hole.lineTo(w / 2 - f, -h / 2 + f);
    sh.holes.push(hole);
    return new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 1, steps: 1 });
  };

  // at night exactly 60% of the glazed windows glow, picked by a seeded shuffle
  const glazed: string[] = [];
  for (const key of Object.keys(SIDES) as SideKey[]) {
    openings[key].forEach((o, i) => {
      if (o.kind === "up" || o.kind === "gw") glazed.push(key + i);
    });
  }
  const winRand = makeRand(0x51ed27);
  for (let i = glazed.length - 1; i > 0; i--) {
    const j = Math.floor(winRand() * (i + 1));
    [glazed[i], glazed[j]] = [glazed[j], glazed[i]];
  }
  const litIds = new Set(glazed.slice(0, Math.round(glazed.length * 0.6)));

  for (const key of Object.keys(SIDES) as SideKey[]) {
    const S = SIDES[key];
    for (let oi = 0; oi < openings[key].length; oi++) {
      const o = openings[key][oi];
      const cy = o.y0 + o.h / 2;
      if (o.kind === "door") {
        const fr = ring(o.w, o.h + 0.06, 0.09, 0.1);
        fr.translate(o.s, cy - 0.03, -0.27);
        B.add("frame", fr, S);
        const leaf = new THREE.PlaneGeometry(o.w - 0.16, o.h - 0.1);
        leaf.translate(o.s, o.y0 + (o.h - 0.1) / 2, -0.24);
        B.add("door", leaf, S, "keep");
        // threshold + two laterite steps down to the ground (not under the porch)
        B.add("stone", boxMM(o.s - o.w / 2 - 0.05, FLOOR - 0.04, -WALL_T, o.s + o.w / 2 + 0.05, FLOOR + 0.02, 0.0), S);
        if (!(key === "W" && o.s > 15)) {
          B.add("stone", boxMM(o.s - o.w / 2 - 0.3, 0, 0.1, o.s + o.w / 2 + 0.3, FLOOR, 0.45), S);
          B.add("stone", boxMM(o.s - o.w / 2 - 0.45, 0, 0.45, o.s + o.w / 2 + 0.45, FLOOR / 2, 0.8), S);
        }
        continue;
      }
      const lit = litIds.has(key + oi);
      const glass = new THREE.PlaneGeometry(o.w, o.h);
      glass.translate(o.s, cy, -0.17);
      B.add(lit ? "glassLit" : "glassDark", glass, S, "keep");
      const f = o.kind === "up" ? 0.065 : o.kind === "vent" ? 0.05 : 0.08;
      const fr = ring(o.w, o.h, f, 0.07);
      fr.translate(o.s, cy, -0.19);
      B.add("frame", fr, S);
      if (o.kind === "up") {
        B.add("frame", boxGeo(0.045, o.h - 2 * f, 0.04, o.s, cy, -0.14), S);
        B.add("frame", boxGeo(o.w - 2 * f, 0.045, 0.04, o.s, cy + 0.05, -0.14), S);
      } else {
        // timber transom and the vertical bars of a Konkan ground-floor window
        B.add("frame", boxGeo(o.w - 2 * f, 0.06, 0.05, o.s, o.y0 + o.h * 0.72, -0.15), S);
        const bars = o.kind === "vent" ? 3 : low ? 4 : 6;
        for (let b = 0; b < bars; b++) {
          const bx = o.s - o.w / 2 + f + ((b + 1) * (o.w - 2 * f)) / (bars + 1);
          B.add("iron", boxGeo(0.028, o.h - 2 * f, 0.028, bx, cy, -0.08), S);
        }
      }
      // lime sill
      B.add("trim", boxMM(o.s - o.w / 2 - 0.08, o.y0 - 0.07, -0.18, o.s + o.w / 2 + 0.08, o.y0 + 0.006, 0.11), S);
    }
  }

  // ---- plinth, cornice band ----
  B.add("laterite", boxMM(-HX - 0.12, 0, -HZ - 0.12, HX + 0.12, FLOOR, HZ + 0.12));
  B.add("trim", boxMM(-HX - 0.13, FLOOR, -HZ - 0.13, HX + 0.13, FLOOR + 0.06, HZ + 0.13));
  for (const key of Object.keys(SIDES) as SideKey[]) {
    const long = key === "W" || key === "E";
    const half = (long ? HZ : HX) + 0.07;
    B.add("trim", boxMM(-half, WALL_H - 0.32, -0.02, half, WALL_H - 0.1, 0.07), SIDES[key]);
  }

  // ---- roof helpers ----
  type Plane = { pts: V3[]; u: (p: V3) => number; v: (p: V3) => number };
  const addRoofPlanes = (planes: Plane[], thick: number, topKey: string) => {
    for (const pl of planes) {
      B.add(topKey, polyGeo(pl.pts, pl.pts.map((p) => [pl.u(p), pl.v(p)] as [number, number])), null, "keep");
      const under = pl.pts.slice().reverse().map((p) => [p[0], p[1] - thick, p[2]] as V3);
      B.add("soffit", polyGeo(under, under.map(() => [0, 0] as [number, number])));
    }
  };

  // ---- skirt roof between the floors (wraps all round) ----
  {
    const yi = 4.62, yo = 4.05, ov = 1.1;
    const ix = HX, iz = HZ, ox = HX + ov, oz = HZ + ov;
    const sf = Math.hypot(1, (yi - yo) / ov);
    addRoofPlanes(
      [
        { pts: [[-ox, yo, -oz], [-ox, yo, oz], [-ix, yi, iz], [-ix, yi, -iz]], u: (p) => p[2], v: (p) => (p[0] + ox) * sf },
        { pts: [[ox, yo, oz], [ox, yo, -oz], [ix, yi, -iz], [ix, yi, iz]], u: (p) => -p[2], v: (p) => (ox - p[0]) * sf },
        { pts: [[ox, yo, -oz], [-ox, yo, -oz], [-ix, yi, -iz], [ix, yi, -iz]], u: (p) => -p[0], v: (p) => (p[2] + oz) * sf },
        { pts: [[-ox, yo, oz], [ox, yo, oz], [ix, yi, iz], [-ix, yi, iz]], u: (p) => p[0], v: (p) => (oz - p[2]) * sf },
      ],
      0.1,
      "tile",
    );
    // fascia boards along the skirt edge
    const ft = 0.05, fy0 = yo - 0.14, fy1 = yo + 0.035;
    B.add("trim", boxMM(-ox - ft, fy0, -oz - ft, -ox + 0.01, fy1, oz + ft));
    B.add("trim", boxMM(ox - 0.01, fy0, -oz - ft, ox + ft, fy1, oz + ft));
    B.add("trim", boxMM(-ox - ft, fy0, -oz - ft, ox + ft, fy1, -oz + 0.01));
    B.add("trim", boxMM(-ox - ft, fy0, oz - 0.01, ox + ft, fy1, oz + ft));
    // timber struts carrying the skirt roof
    if (!low) {
      const strut = (S: THREE.Matrix4, s: number) => {
        const g = new THREE.BoxGeometry(0.06, 0.06, 1.0);
        g.translate(0, 0, 0.5);
        g.applyMatrix4(new THREE.Matrix4().makeRotationX(-0.47));
        g.translate(s, 3.6, 0.0);
        B.add("wood", g, S);
      };
      for (let i = 0; i < 16; i++) {
        const s = -18.75 + 2.5 * i;
        if (!(s > 15.4 && s < 20)) strut(SIDES.W, s);
        strut(SIDES.E, s);
      }
      for (const s of [-3.9, -1.3, 1.3, 3.9]) {
        strut(SIDES.N, s);
        strut(SIDES.S, s);
      }
    }
  }

  // ---- main hip roof ----
  {
    const ov = 0.8, yw = 7.75, yr = 11.5;
    const k = (yr - yw) / HX;
    const ex = HX + ov, ez = HZ + ov, ye = yw - ov * k;
    const rz = ez - ex;
    const sf = Math.hypot(1, k);
    addRoofPlanes(
      [
        { pts: [[-ex, ye, -ez], [-ex, ye, ez], [0, yr, rz], [0, yr, -rz]], u: (p) => p[2], v: (p) => (p[0] + ex) * sf },
        { pts: [[ex, ye, ez], [ex, ye, -ez], [0, yr, -rz], [0, yr, rz]], u: (p) => -p[2], v: (p) => (ex - p[0]) * sf },
        { pts: [[ex, ye, -ez], [-ex, ye, -ez], [0, yr, -rz]], u: (p) => -p[0], v: (p) => (p[2] + ez) * sf },
        { pts: [[-ex, ye, ez], [ex, ye, ez], [0, yr, rz]], u: (p) => p[0], v: (p) => (ez - p[2]) * sf },
      ],
      0.16,
      "tile",
    );
    // fascia
    const ft = 0.05, fy0 = ye - 0.24, fy1 = ye + 0.04;
    B.add("trim", boxMM(-ex - ft, fy0, -ez - ft, -ex + 0.01, fy1, ez + ft));
    B.add("trim", boxMM(ex - 0.01, fy0, -ez - ft, ex + ft, fy1, ez + ft));
    B.add("trim", boxMM(-ex - ft, fy0, -ez - ft, ex + ft, fy1, -ez + 0.01));
    B.add("trim", boxMM(-ex - ft, fy0, ez - 0.01, ex + ft, fy1, ez + ft));
    // ridge and hip cappings
    const seg = low ? 5 : 7;
    B.add("ridge", rodGeo([0, yr + 0.02, -rz - 0.1], [0, yr + 0.02, rz + 0.1], 0.15, seg));
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        B.add("ridge", rodGeo([0, yr + 0.02, sz * rz], [sx * ex, ye + 0.03, sz * ez], 0.11, seg));
      }
    }
  }

  // ---- gabled entrance porch at the south end of the west facade ----
  {
    const zc = 17.7, hw = 1.8, px = -8.3; // porch spans z 15.9..19.5, projects to x = -8.3
    B.add("laterite", boxMM(px, 0, zc - hw, -HX - 0.1, FLOOR, zc + hw));
    B.add("floor", boxMM(px - 0.02, FLOOR, zc - hw - 0.02, -HX - 0.1, FLOOR + 0.05, zc + hw + 0.02));
    B.add("stone", boxMM(px - 0.4, 0, zc - 1.1, px, FLOOR, zc + 1.1));
    B.add("stone", boxMM(px - 0.8, 0, zc - 1.3, px - 0.4, FLOOR / 2, zc + 1.3));
    const colTop = 3.25;
    for (const dz of [-hw + 0.2, hw - 0.2]) {
      const cx = px + 0.22, cz = zc + dz;
      B.add("trim", boxGeo(0.42, 0.3, 0.42, cx, FLOOR + 0.15, cz));
      B.add("wall", boxGeo(0.28, colTop - FLOOR - 0.5, 0.28, cx, (FLOOR + 0.3 + colTop - 0.2) / 2, cz));
      B.add("trim", boxGeo(0.4, 0.2, 0.4, cx, colTop - 0.1, cz));
    }
    // beams
    B.add("trim", boxMM(px + 0.06, colTop, zc - hw, px + 0.38, colTop + 0.26, zc + hw));
    B.add("trim", boxMM(px + 0.06, colTop, zc - hw, -HX, colTop + 0.26, zc - hw + 0.3));
    B.add("trim", boxMM(px + 0.06, colTop, zc + hw - 0.3, -HX, colTop + 0.26, zc + hw));
    // gable roof, ridge running east-west
    const ye = 3.55, yr = 4.85, oz = hw + 0.22, x0 = px - 0.18, x1 = -HX;
    const sf = Math.hypot(1, (yr - ye) / oz);
    addRoofPlanes(
      [
        { pts: [[x1, ye, zc - oz], [x0, ye, zc - oz], [x0, yr, zc], [x1, yr, zc]], u: (p) => -p[0], v: (p) => (p[2] - (zc - oz)) * sf },
        { pts: [[x0, ye, zc + oz], [x1, ye, zc + oz], [x1, yr, zc], [x0, yr, zc]], u: (p) => p[0], v: (p) => (zc + oz - p[2]) * sf },
      ],
      0.1,
      "tile",
    );
    B.add("ridge", rodGeo([x0 + 0.03, yr + 0.02, zc], [x1, yr + 0.02, zc], 0.11, low ? 5 : 7));
    // lime gable infill with white bargeboards
    const gx = px + 0.06, gy0 = colTop + 0.26;
    const gTop = yr - 0.18;
    B.add("wall", polyGeo([[gx, gy0, zc - hw], [gx, gy0, zc + hw], [gx, gTop, zc]], [[0, 0], [0, 0], [0, 0]]));
    const barge = (zs: number) => {
      const a: V3 = [x0 - 0.02, ye - 0.02, zc + zs * oz];
      const b: V3 = [x0 - 0.02, yr + 0.06, zc];
      const len = Math.hypot(oz, yr - ye + 0.08);
      const g = new THREE.BoxGeometry(0.06, 0.24, len + 0.1);
      const ang = Math.atan2(yr - ye + 0.08, oz);
      g.applyMatrix4(new THREE.Matrix4().makeRotationX(zs * ang));
      g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 0.08, (a[2] + b[2]) / 2);
      B.add("trim", g);
    };
    barge(-1);
    barge(1);
    // porch lamps: one hanging inside, a bracket globe on the face of each column
    B.add("iron", boxGeo(0.03, 0.35, 0.03, px + 1.4, colTop + 0.05, zc));
    B.add("globe", new THREE.SphereGeometry(0.13, low ? 8 : 12, low ? 6 : 8).translate(px + 1.4, colTop - 0.2, zc));
    for (const dz of [-hw + 0.2, hw - 0.2]) {
      const cz = zc + dz, fx = px + 0.22 - 0.14;
      B.add("iron", boxMM(fx - 0.22, 2.7, cz - 0.02, fx, 2.74, cz + 0.02));
      B.add("iron", boxMM(fx - 0.24, 2.6, cz - 0.02, fx - 0.2, 2.74, cz + 0.02));
      B.add("globe", new THREE.SphereGeometry(0.1, low ? 8 : 10, low ? 6 : 7).translate(fx - 0.22, 2.5, cz));
    }
  }

  // ---- laterite compound wall with globe lamps ----
  {
    const cx = -HX - 6, t = 0.3, h = 1.15;
    const runs: [number, number, number, number][] = [
      [cx, -21.5, cx, -13.7],
      [cx, -9.1, cx, 21.5],
      [cx, -21.5, -HX, -21.5],
      [cx, 21.5, -HX, 21.5],
    ];
    for (const [x0, z0, x1, z1] of runs) {
      const alongZ = x0 === x1;
      if (alongZ) {
        B.add("laterite", boxMM(x0 - t / 2, 0, Math.min(z0, z1), x0 + t / 2, h, Math.max(z0, z1)));
        B.add("coping", boxMM(x0 - t / 2 - 0.04, h, Math.min(z0, z1), x0 + t / 2 + 0.04, h + 0.08, Math.max(z0, z1)));
      } else {
        B.add("laterite", boxMM(Math.min(x0, x1), 0, z0 - t / 2, Math.max(x0, x1), h, z0 + t / 2));
        B.add("coping", boxMM(Math.min(x0, x1), h, z0 - t / 2 - 0.04, Math.max(x0, x1), h + 0.08, z0 + t / 2 + 0.04));
      }
    }
    const posts: [number, number, boolean][] = [];
    for (const z of [-21.5, -17.6, -13.7, -9.1, -3.0, 3.0, 9.0, 15.0, 21.5]) posts.push([cx, z, true]);
    for (const z of [-21.5, 21.5]) {
      posts.push([cx + 3.0, z, false]);
      posts.push([-HX, z, false]);
    }
    const sSeg = low ? 8 : 12, rSeg = low ? 6 : 9;
    for (const [x, z, lamp] of posts) {
      const ph = lamp ? 1.42 : 1.3;
      B.add("laterite", boxGeo(0.46, ph, 0.46, x, ph / 2, z));
      B.add("coping", boxGeo(0.56, 0.08, 0.56, x, ph + 0.04, z));
      if (lamp) {
        B.add("iron", new THREE.CylinderGeometry(0.05, 0.07, 0.12, 6).translate(x, ph + 0.14, z));
        B.add("globe", new THREE.SphereGeometry(0.17, sSeg, rSeg).translate(x, ph + 0.36, z));
      }
    }
  }

  B.build(
    group,
    M,
    (key) => {
      if (key === "glassLit" || key === "glassDark" || key === "globe") return [false, true];
      if (key === "iron" || key === "frame") return [false, true];
      return [true, true];
    },
    geometries,
  );

  return {
    group,
    setNight(n: number) {
      const k = Math.min(1, Math.max(0, n));
      glassLit.emissiveIntensity = 1.5 * k;
      globe.emissiveIntensity = 2.4 * k;
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
      group.clear();
    },
  };
}
