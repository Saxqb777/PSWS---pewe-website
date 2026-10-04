import * as THREE from "three";
import type { ModelContext, ModelHandle } from "../types";

/*
 * A small Konkan wooden fishing boat (about 7 m): a painted plank hull with a
 * contrasting sheer stripe and a raised bow, a wooden interior with thwarts
 * and floorboards, a heap of net, and an outboard motor on the transom.
 *
 * Local frame: the bow faces +Z. The origin is at the WATERLINE, midships;
 * the keel sits about 0.5 m below it.
 */

type Rand = () => number;
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

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = Math.max(4, Math.round(w));
  c.height = Math.max(4, Math.round(h));
  const g = c.getContext("2d");
  if (!g) throw new Error("boat: 2D canvas unavailable");
  return [c, g];
}

function boxMM(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

/** Merge non-indexed copies of several geometries (position/normal/uv). */
function mergeGeos(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const parts = list.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    if (n !== g) g.dispose();
    if (!n.getAttribute("normal")) n.computeVertexNormals();
    if (!n.getAttribute("uv")) n.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n.getAttribute("position").count * 2), 2));
    return n;
  });
  let count = 0;
  for (const p of parts) count += p.getAttribute("position").count;
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  let o = 0;
  for (const p of parts) {
    const c = p.getAttribute("position").count;
    pos.set((p.getAttribute("position") as THREE.BufferAttribute).array as Float32Array, o * 3);
    nor.set((p.getAttribute("normal") as THREE.BufferAttribute).array as Float32Array, o * 3);
    uv.set((p.getAttribute("uv") as THREE.BufferAttribute).array as Float32Array, o * 2);
    o += c;
    p.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

// ---------------------------------------------------------------------------
// hull lines
// ---------------------------------------------------------------------------

const LEN = 7, HL = LEN / 2;

const tOf = (z: number) => (z + HL) / LEN; // 0 = transom, 1 = stem
function halfBeam(z: number): number {
  const t = tOf(z);
  if (t < 0.42) return 0.56 + 0.18 * Math.sin((t / 0.42) * (Math.PI / 2));
  return 0.74 * Math.pow(Math.max(0, Math.cos(((t - 0.42) / 0.58) * (Math.PI / 2))), 0.8);
}
function sheer(z: number): number {
  const t = tOf(z);
  return 0.5 + 0.13 * Math.pow(Math.max(0, 1 - t / 0.35), 2) + 0.72 * Math.pow(Math.max(0, (t - 0.45) / 0.55), 2.2);
}
const BOW_Y = sheer(HL);
function keel(z: number): number {
  const t = tOf(z);
  return -0.5 + 0.1 * Math.pow(Math.max(0, 1 - t / 0.22), 2) + (BOW_Y + 0.5) * Math.pow(Math.max(0, (t - 0.6) / 0.4), 2.3);
}
/** Point on a hull section; phi 0 = keel, PI/2 = gunwale; inset > 0 gives the inner skin. */
function sectionPoint(z: number, phi: number, inset: number): [number, number] {
  const hb = Math.max(0, halfBeam(z) - inset);
  const sh = sheer(z);
  const kl = Math.min(sh, keel(z) + inset * 1.1);
  const s = Math.sin(phi), c = Math.cos(phi);
  // part straight-sided V (deadrise), part round bilge, slight flare at the top
  return [hb * s * (1 + 0.06 * (1 - c)), kl + (sh - kl) * (0.38 * s + 0.62 * (1 - c))];
}

// ---------------------------------------------------------------------------
// painters
// ---------------------------------------------------------------------------

const PLANKS = [0.17, 0.33, 0.49, 0.63, 0.76];
const PLAIN_V = 0.56; // a girth position between plank seams

function shade(hex: string, k: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return "#" + c.getHexString();
}

/** Outer planking: u along the hull (stern -> bow), v around the girth (keel -> gunwale). */
function paintHull(ppm: number, rand: Rand, hull: string, trim: string): HTMLCanvasElement {
  const [c, g] = makeCanvas(LEN * ppm, 1.4 * ppm);
  const W = c.width, H = c.height;
  const Y = (v: number) => (1 - v) * H;
  g.fillStyle = hull;
  g.fillRect(0, 0, W, H);
  // brush-painted unevenness
  for (let i = 0; i < 160; i++) {
    g.fillStyle = rand() < 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.05)";
    g.fillRect(rand() * W, rand() * H, 10 + rand() * 50, 1 + rand() * 3);
  }
  // wet, weedy bottom below the waterline
  const bot = g.createLinearGradient(0, Y(0), 0, Y(0.32));
  bot.addColorStop(0, "rgba(58,40,30,0.85)");
  bot.addColorStop(1, "rgba(58,40,30,0)");
  g.fillStyle = bot;
  g.fillRect(0, Y(0.32), W, 0.32 * H);
  // plank seams with a lit lower edge (lapstrake)
  for (const v of PLANKS) {
    g.fillStyle = "rgba(10,12,16,0.55)";
    g.fillRect(0, Y(v), W, Math.max(1, H * 0.012));
    g.fillStyle = "rgba(255,255,255,0.12)";
    g.fillRect(0, Y(v) + Math.max(1, H * 0.012), W, Math.max(1, H * 0.01));
  }
  // sheer stripe and gunwale rubbing strip
  g.fillStyle = trim;
  g.fillRect(0, Y(0.95), W, 0.085 * H);
  g.fillStyle = shade(trim, 0.7);
  g.fillRect(0, Y(0.865), W, Math.max(1, H * 0.012));
  g.fillStyle = shade(hull, 0.55);
  g.fillRect(0, Y(1.0), W, 0.05 * H);
  // a band of chevrons near the bow
  g.fillStyle = trim;
  for (let x = W * 0.84; x < W * 0.97; x += H * 0.12) {
    g.beginPath();
    g.moveTo(x, Y(0.8));
    g.lineTo(x + H * 0.06, Y(0.72));
    g.lineTo(x, Y(0.64));
    g.lineTo(x + H * 0.03, Y(0.72));
    g.closePath();
    g.fill();
  }
  // knocks and scrapes showing bare wood
  for (let i = 0; i < 70; i++) {
    const v = 0.55 + rand() * 0.45;
    g.fillStyle = `rgba(150,112,74,${0.35 + rand() * 0.4})`;
    g.fillRect(rand() * W, Y(v), 1 + rand() * 6, 1 + rand() * 2);
  }
  return c;
}

