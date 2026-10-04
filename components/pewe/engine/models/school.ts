import * as THREE from "three";
import type { ModelContext, ModelHandle } from "../types";

/*
 * The village school: a modest two-storey block in pale cream with a soft
 * blue-green band at the floor line, grilled windows under concrete sunshades,
 * a flat roof behind a parapet (with the usual black water tank), a small
 * tiled canopy over the entrance and a laterite-earth playground in front.
 *
 * Local frame: origin = centre of the building footprint at ground level.
 * The block is 24 m along Z and 9 m deep along X; the front faces -X and the
 * playground (24 x 14 m) lies on that side.
 */

// ---------------------------------------------------------------------------
// small toolkit
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
  if (!g) throw new Error("school: 2D canvas unavailable");
  return [c, g];
}

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

class Batch {
  private parts = new Map<string, THREE.BufferGeometry[]>();

  add(key: string, geo: THREE.BufferGeometry, m?: THREE.Matrix4 | null, uvMode: "box" | "keep" = "box"): THREE.BufferGeometry {
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
    return g;
  }

  build(group: THREE.Group, mats: Record<string, THREE.Material>, shadows: (key: string) => [boolean, boolean], out: THREE.BufferGeometry[]): void {
    for (const [key, list] of this.parts) {
      const mat = mats[key];
      if (!mat) throw new Error("school: no material " + key);
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
      mesh.name = "school-" + key;
      const [cast, recv] = shadows(key);
      mesh.castShadow = cast;
      mesh.receiveShadow = recv;
      group.add(mesh);
      out.push(geo);
    }
    this.parts.clear();
  }
}

