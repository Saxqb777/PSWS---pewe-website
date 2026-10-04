import * as THREE from "three";
import type { ModelContext, ModelHandle } from "../types";

/*
 * The old creek bridge: a long, flat reinforced-concrete beam deck on square
 * twin-column piers, weathered dark by forty monsoons, with tide marks on the
 * piers, drain spouts staining the edge beams and a thin rust-brown railing.
 *
 * Local frame: the span runs along X, centred on the origin. The origin is the
 * WATER LEVEL; the deck top is at opts.deckHeight (default 4.5 m) and the
 * piers go down to y = -3. Width 5 m along Z.
 */

type Rand = () => number;
type Noise2 = (u: number, v: number) => number;

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
  if (!g) throw new Error("bridge: 2D canvas unavailable");
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

  add(key: string, geo: THREE.BufferGeometry, m?: THREE.Matrix4 | null): void {
    let g = geo;
    if (geo.index) {
      g = geo.toNonIndexed();
      geo.dispose();
    }
    if (m) g.applyMatrix4(m);
    if (!g.getAttribute("normal")) g.computeVertexNormals();
    boxUV(g);
    const list = this.parts.get(key);
    if (list) list.push(g);
    else this.parts.set(key, [g]);
  }

  build(group: THREE.Group, mats: Record<string, THREE.Material>, out: THREE.BufferGeometry[]): void {
    for (const [key, list] of this.parts) {
      const mat = mats[key];
      if (!mat) throw new Error("bridge: no material " + key);
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
      mesh.name = "bridge-" + key;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
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

// ---------------------------------------------------------------------------

const CON_WM = 16; // concrete texture repeats every 16 m horizontally
const Y_LOW = -3;

/**
 * Weathered concrete; v maps to absolute height so the tide band, the
 * run-off under the deck edge and the efflorescence land where they belong.
 */
function paintConcrete(ppm: number, rand: Rand, deckTop: number, hm: number, spouts: number[]): HTMLCanvasElement {
  const W = Math.round(CON_WM * ppm), H = Math.round(hm * ppm);
  const [c, g] = makeCanvas(W, H);
  const n1 = periodicNoise(rand, 6), n2 = periodicNoise(rand, 19), n3 = periodicNoise(rand, 61);
  const tide = periodicNoise(rand, 29);
  const img = g.createImageData(W, H);
  const d = img.data;
  for (let py = 0; py < H; py++) {
    const y = hm - (py + 0.5) / ppm + Y_LOW; // absolute height
    const v = py / H;
    for (let px = 0; px < W; px++) {
      const u = px / W;
      let r = 125, gg = 123, b = 116; // #7d7b74
      const k = 1 + (n1(u, v) - 0.5) * 0.16 + (n2(u, v) - 0.5) * 0.1 + (n3(u, v) - 0.5) * 0.08;
      r *= k; gg *= k; b *= k;
      // vertical rain streaking (stronger near the top of each face)
      const st = n3(u, 0.13) * n2(u, 0.61);
      const sw = 0.22 * smooth(0.25, 0.6, st);
      r *= 1 - sw; gg *= 1 - sw; b *= 1 - sw * 0.9;
      // tide zone: dark algae from the low-water mark up to the high-tide line
      const top = 0.9 + 0.35 * tide(u, 0.5);
      if (y < top) {
        const w = Math.min(1, 0.55 + 0.35 * smooth(top, top - 0.6, y)) * smooth(top + 0.05, top - 0.25, y);
        r += (40 - r) * w; gg += (48 - gg) * w; b += (40 - b) * w;
      }
      // pale salt line just above the tide mark
      if (y > top && y < top + 0.25) {
        const w = 0.18 * (1 - (y - top) / 0.25);
        r += (190 - r) * w; gg += (188 - gg) * w; b += (176 - b) * w;
      }
      const gr = (rand() - 0.5) * 10;
      const i = (py * W + px) * 4;
      d[i] = r + gr; d[i + 1] = gg + gr; d[i + 2] = b + gr; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const X = (u: number) => u * ppm;
  const Y = (y: number) => (hm - (y - Y_LOW)) * ppm;
  // run-off stains below each drain spout: a fan of tapering streaks
  for (const u of spouts) {
    for (let k = 0; k < 7; k++) {
      const x = X(u + (rand() - 0.5) * 0.35);
      const top = deckTop - 0.45 - rand() * 0.1;
      const len = 0.5 + rand() * 1.6;
      const w = Math.max(1, (0.025 + rand() * 0.07) * ppm);
      const grad = g.createLinearGradient(0, Y(top), 0, Y(top - len));
      grad.addColorStop(0, `rgba(34,32,26,${0.18 + rand() * 0.16})`);
      grad.addColorStop(1, "rgba(34,32,26,0)");
      g.fillStyle = grad;
      g.fillRect(x - w / 2, Y(top), w, len * ppm);
    }
  }
  // white efflorescence weeping from cracks under the deck
  for (let i = 0; i < 10; i++) {
    const x = rand() * W, top = deckTop - 0.4 - rand() * 0.4, len = 0.3 + rand() * 0.9;
    const grad = g.createLinearGradient(0, Y(top), 0, Y(top - len));
    grad.addColorStop(0, "rgba(215,212,200,0.17)");
    grad.addColorStop(1, "rgba(225,222,210,0)");
    g.fillStyle = grad;
    g.fillRect(x, Y(top), Math.max(1, (0.03 + rand() * 0.05) * ppm), len * ppm);
  }
  // shuttering lines from the original formwork
  g.fillStyle = "rgba(40,38,34,0.12)";
  for (let y = Y_LOW + 0.6; y < deckTop; y += 0.6) g.fillRect(0, Y(y), W, 1);
  return c;
}

const ROAD_WM = 20, ROAD_HM = 5;

/** Worn asphalt over the deck: tyre tracks, patches and a dusty margin. */
function paintRoad(ppm: number, rand: Rand): HTMLCanvasElement {
  const W = Math.round(ROAD_WM * ppm), H = Math.round(ROAD_HM * ppm);
  const [c, g] = makeCanvas(W, H);
  const n1 = periodicNoise(rand, 7), n2 = periodicNoise(rand, 23);
  const img = g.createImageData(W, H);
  const d = img.data;
  for (let py = 0; py < H; py++) {
    const zz = (py + 0.5) / ppm; // 0..5 across the deck
    for (let px = 0; px < W; px++) {
      const u = px / W, v = py / H;
      let r = 74, gg = 72, b = 68;
      const k = 1 + (n1(u, v) - 0.5) * 0.2 + (n2(u, v) - 0.5) * 0.12;
      r *= k; gg *= k; b *= k;
      // polished wheel tracks
      for (const t of [1.25, 1.95, 3.05, 3.75]) {
        const w = Math.exp(-((zz - t) * (zz - t)) / 0.04) * 0.14;
        r += (40 - r) * w; gg += (40 - gg) * w; b += (40 - b) * w;
      }
      // dust and silt along the kerbs
      const e = Math.min(zz, 5 - zz);
      const dust = smooth(0.7, 0.3, e) * 0.45;
      r += (132 - r) * dust; gg += (112 - gg) * dust; b += (92 - b) * dust;
      const gr = (rand() - 0.5) * 14;
      const i = (py * W + px) * 4;
      d[i] = r + gr; d[i + 1] = gg + gr; d[i + 2] = b + gr; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 6; i++) {
    g.fillStyle = `rgba(${rand() < 0.5 ? "40,40,40" : "100,98,92"},0.35)`;
    g.fillRect(rand() * W, (0.6 + rand() * 3) * ppm, (0.6 + rand() * 1.6) * ppm, (0.4 + rand() * 1.2) * ppm);
  }
  return c;
}

// ---------------------------------------------------------------------------

export function buildBridge(ctx: ModelContext, opts?: { length?: number; deckHeight?: number }): ModelHandle {
  const low = ctx.lowPower;
  const ppm = low ? 20 : 40;
  const rand = makeRand(0xb21d6e);
  const length = Math.max(12, opts?.length ?? 60);
  const deckTop = Math.max(1.5, opts?.deckHeight ?? 4.5);

  const group = new THREE.Group();
  group.name = "bridge";
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];

  const HL = length / 2, HW = 2.5;
  const SLAB = 0.32, BEAM = 1.05; // slab thickness, beam depth below the deck top
  const KERB = 0.25;
  const spans = Math.min(7, Math.max(5, Math.round(length / 12)));
  const pierXs: number[] = [];
  for (let i = 1; i < spans; i++) pierXs.push(-HL + (i * length) / spans);

  // drain spouts on both edges at x = 4 + 8k: that keeps them on the same two
  // texture columns (mod 16 m) on both faces, so every stain sits under a spout
  const spoutXs: number[] = [];
  for (let x = 4 - 8 * Math.floor((HL + 4) / 8); x < HL - 1.5; x += 8) if (x > -HL + 1.5) spoutXs.push(x);

  const hm = deckTop - Y_LOW + 1.0;
  const tex = (canvas: HTMLCanvasElement, repU: number, repV: number, offV: number): THREE.CanvasTexture => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ctx.anisotropy;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repU, repV);
    t.offset.set(0, offV);
    t.needsUpdate = true;
    textures.push(t);
    return t;
  };
  const std = (p: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial => {
    const m = new THREE.MeshStandardMaterial(p);
    materials.push(m);
    return m;
  };
  // the stain positions in texture space (u wraps every CON_WM metres)
  const conMap = tex(paintConcrete(ppm, rand, deckTop, hm, [4, 12]), 1 / CON_WM, 1 / hm, -Y_LOW / hm);
  const roadMap = tex(paintRoad(ppm / 2, rand), 1 / ROAD_WM, 1 / ROAD_HM, 0.5);

  const M: Record<string, THREE.Material> = {
    concrete: std({ map: conMap, roughness: 0.95 }),
    road: std({ map: roadMap, roughness: 0.9 }),
    rail: std({ color: "#6e4130", roughness: 0.65, metalness: 0.45 }),
    pipe: std({ color: "#2b2a28", roughness: 0.8 }),
  };

  const B = new Batch();

  // deck slab (road on top), edge beams and two inner girders
  B.add("concrete", boxMM(-HL, deckTop - SLAB, -HW, HL, deckTop - 0.06, HW));
  B.add("road", boxMM(-HL, deckTop - 0.06, -HW + KERB + 0.05, HL, deckTop, HW - KERB - 0.05));
  for (const z of [-HW + 0.2, -0.9, 0.9, HW - 0.2]) {
    const w = Math.abs(z) > 2 ? 0.4 : 0.34;
    B.add("concrete", boxMM(-HL, deckTop - BEAM, z - w / 2, HL, deckTop - SLAB + 0.01, z + w / 2));
  }
  // kerbs
  for (const sz of [-1, 1]) {
    const z0 = sz < 0 ? -HW : HW - KERB - 0.05, z1 = sz < 0 ? -HW + KERB + 0.05 : HW;
    B.add("concrete", boxMM(-HL, deckTop - 0.06, z0, HL, deckTop + KERB, z1));
  }

  // piers: twin square columns under a crosshead
  const col = 0.85, capH = 0.6;
  for (const x of pierXs) {
    B.add("concrete", boxMM(x - 0.6, deckTop - BEAM - capH, -HW - 0.1, x + 0.6, deckTop - BEAM, HW + 0.1));
    for (const z of [-1.55, 1.55]) {
      B.add("concrete", boxMM(x - col / 2, Y_LOW, z - col / 2, x + col / 2, deckTop - BEAM - capH, z + col / 2));
      // a wider footing showing at low tide
      B.add("concrete", boxMM(x - col / 2 - 0.2, Y_LOW, z - col / 2 - 0.2, x + col / 2 + 0.2, -0.35, z + col / 2 + 0.2));
    }
  }
  // abutments at both ends
  for (const sx of [-1, 1]) {
    const x0 = sx < 0 ? -HL - 0.8 : HL - 0.4, x1 = sx < 0 ? -HL + 0.4 : HL + 0.8;
    B.add("concrete", boxMM(x0, Y_LOW, -HW - 0.3, x1, deckTop - SLAB, HW + 0.3));
    // short wing walls
    for (const sz of [-1, 1]) {
      const z0 = sz < 0 ? -HW - 0.3 : HW, z1 = sz < 0 ? -HW : HW + 0.3;
      const wx0 = sx < 0 ? -HL - 3.2 : HL - 0.4, wx1 = sx < 0 ? -HL + 0.4 : HL + 3.2;
      B.add("concrete", boxMM(wx0, Y_LOW, z0, wx1, deckTop - 0.6, z1));
    }
  }

  // drain spouts poking out of the edge beams
  for (const x of spoutXs) {
    for (const sz of [-1, 1]) {
      const p = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6);
      p.rotateX(Math.PI / 2);
      p.translate(x, deckTop - 0.5, sz * (HW + 0.08));
      B.add("pipe", p);
    }
  }

  // thin rust-brown railing: posts on the kerbs, a top rail and a mid rail
  {
    const postGap = low ? 3 : 2;
    const nPost = Math.max(2, Math.round(length / postGap));
    const y0 = deckTop + KERB, top = y0 + 0.95;
    for (const sz of [-1, 1]) {
      const z = sz * (HW - 0.14);
      for (let i = 0; i <= nPost; i++) {
        const x = -HL + 0.15 + ((length - 0.3) * i) / nPost;
        B.add("rail", boxMM(x - 0.03, y0, z - 0.03, x + 0.03, top, z + 0.03));
      }
      B.add("rail", boxMM(-HL + 0.1, top - 0.02, z - 0.035, HL - 0.1, top + 0.03, z + 0.035));
      B.add("rail", boxMM(-HL + 0.1, y0 + 0.45, z - 0.02, HL - 0.1, y0 + 0.49, z + 0.02));
    }
  }

  B.build(group, M, geometries);

  return {
    group,
    setNight() {
      /* the bridge itself carries no lamps */
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
      group.clear();
    },
  };
}