/** Inner planking and ribs, darker toward the bilge. */
function paintInner(ppm: number, rand: Rand): HTMLCanvasElement {
  const [c, g] = makeCanvas(LEN * ppm, 1.4 * ppm);
  const W = c.width, H = c.height;
  g.fillStyle = "#8a6a49";
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(${rand() < 0.5 ? "60,40,24" : "170,135,95"},${0.08 + rand() * 0.1})`;
    g.fillRect(rand() * W, rand() * H, 20 + rand() * 80, 1);
  }
  for (const v of PLANKS) {
    g.fillStyle = "rgba(30,20,12,0.5)";
    g.fillRect(0, (1 - v) * H, W, Math.max(1, H * 0.012));
  }
  // frames (ribs) every 40 cm
  for (let x = 0.2 * ppm; x < W; x += 0.4 * ppm) {
    g.fillStyle = "rgba(40,26,14,0.45)";
    g.fillRect(x, 0, Math.max(2, 0.05 * ppm), H);
    g.fillStyle = "rgba(190,150,105,0.25)";
    g.fillRect(x, 0, 1, H);
  }
  const bilge = g.createLinearGradient(0, H, 0, H * 0.45);
  bilge.addColorStop(0, "rgba(28,20,14,0.7)");
  bilge.addColorStop(1, "rgba(28,20,14,0)");
  g.fillStyle = bilge;
  g.fillRect(0, H * 0.45, W, H * 0.55);
  return c;
}

/** Knotted nylon net: a diamond mesh over a dark sea-green ground. */
function paintNet(rand: Rand): HTMLCanvasElement {
  const [c, g] = makeCanvas(64, 64);
  g.fillStyle = "#2c4441";
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = "rgba(120,160,150,0.55)";
  g.lineWidth = 1;
  for (let k = -64; k < 64; k += 8) {
    g.beginPath();
    g.moveTo(k, 0);
    g.lineTo(k + 64, 64);
    g.moveTo(k + 64, 0);
    g.lineTo(k, 64);
    g.stroke();
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(${rand() < 0.5 ? "10,20,20" : "150,170,160"},0.25)`;
    g.fillRect(rand() * 64, rand() * 64, 3 + rand() * 8, 2 + rand() * 4);
  }
  return c;
}