function boxMM(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

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

// ---------------------------------------------------------------------------
// layout
// ---------------------------------------------------------------------------

const HX = 4.5, HZ = 12, WALL_T = 0.3;
const PLINTH = 0.45;
const F1 = 3.85; // first-floor level
const ROOF = 7.2; // top of the roof slab
const PARAPET = 8.0;
const WIN_W = 1.5, WIN_H = 1.35;
const SILL0 = PLINTH + 0.9, SILL1 = F1 + 0.9;
const FRONT_G = [-9.6, -6.6, -3.4, 3.4, 6.6, 9.6];
const FRONT_1 = [-9.6, -6.6, -3.4, 0, 3.4, 6.6, 9.6];
const BACK = [-9.6, -6.6, -3.4, 0, 3.4, 6.6, 9.6];
const ENDS = [-2.0, 2.0];
const DOOR_W = 1.9, DOOR_H = 2.45;
const WALL_TEX_W = 24, WALL_TEX_H = 8; // the facade texture spans u in [-12, 12]

// ---------------------------------------------------------------------------
// painters
// ---------------------------------------------------------------------------

/** Cream distemper with monsoon streaks under sills and sunshades. */
function paintWalls(ppm: number, rand: Rand): HTMLCanvasElement {
  const W = Math.round(WALL_TEX_W * ppm), H = Math.round(WALL_TEX_H * ppm);
  const [c, g] = makeCanvas(W, H);
  const n1 = periodicNoise(rand, 9), n2 = periodicNoise(rand, 31), edge = periodicNoise(rand, 40);
  const img = g.createImageData(W, H);
  const d = img.data;
  for (let py = 0; py < H; py++) {
    const ym = (H - py - 0.5) / ppm;
    const v = py / H;
    for (let px = 0; px < W; px++) {
      const u = px / W;
      let r = 233, gg = 223, b = 194;
      const k = 1 + (n1(u, v) - 0.5) * 0.06 + (n2(u, v) - 0.5) * 0.035;
      r *= k; gg *= k; b *= k;
      const eh = 0.55 + 0.45 * edge(u, 0.4);
      if (ym < eh) {
        const t = 1 - ym / eh;
        const w = 0.5 * t * t;
        r += (128 - r) * w; gg += (118 - gg) * w; b += (96 - b) * w;
      }
      // parapet top weathers grey
      if (ym > PARAPET - 0.55) {
        const w = 0.22 * smooth(PARAPET - 0.55, PARAPET, ym) * (0.6 + 0.6 * n2(u, 0.2));
        r += (120 - r) * w; gg += (118 - gg) * w; b += (108 - b) * w;
      }
      const gr = (rand() - 0.5) * 7;
      const i = (py * W + px) * 4;
      d[i] = r + gr; d[i + 1] = gg + gr; d[i + 2] = b + gr; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const X = (u: number) => (u + WALL_TEX_W / 2) * ppm;
  const Y = (y: number) => (WALL_TEX_H - y) * ppm;
  const streak = (u: number, top: number, len: number, a: number) => {
    const w = Math.max(1, ppm * (0.05 + rand() * 0.07));
    const grad = g.createLinearGradient(0, Y(top), 0, Y(top - len));
    grad.addColorStop(0, `rgba(78,72,60,${a})`);
    grad.addColorStop(1, "rgba(78,72,60,0)");
    g.fillStyle = grad;
    g.fillRect(X(u) - w / 2, Y(top), w, len * ppm);
  };
  const us = new Set<number>();
  for (const z of [...FRONT_1, ...BACK, ...ENDS]) { us.add(z); us.add(-z); }
  for (const u of us) {
    for (const sill of [SILL0, SILL1]) {
      // run-off from the sill ends and from the ends of the sunshade above
      streak(u - WIN_W / 2 - 0.05 + rand() * 0.1, sill - 0.04, 0.6 + rand() * 0.7, 0.16);
      streak(u + WIN_W / 2 - 0.05 + rand() * 0.1, sill - 0.04, 0.6 + rand() * 0.7, 0.16);
      streak(u - WIN_W / 2 - 0.2, sill + WIN_H + 0.12, 0.5 + rand() * 0.5, 0.1);
      streak(u + WIN_W / 2 + 0.2, sill + WIN_H + 0.12, 0.5 + rand() * 0.5, 0.1);
    }
  }
  for (let i = 0; i < 30; i++) streak(rand() * WALL_TEX_W - WALL_TEX_W / 2, PARAPET - 0.05, 0.4 + rand() * 1.4, 0.12);
  return c;
}

/** Grilled window: two glazed shutters behind a painted steel grill. */
function paintWindow(ppm: number, lit: boolean): HTMLCanvasElement {
  const [c, g] = makeCanvas(WIN_W * ppm * 2, WIN_H * ppm * 2);
  const W = c.width, H = c.height;
  if (lit) {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, W, H);
    const grad = g.createRadialGradient(W / 2, H * 0.6, 4, W / 2, H / 2, W * 0.7);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(1, "rgba(80,70,60,0.6)");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  } else {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#6f7f86");
    grad.addColorStop(0.4, "#38444a");
    grad.addColorStop(1, "#1a1f21");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  }
  // shutter frames (dark when lit = silhouettes)
  g.fillStyle = lit ? "#2a2018" : "#55776f";
  const f = Math.max(2, W * 0.035);
  g.fillRect(0, 0, W, f);
  g.fillRect(0, H - f, W, f);
  g.fillRect(0, 0, f, H);
  g.fillRect(W - f, 0, f, H);
  g.fillRect(W / 2 - f / 2, 0, f, H);
  g.fillRect(0, H * 0.32, W, f * 0.7);
  // the grill
  g.fillStyle = lit ? "#1e1a16" : "#2f4c46";
  const bars = 7, bw = Math.max(2, W * 0.016);
  for (let i = 1; i < bars; i++) g.fillRect((i * W) / bars - bw / 2, 0, bw, H);
  g.fillRect(0, H * 0.5 - bw / 2, W, bw);
  g.fillRect(0, H * 0.18 - bw / 2, W, bw);
  g.fillRect(0, H * 0.82 - bw / 2, W, bw);
  return c;
}

function paintDoor(ppm: number, rand: Rand): HTMLCanvasElement {
  const [c, g] = makeCanvas(DOOR_W * ppm * 2, DOOR_H * ppm * 2);
  const W = c.width, H = c.height;
  g.fillStyle = "#4b7069";
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 30; i++) {
    g.fillStyle = `rgba(${rand() < 0.5 ? "20,30,28" : "200,220,210"},0.05)`;
    g.fillRect(rand() * W, rand() * H, 3 + rand() * 10, 3 + rand() * 20);
  }
  for (let l = 0; l < 2; l++) {
    const x0 = (l * W) / 2;
    for (const [a, b] of [[0.06, 0.45], [0.52, 0.94]]) {
      const px0 = x0 + W * 0.06, px1 = x0 + W / 2 - W * 0.06;
      g.fillStyle = "rgba(0,0,0,0.28)";
      g.fillRect(px0, a * H, px1 - px0, 3);
      g.fillRect(px0, a * H, 3, (b - a) * H);
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.fillRect(px0, b * H - 3, px1 - px0, 3);
      g.fillRect(px1 - 3, a * H, 3, (b - a) * H);
    }
  }
  g.fillStyle = "#1b2523";
  g.fillRect(W / 2 - 2, 0, 4, H);
  g.fillStyle = "#b9b4a6";
  g.fillRect(W / 2 - 8, H * 0.5, 5, 12);
  g.fillRect(W / 2 + 3, H * 0.5, 5, 12);
  return c;
}

const TILE_WM = 4.2, TILE_HM = 3.0;

function paintTiles(ppm: number, rand: Rand): HTMLCanvasElement {
  const NC = 12, NR = 12;
  const W = Math.round(TILE_WM * ppm), H = Math.round(TILE_HM * ppm);
  const [c, g] = makeCanvas(W, H);
  const img = g.createImageData(W, H);
  const d = img.data;
  const cols: number[][] = [];
  for (let i = 0; i < NC * NR; i++) {
    const k = 0.88 + rand() * 0.14;
    const w = rand() < 0.15 ? 0.25 : 0;
    cols.push([180 * k * (1 - w) + 92 * w, 82 * k * (1 - w) + 66 * w, 58 * k * (1 - w) + 54 * w]);
  }
  const tw = W / NC, th = H / NR;
  for (let y = 0; y < H; y++) {
    const r = Math.min(NR - 1, Math.floor(y / th));
    const fy = (y + 0.5 - r * th) / th;
    for (let x = 0; x < W; x++) {
      const q = Math.min(NC - 1, Math.floor(x / tw));
      const fx = (x + 0.5 - q * tw) / tw;
      const col = cols[r * NC + q];
      let s = 0.9 + 0.13 * (Math.cos(fx * Math.PI * 4) * 0.5 + 0.5);
      if (fy < 0.28) s *= 0.5 + 0.5 * (fy / 0.28);
      if (fy > 0.84) s *= 1.1;
      if (fx < 0.06) s *= 0.82;
      const i = (y * W + x) * 4;
      d[i] = col[0] * s; d[i + 1] = col[1] * s; d[i + 2] = col[2] * s; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

const GROUND_X0 = -HX - 14, GROUND_X1 = -HX; // playground span in X
const GROUND_W = HZ * 2, GROUND_D = 14;

/** Beaten laterite earth, a worn kabaddi court and a grassy margin. */
function paintGround(ppm: number, rand: Rand): HTMLCanvasElement {
  // canvas x = world z (from -12 to 12), canvas y = world x (from -18.5 to -4.5)
  const W = Math.round(GROUND_W * ppm), H = Math.round(GROUND_D * ppm);
  const [c, g] = makeCanvas(W, H);
  const n1 = periodicNoise(rand, 5), n2 = periodicNoise(rand, 17), n3 = periodicNoise(rand, 53);
  const img = g.createImageData(W, H);
  const d = img.data;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const u = px / W, v = py / H;
      let r = 154, gg = 106, b = 74; // #9a6a4a
      const k = 1 + (n1(u, v) - 0.5) * 0.14 + (n2(u, v) - 0.5) * 0.08 + (n3(u, v) - 0.5) * 0.06;
      r *= k; gg *= k; b *= k;
      // trodden, paler path from the entrance (near the building edge, centre)
      // canvas top (v = 0) is the edge against the building
      const ex = Math.abs(u - 0.5) * GROUND_W, ey = v * GROUND_D;
      const path = Math.exp(-(ex * ex) / 6) * smooth(9, 0, ey);
      r += (186 - r) * 0.25 * path; gg += (146 - gg) * 0.25 * path; b += (108 - b) * 0.25 * path;
      // grass creeping in at the margins
      const m = Math.min(u * GROUND_W, (1 - u) * GROUND_W, (1 - v) * GROUND_D);
      const grass = smooth(1.4, 0, m + (n2(u, v) - 0.5) * 1.2) * 0.75;
      r += (104 - r) * grass; gg += (112 - gg) * grass; b += (62 - b) * grass;
      const gr = (rand() - 0.5) * 12;
      const i = (py * W + px) * 4;
      d[i] = r + gr; d[i + 1] = gg + gr; d[i + 2] = b + gr; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // pebbles
  for (let i = 0; i < W * H * 0.004; i++) {
    g.fillStyle = rand() < 0.6 ? "rgba(220,196,160,0.6)" : "rgba(70,44,30,0.5)";
    g.fillRect(rand() * W, rand() * H, 1 + (rand() < 0.2 ? 1 : 0), 1);
  }
  // worn lime lines of a kabaddi court (12 x 8 m), centred in the playground
  const cx = W / 2, cy = H * 0.52;
  const lw = Math.max(1, 0.05 * ppm);
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    // walk the line in short pieces, dropping some where feet scuffed it away
    const len = Math.hypot(x1 - x0, y1 - y0), steps = Math.max(1, Math.round(len / (0.25 * ppm)));
    for (let i = 0; i < steps; i++) {
      if (rand() < 0.22) continue;
      const a = i / steps, b = (i + 1) / steps;
      g.strokeStyle = `rgba(236,228,210,${0.25 + rand() * 0.3})`;
      g.lineWidth = lw * (0.7 + rand() * 0.5);
      g.beginPath();
      g.moveTo(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a);
      g.lineTo(x0 + (x1 - x0) * b, y0 + (y1 - y0) * b);
      g.stroke();
    }
  };
  const L = cx - 6 * ppm, R = cx + 6 * ppm, T = cy - 4 * ppm, Bm = cy + 4 * ppm;
  line(L, T, R, T);
  line(L, Bm, R, Bm);
  line(L, T, L, Bm);
  line(R, T, R, Bm);
  line(cx, T, cx, Bm);
  line(cx - 3 * ppm, T, cx - 3 * ppm, Bm);
  line(cx + 3 * ppm, T, cx + 3 * ppm, Bm);
  return c;
}

// ---------------------------------------------------------------------------
// the model
// ---------------------------------------------------------------------------

type Kind = "win" | "door";
interface Opening { s: number; y0: number; w: number; h: number; kind: Kind }

export function buildSchool(ctx: ModelContext): ModelHandle {
  const low = ctx.lowPower;
  const ppm = low ? 20 : 40;
  const rand = makeRand(0x5c4001);

  const group = new THREE.Group();
  group.name = "school";
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];

  const tex = (canvas: HTMLCanvasElement, srgb: boolean): THREE.CanvasTexture => {
    const t = new THREE.CanvasTexture(canvas);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ctx.anisotropy;
    t.needsUpdate = true;
    textures.push(t);
    return t;
  };
  const std = (p: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial => {
    const m = new THREE.MeshStandardMaterial(p);
    materials.push(m);
    return m;
  };

  const wallMap = tex(paintWalls(ppm, rand), true);
  wallMap.wrapS = wallMap.wrapT = THREE.RepeatWrapping;
  wallMap.repeat.set(1 / WALL_TEX_W, 1 / WALL_TEX_H);
  wallMap.offset.set(0.5, 0);
  const tileMap = tex(paintTiles(ppm, rand), true);
  tileMap.wrapS = tileMap.wrapT = THREE.RepeatWrapping;
  tileMap.repeat.set(1 / TILE_WM, 1 / TILE_HM);
  const winMap = tex(paintWindow(ppm, false), true);
  const winGlow = tex(paintWindow(ppm, true), true);
  const doorMap = tex(paintDoor(ppm, rand), true);
  const groundMap = tex(paintGround(ppm * 0.8, rand), true);

  const winLit = std({ map: winMap, roughness: 0.4, emissive: "#ffcf8f", emissiveMap: winGlow, emissiveIntensity: 0 });
  const lamp = std({ color: "#f2efe6", roughness: 0.3, emissive: "#ffe0aa", emissiveIntensity: 0 });
  const M: Record<string, THREE.Material> = {
    wall: std({ map: wallMap, roughness: 0.92 }),
    band: std({ color: "#7fa39a", roughness: 0.8 }),
    slab: std({ color: "#ddd4bc", roughness: 0.9 }),
    deck: std({ color: "#8b877e", roughness: 0.95 }),
    plinth: std({ color: "#8e8576", roughness: 0.95 }),
    frame: std({ color: "#3e5f58", roughness: 0.6 }),
    win: std({ map: winMap, roughness: 0.4 }),
    winLit,
    door: std({ map: doorMap, roughness: 0.6 }),
    tile: std({ map: tileMap, roughness: 0.85 }),
    steel: std({ color: "#33504a", roughness: 0.55, metalness: 0.3 }),
    tank: std({ color: "#202224", roughness: 0.55 }),
    pole: std({ color: "#e8e5dd", roughness: 0.6 }),
    ground: std({ map: groundMap, roughness: 1.0 }),
    lamp,
  };

  const B = new Batch();
  const sideMat = (rotY: number, x: number, z: number) => new THREE.Matrix4().makeRotationY(rotY).setPosition(x, 0, z);
  const SIDES = {
    W: sideMat(-Math.PI / 2, -HX, 0),
    E: sideMat(Math.PI / 2, HX, 0),
    N: sideMat(Math.PI, 0, -HZ),
    S: sideMat(0, 0, HZ),
  };
  type SideKey = keyof typeof SIDES;

  const openings: Record<SideKey, Opening[]> = { W: [], E: [], N: [], S: [] };
  for (const s of FRONT_G) openings.W.push({ s, y0: SILL0, w: WIN_W, h: WIN_H, kind: "win" });
  for (const s of FRONT_1) openings.W.push({ s, y0: SILL1, w: WIN_W, h: WIN_H, kind: "win" });
  openings.W.push({ s: 0, y0: PLINTH, w: DOOR_W, h: DOOR_H, kind: "door" });
  for (const s of BACK) {
    openings.E.push({ s, y0: SILL0, w: WIN_W, h: WIN_H, kind: "win" });
    openings.E.push({ s, y0: SILL1, w: WIN_W, h: WIN_H, kind: "win" });
  }
  for (const k of ["N", "S"] as const) {
    for (const s of ENDS) {
      openings[k].push({ s, y0: SILL0, w: WIN_W, h: WIN_H, kind: "win" });
      openings[k].push({ s, y0: SILL1, w: WIN_W, h: WIN_H, kind: "win" });
    }
  }

  // walls (one slab per side, parapet included)
  for (const key of Object.keys(SIDES) as SideKey[]) {
    const long = key === "W" || key === "E";
    const half = long ? HZ : HX - WALL_T;
    const shape = new THREE.Shape();
    shape.moveTo(-half, 0);
    shape.lineTo(half, 0);
    shape.lineTo(half, PARAPET);
    shape.lineTo(-half, PARAPET);
    for (const o of openings[key]) {
      const h = new THREE.Path();
      h.moveTo(o.s - o.w / 2, o.y0);
      h.lineTo(o.s - o.w / 2, o.y0 + o.h);
      h.lineTo(o.s + o.w / 2, o.y0 + o.h);
      h.lineTo(o.s + o.w / 2, o.y0);
      shape.holes.push(h);
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: WALL_T, bevelEnabled: false, curveSegments: 1, steps: 1 });
    g.translate(0, 0, -WALL_T);
    B.add("wall", g, SIDES[key]);
  }

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

  // a couple of rooms still lit in the evening: the office and a classroom
  const litSet = new Set(["W:-3.4:" + SILL0, "W:3.4:" + SILL0, "E:6.6:" + SILL1]);
  for (const key of Object.keys(SIDES) as SideKey[]) {
    const S = SIDES[key];
    for (const o of openings[key]) {
      const cy = o.y0 + o.h / 2;
      if (o.kind === "door") {
        B.add("frame", ring(o.w + 0.1, o.h + 0.05, 0.08, 0.1).translate(o.s, cy + 0.025, -0.2), S);
        B.add("door", new THREE.PlaneGeometry(o.w - 0.06, o.h - 0.04).translate(o.s, o.y0 + (o.h - 0.04) / 2, -0.16), S, "keep");
        continue;
      }
      const lit = litSet.has(`${key}:${o.s}:${o.y0}`);
      B.add(lit ? "winLit" : "win", new THREE.PlaneGeometry(o.w, o.h).translate(o.s, cy, -0.12), S, "keep");
      B.add("frame", ring(o.w, o.h, 0.06, 0.06).translate(o.s, cy, -0.14), S);
      // sill and concrete sunshade (chajja)
      B.add("slab", boxMM(o.s - o.w / 2 - 0.06, o.y0 - 0.06, -0.12, o.s + o.w / 2 + 0.06, o.y0 + 0.005, 0.07), S);
      B.add("slab", boxMM(o.s - o.w / 2 - 0.2, o.y0 + o.h + 0.12, -0.02, o.s + o.w / 2 + 0.2, o.y0 + o.h + 0.2, 0.5), S);
    }
  }

  // plinth, floor band, roof-slab edge, parapet coping
  B.add("plinth", boxMM(-HX - 0.1, 0, -HZ - 0.1, HX + 0.1, PLINTH, HZ + 0.1));
  for (const key of Object.keys(SIDES) as SideKey[]) {
    const long = key === "W" || key === "E";
    const half = (long ? HZ : HX) + 0.07;
    B.add("band", boxMM(-half, F1 - 0.32, -0.02, half, F1 + 0.08, 0.07), SIDES[key]);
    B.add("slab", boxMM(-half - 0.03, ROOF - 0.22, -0.02, half + 0.03, ROOF, 0.1), SIDES[key]);
    B.add("band", boxMM(-half - 0.01, PARAPET - 0.02, -WALL_T - 0.04, half + 0.01, PARAPET + 0.07, 0.05), SIDES[key]);
  }
  // roof deck and the black water tank on its stand
  B.add("deck", boxMM(-HX + WALL_T, ROOF - 0.1, -HZ + WALL_T, HX - WALL_T, ROOF, HZ - WALL_T));
  B.add("slab", boxMM(1.2, ROOF, 6.6, 2.8, ROOF + 0.45, 8.2));
  {
    const seg = low ? 10 : 16;
    const tank = new THREE.CylinderGeometry(0.66, 0.7, 1.15, seg);
    tank.translate(2.0, ROOF + 0.45 + 0.575, 7.4);
    B.add("tank", tank);
    const lid = new THREE.CylinderGeometry(0.22, 0.26, 0.1, seg);
    lid.translate(2.0, ROOF + 0.45 + 1.2, 7.4);
    B.add("tank", lid);
    // stair head-room
    B.add("wall", boxMM(-1.6, ROOF, -11.4, 1.2, ROOF + 2.4, -8.6));
    B.add("slab", boxMM(-1.7, ROOF + 2.4, -11.5, 1.3, ROOF + 2.55, -8.5));
  }

  // entrance: steps and a small tiled canopy on slim steel posts
  {
    const zc = 0, cw = 1.8; // canopy half width
    B.add("plinth", boxMM(-HX - 0.95, 0, zc - 1.5, -HX, PLINTH / 3, zc + 1.5));
    B.add("plinth", boxMM(-HX - 0.65, 0, zc - 1.4, -HX, (2 * PLINTH) / 3, zc + 1.4));
    B.add("plinth", boxMM(-HX - 0.35, 0, zc - 1.3, -HX, PLINTH, zc + 1.3));
    const yi = 3.3, yo = 2.95, xo = -HX - 1.7;
    const sf = Math.hypot(1, (yi - yo) / (HX + xo));
    const pts: V3[] = [[xo, yo, zc - cw], [xo, yo, zc + cw], [-HX, yi, zc + cw], [-HX, yi, zc - cw]];
    B.add("tile", polyGeo(pts, pts.map((p) => [p[2], (p[0] - xo) * sf] as [number, number])), null, "keep");
    const under = pts.slice().reverse().map((p) => [p[0], p[1] - 0.08, p[2]] as V3);
    B.add("slab", polyGeo(under, under.map(() => [0, 0] as [number, number])));
    B.add("band", boxMM(xo - 0.05, yo - 0.16, zc - cw - 0.05, xo + 0.02, yo + 0.03, zc + cw + 0.05));
    for (const sz of [-1, 1]) {
      B.add("steel", boxMM(xo + 0.12, PLINTH / 3, zc + sz * (cw - 0.15) - 0.04, xo + 0.2, yo - 0.12, zc + sz * (cw - 0.15) + 0.04));
    }
    // bracket lamp on the facade beside the canopy
    B.add("steel", boxMM(-HX - 0.42, 3.12, -cw - 0.55, -HX, 3.16, -cw - 0.49));
    B.add("steel", boxMM(-HX - 0.47, 3.0, -cw - 0.57, -HX - 0.37, 3.14, -cw - 0.47));
    B.add("lamp", new THREE.SphereGeometry(0.11, low ? 8 : 12, low ? 6 : 8).translate(-HX - 0.42, 2.92, -cw - 0.52));
  }

  // playground
  {
    const g = new THREE.BoxGeometry(GROUND_D, 0.1, GROUND_W);
    g.translate((GROUND_X0 + GROUND_X1) / 2, -0.05 + 0.03, 0);
    const added = B.add("ground", g, null, "keep");
    const p = added.getAttribute("position") as THREE.BufferAttribute;
    const uv = added.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      uv.setXY(i, (p.getZ(i) + HZ) / GROUND_W, (p.getX(i) - GROUND_X0) / GROUND_D);
    }
  }

  // flag post on its stepped platform, centred on the front
  {
    const x = GROUND_X0 + 3.2;
    B.add("plinth", boxMM(x - 1.0, 0, -1.0, x + 1.0, 0.2, 1.0));
    B.add("plinth", boxMM(x - 0.7, 0.2, -0.7, x + 0.7, 0.4, 0.7));
    B.add("slab", boxMM(x - 0.4, 0.4, -0.4, x + 0.4, 0.6, 0.4));
    B.add("pole", new THREE.CylinderGeometry(0.035, 0.05, 6.2, 8).translate(x, 0.6 + 3.1, 0));
    B.add("pole", new THREE.SphereGeometry(0.07, 8, 6).translate(x, 6.85, 0));
  }

  // lamp post at the corner of the playground
  {
    const x = GROUND_X0 + 0.6, z = -HZ + 0.6;
    B.add("steel", new THREE.CylinderGeometry(0.06, 0.09, 6, 8).translate(x, 3, z));
    B.add("steel", boxMM(x, 5.88, z - 0.04, x + 1.3, 5.96, z + 0.04));
    B.add("steel", boxMM(x + 1.05, 5.8, z - 0.12, x + 1.45, 5.92, z + 0.12));
    B.add("lamp", new THREE.SphereGeometry(0.15, low ? 8 : 12, low ? 4 : 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(x + 1.25, 5.82, z));
  }

  B.build(
    group,
    M,
    (key) => {
      if (key === "ground") return [false, true];
      if (key === "win" || key === "winLit" || key === "frame" || key === "lamp" || key === "door") return [false, true];
      return [true, true];
    },
    geometries,
  );

  return {
    group,
    setNight(n: number) {
      const k = Math.min(1, Math.max(0, n));
      winLit.emissiveIntensity = 1.3 * k;
      lamp.emissiveIntensity = 2.6 * k;
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
      group.clear();
    },
  };
}