// ---------------------------------------------------------------------------
// the model
// ---------------------------------------------------------------------------

export function buildBoat(ctx: ModelContext, opts?: { hull?: string; trim?: string }): ModelHandle {
  const low = ctx.lowPower;
  const ppm = low ? 20 : 40;
  const rand = makeRand(0xb0a7);
  const hullCol = opts?.hull ?? "#2e4c6d";
  const trimCol = opts?.trim ?? "#c9a24a";

  const group = new THREE.Group();
  group.name = "boat";
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];

  const tex = (canvas: HTMLCanvasElement, repeat = 1): THREE.CanvasTexture => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ctx.anisotropy;
    if (repeat !== 1) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat, repeat);
    }
    t.needsUpdate = true;
    textures.push(t);
    return t;
  };
  const std = (p: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial => {
    const m = new THREE.MeshStandardMaterial(p);
    materials.push(m);
    return m;
  };
  const mats = {
    hull: std({ map: tex(paintHull(ppm * 2, rand, hullCol, trimCol)), roughness: 0.62 }),
    inner: std({ map: tex(paintInner(ppm * 2, rand)), roughness: 0.85 }),
    wood: std({ color: "#9b7a55", roughness: 0.8 }),
    trim: std({ color: trimCol, roughness: 0.6 }),
    motor: std({ color: "#2a2c2e", roughness: 0.45, metalness: 0.3 }),
    motorBand: std({ color: "#b9bcbc", roughness: 0.4, metalness: 0.4 }),
    net: std({ map: tex(paintNet(rand), 4), roughness: 1 }),
  };
  const parts: Record<keyof typeof mats, THREE.BufferGeometry[]> = {
    hull: [], inner: [], wood: [], trim: [], motor: [], motorBand: [], net: [],
  };

  // ---- hull skins ----
  const NS = low ? 12 : 16, NJ = low ? 5 : 6;
  const zs: number[] = [];
  for (let i = 0; i <= NS; i++) zs.push(-HL + LEN * (1 - Math.pow(1 - i / NS, 1.35)));
  const skin = (inset: number, side: 1 | -1, outward: boolean): THREE.BufferGeometry => {
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let i = 0; i <= NS; i++) {
      for (let j = 0; j <= NJ; j++) {
        const [x, y] = sectionPoint(zs[i], (j / NJ) * (Math.PI / 2), inset);
        pos.push(side * x, y, zs[i]);
        uv.push(tOf(zs[i]), j / NJ);
      }
    }
    // the left (+X) outer skin winds (i,j)->(i,j+1)->(i+1,j+1); mirror or inner flips it
    const flip = (side === 1) !== outward;
    const at = (i: number, j: number) => i * (NJ + 1) + j;
    for (let i = 0; i < NS; i++) {
      for (let j = 0; j < NJ; j++) {
        const a = at(i, j), b = at(i, j + 1), c = at(i + 1, j + 1), d = at(i + 1, j);
        if (!flip) idx.push(a, b, c, a, c, d);
        else idx.push(a, c, b, a, d, c);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };
  const INSET = 0.045;
  for (const side of [1, -1] as const) {
    parts.hull.push(skin(0, side, true));
    parts.inner.push(skin(INSET, side, false));
  }

  // ---- gunwale caps joining the two skins ----
  {
    const pos: number[] = [];
    for (const side of [1, -1] as const) {
      for (let i = 0; i < NS; i++) {
        const z0 = zs[i], z1 = zs[i + 1];
        const [xo0, y0] = sectionPoint(z0, Math.PI / 2, 0), [xi0] = sectionPoint(z0, Math.PI / 2, INSET);
        const [xo1, y1] = sectionPoint(z1, Math.PI / 2, 0), [xi1] = sectionPoint(z1, Math.PI / 2, INSET);
        const o0: V3 = [side * (xo0 + 0.012), y0 + 0.025, z0], i0: V3 = [side * (xi0 - 0.01), y0 + 0.025, z0];
        const o1: V3 = [side * (xo1 + 0.012), y1 + 0.025, z1], i1: V3 = [side * (xi1 - 0.01), y1 + 0.025, z1];
        const quad = side === 1 ? [o0, i0, i1, o0, i1, o1] : [o0, i1, i0, o0, o1, i1];
        for (const p of quad) pos.push(...p);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    parts.wood.push(g);
    // the strip between cap and skin top shows as a thin trim line
    const lip: number[] = [];
    for (const side of [1, -1] as const) {
      for (let i = 0; i < NS; i++) {
        const z0 = zs[i], z1 = zs[i + 1];
        const [xo0, y0] = sectionPoint(z0, Math.PI / 2, 0), [xo1, y1] = sectionPoint(z1, Math.PI / 2, 0);
        const a: V3 = [side * (xo0 + 0.012), y0 + 0.025, z0], b: V3 = [side * (xo1 + 0.012), y1 + 0.025, z1];
        const c: V3 = [side * (xo1 + 0.012), y1 - 0.03, z1], d: V3 = [side * (xo0 + 0.012), y0 - 0.03, z0];
        const quad = side === 1 ? [a, c, d, a, b, c] : [a, d, c, a, c, b];
        for (const p of quad) lip.push(...p);
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(lip, 3));
    lg.computeVertexNormals();
    parts.trim.push(lg);
  }

  // ---- transom (outer painted face, inner wooden face, cap) ----
  {
    const z = zs[0];
    const ring: [number, number][] = [];
    for (let j = NJ; j >= 0; j--) ring.push([sectionPoint(z, (j / NJ) * (Math.PI / 2), 0)[0], sectionPoint(z, (j / NJ) * (Math.PI / 2), 0)[1]]);
    for (let j = 1; j <= NJ; j++) ring.push([-sectionPoint(z, (j / NJ) * (Math.PI / 2), 0)[0], sectionPoint(z, (j / NJ) * (Math.PI / 2), 0)[1]]);
    const cx = 0, cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    const face = (zf: number, facingBack: boolean, key: "hull" | "inner") => {
      const pos: number[] = [], uv: number[] = [];
      for (let k = 0; k < ring.length; k++) {
        const p = ring[k], q = ring[(k + 1) % ring.length];
        const tri: V3[] = facingBack ? [[cx, cy, zf], [q[0], q[1], zf], [p[0], p[1], zf]] : [[cx, cy, zf], [p[0], p[1], zf], [q[0], q[1], zf]];
        for (const t of tri) {
          pos.push(...t);
          uv.push(0.04, PLAIN_V);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.computeVertexNormals();
      // make sure it faces the intended way
      const nz = (g.getAttribute("normal") as THREE.BufferAttribute).getZ(0);
      if ((nz > 0) === facingBack) {
        const idx = pos.length / 3;
        const p2: number[] = [];
        for (let k = 0; k < idx; k += 3) {
          p2.push(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
          p2.push(pos[(k + 2) * 3], pos[(k + 2) * 3 + 1], pos[(k + 2) * 3 + 2]);
          p2.push(pos[(k + 1) * 3], pos[(k + 1) * 3 + 1], pos[(k + 1) * 3 + 2]);
        }
        g.setAttribute("position", new THREE.Float32BufferAttribute(p2, 3));
        g.computeVertexNormals();
      }
      parts[key].push(g);
    };
    face(z, true, "hull");
    face(z + 0.04, false, "inner");
    const [xt, yt] = sectionPoint(z, Math.PI / 2, 0);
    parts.wood.push(boxMM(-xt - 0.012, yt - 0.02, z - 0.012, xt + 0.012, yt + 0.03, z + 0.06));
  }

  // ---- stem post: the raised, slightly raked bow ----
  {
    const g = new THREE.BoxGeometry(0.07, 0.5, 0.1);
    g.translate(0, 0.25, 0);
    g.rotateX(0.32);
    g.translate(0, BOW_Y - 0.12, HL - 0.02);
    parts.trim.push(g);
  }

  // ---- interior: a plank floor just above the waterline, thwarts, net ----
  // (the floor also keeps the scene's water plane from showing inside the hull)
  const FLOOR_Y = 0.05;
  const innerHalfWidthAt = (z: number, y: number): number => {
    let hw = -1;
    for (let k = 0; k <= 24; k++) {
      const [x, yy] = sectionPoint(z, (k / 24) * (Math.PI / 2), INSET);
      if (yy <= y) hw = x;
    }
    return hw;
  };
  {
    const pos: number[] = [], uv: number[] = [];
    const fz: number[] = [];
    for (let i = 0; i <= NS * 2; i++) fz.push(zs[0] + 0.04 + ((zs[NS] - zs[0] - 0.04) * i) / (NS * 2));
    const rows = fz.map((z) => ({ z, w: innerHalfWidthAt(z, FLOOR_Y) })).filter((r) => r.w > 0.02);
    for (let i = 0; i + 1 < rows.length; i++) {
      const a = rows[i], b = rows[i + 1];
      const quad: V3[] = [[-a.w, FLOOR_Y, a.z], [-b.w, FLOOR_Y, b.z], [b.w, FLOOR_Y, b.z], [-a.w, FLOOR_Y, a.z], [b.w, FLOOR_Y, b.z], [a.w, FLOOR_Y, a.z]];
      for (const q of quad) {
        pos.push(...q);
        uv.push(tOf(q[2]), 0.3 + q[0] * 0.35);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    parts.inner.push(g);
  }
  for (const z of [-2.1, -0.3, 1.45]) {
    const y = sheer(z) - 0.17;
    const hw = innerHalfWidthAt(z, y);
    parts.wood.push(boxMM(-hw, y - 0.025, z - 0.13, hw, y + 0.025, z + 0.13));
  }
  {
    const net = new THREE.IcosahedronGeometry(0.36, 1);
    const p = net.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const h = Math.sin(x * 17.1 + y * 5.3) * Math.cos(z * 13.7 - x * 3.1);
      const k = 1 + 0.12 * h;
      p.setXYZ(i, x * 1.35 * k, Math.max(-0.1, y * 0.42 * k), z * k);
    }
    net.deleteAttribute("normal");
    net.computeVertexNormals();
    net.translate(0.05, FLOOR_Y + 0.1, 0.55);
    parts.net.push(net);
  }

  // ---- outboard motor on the transom ----
  {
    const zt = zs[0];
    const ty = sheer(zt);
    parts.motor.push(boxMM(-0.07, ty - 0.12, zt - 0.1, 0.07, ty + 0.06, zt + 0.06));
    parts.motor.push(boxMM(-0.16, ty + 0.06, zt - 0.5, 0.16, ty + 0.42, zt - 0.06));
    parts.motorBand.push(boxMM(-0.165, ty + 0.2, zt - 0.505, 0.165, ty + 0.25, zt - 0.055));
    parts.motor.push(boxMM(-0.14, ty + 0.42, zt - 0.47, 0.14, ty + 0.49, zt - 0.09));
    parts.motor.push(boxMM(-0.045, -0.48, zt - 0.32, 0.045, ty + 0.08, zt - 0.2));
    parts.motorBand.push(boxMM(-0.12, -0.3, zt - 0.42, 0.12, -0.27, zt - 0.14));
    parts.motor.push(boxMM(-0.05, -0.56, zt - 0.4, 0.05, -0.44, zt - 0.16));
    // tiller reaching forward over the transom
    const a = new THREE.Vector3(0, ty + 0.3, zt - 0.08), b = new THREE.Vector3(0.06, ty + 0.38, zt + 0.55);
    const tl = new THREE.CylinderGeometry(0.022, 0.022, a.distanceTo(b), 6);
    tl.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()), new THREE.Vector3(1, 1, 1)));
    parts.motor.push(tl);
  }

  for (const key of Object.keys(parts) as (keyof typeof mats)[]) {
    if (!parts[key].length) continue;
    const geo = mergeGeos(parts[key]);
    geometries.push(geo);
    const mesh = new THREE.Mesh(geo, mats[key]);
    mesh.name = "boat-" + key;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  return {
    group,
    setNight() {
      /* no lamps aboard */
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
      group.clear();
    },
  };
}
