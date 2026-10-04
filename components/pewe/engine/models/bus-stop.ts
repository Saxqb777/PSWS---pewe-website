import * as THREE from "three";
import type { ModelContext, ModelHandle } from "../types";

/*
 * Village ST bus shelter: laterite side and back walls on a concrete floor,
 * a concrete bench, and a corrugated tin roof that sheds the monsoon to the
 * back. A small blank stop sign (a bus pictogram, no lettering) stands beside it.
 *
 * Local frame: origin = centre of the footprint at ground level.
 * 4.5 m wide along Z, 2.2 m deep along X, open side facing -X.
 */

type Rand = () => number;

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
  if (!g) throw new Error("bus-stop: 2D canvas unavailable");
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

  add(key: string, geo: THREE.BufferGeometry, m?: THREE.Matrix4 | null, uvMode: "box" | "keep" = "box"): void {
    let g = geo;
    if (geo.index) {
      g = geo.toNonIndexed();
      geo.dispose();
    }
    if (m) g.applyMatrix4(m);
    if (!g.getAttribute("normal")) g.computeVertexNormals();
    if (uvMode === "box") boxUV(g);
    const list = this.parts.get(key);
    if (list) list.push(g);
    else this.parts.set(key, [g]);
  }

  build(group: THREE.Group, mats: Record<string, THREE.Material>, out: THREE.BufferGeometry[]): void {
    for (const [key, list] of this.parts) {
      const mat = mats[key];
      if (!mat) throw new Error("bus-stop: no material " + key);
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
      mesh.name = "bus-stop-" + key;
      mesh.castShadow = key !== "sign";
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

const LAT_WM = 2, LAT_HM = 2.4, LAT_BW = 0.4, LAT_BH = 0.2;

function paintLaterite(ppm: number, rand: Rand): HTMLCanvasElement {
  const W = Math.round(LAT_WM * ppm), H = Math.round(LAT_HM * ppm);
  const [c, g] = makeCanvas(W, H);
  g.fillStyle = "#8f7b6b";
  g.fillRect(0, 0, W, H);
  const bw = LAT_BW * ppm, bh = LAT_BH * ppm, mj = Math.max(1, 0.018 * ppm);
  const rows = Math.round(LAT_HM / LAT_BH), cols = Math.round(LAT_WM / LAT_BW);
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? bw / 2 : 0;
    for (let q = -1; q < cols + 1; q++) {
      const x = q * bw + off, y = r * bh;
      const k = 0.88 + rand() * 0.16, o = rand() * 0.12;
      g.fillStyle = `rgb(${(155 * k) | 0},${(79 * k * (0.94 + o)) | 0},${(53 * k * (0.96 + o * 0.3)) | 0})`;
      g.fillRect(x + mj / 2, y + mj / 2, bw - mj, bh - mj);
      g.fillStyle = "rgba(255,220,190,0.07)";
      g.fillRect(x + mj / 2, y + mj / 2, bw - mj, bh * 0.25);
      g.fillStyle = "rgba(40,15,10,0.10)";
      g.fillRect(x + mj / 2, y + bh * 0.72, bw - mj, bh * 0.28 - mj / 2);
    }
  }
  for (let i = 0; i < W * H * 0.05; i++) {
    g.fillStyle = rand() < 0.75 ? "rgba(52,22,14,0.28)" : "rgba(200,160,118,0.2)";
    g.fillRect(rand() * W, rand() * H, 1, 1);
  }
  // splash at the foot, darker where the floor slab meets the wall
  const grad = g.createLinearGradient(0, H, 0, H - 0.6 * ppm);
  grad.addColorStop(0, "rgba(58,38,28,0.5)");
  grad.addColorStop(1, "rgba(58,38,28,0)");
  g.fillStyle = grad;
  g.fillRect(0, H - 0.6 * ppm, W, 0.6 * ppm);
  return c;
}

const TIN_WM = 5.2, TIN_HM = 3.0;

/** Painted tin: grey-blue with rust bleeding down the corrugations. */
function paintTin(ppm: number, rand: Rand): HTMLCanvasElement {
  const W = Math.round(TIN_WM * ppm), H = Math.round(TIN_HM * ppm);
  const [c, g] = makeCanvas(W, H);
  g.fillStyle = "#8fa3ad";
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 28; i++) {
    const x = rand() * W, w = Math.max(1, ppm * (0.03 + rand() * 0.12));
    const len = (0.3 + rand() * 1.8) * ppm;
    const grad = g.createLinearGradient(0, H, 0, H - len);
    const rust = rand() < 0.6;
    grad.addColorStop(0, rust ? "rgba(128,70,40,0.5)" : "rgba(70,74,74,0.25)");
    grad.addColorStop(1, "rgba(128,70,40,0)");
    g.fillStyle = grad;
    g.fillRect(x, H - len, w, len);
  }
  // overlapping sheet joints every ~1 m
  for (let x = ppm * 0.9; x < W; x += ppm * 1.0) {
    g.fillStyle = "rgba(40,48,52,0.35)";
    g.fillRect(x, 0, Math.max(1, ppm * 0.02), H);
  }
  // lower edge (front) stays cleaner, the top collects dust
  const grad = g.createLinearGradient(0, 0, 0, H * 0.4);
  grad.addColorStop(0, "rgba(150,120,90,0.25)");
  grad.addColorStop(1, "rgba(150,120,90,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H * 0.4);
  return c;
}

/** Stop sign: red field, cream border and a bus pictogram (no lettering). */
function paintSign(): HTMLCanvasElement {
  const [c, g] = makeCanvas(128, 96);
  g.fillStyle = "#efe2c4";
  g.fillRect(0, 0, 128, 96);
  g.fillStyle = "#b8322a";
  g.fillRect(7, 7, 114, 82);
  g.fillStyle = "#efe2c4";
  const r = 6, x0 = 26, y0 = 30, w = 76, h = 34;
  g.beginPath();
  g.moveTo(x0 + r, y0);
  g.lineTo(x0 + w - r, y0);
  g.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  g.lineTo(x0 + w, y0 + h);
  g.lineTo(x0, y0 + h);
  g.lineTo(x0, y0 + r);
  g.quadraticCurveTo(x0, y0, x0 + r, y0);
  g.fill();
  g.fillStyle = "#b8322a";
  for (let i = 0; i < 5; i++) g.fillRect(x0 + 6 + i * 14, y0 + 6, 10, 11);
  g.fillStyle = "#efe2c4";
  for (const wx of [x0 + 16, x0 + w - 16]) {
    g.beginPath();
    g.arc(wx, y0 + h + 2, 7, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = "#b8322a";
  for (const wx of [x0 + 16, x0 + w - 16]) {
    g.beginPath();
    g.arc(wx, y0 + h + 2, 3, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

// ---------------------------------------------------------------------------

export function buildBusStop(ctx: ModelContext): ModelHandle {
  const low = ctx.lowPower;
  const ppm = low ? 20 : 40;
  const rand = makeRand(0xb05);

  const group = new THREE.Group();
  group.name = "bus-stop";
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];

  const tex = (canvas: HTMLCanvasElement, wm: number, hm: number): THREE.CanvasTexture => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
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

  const M: Record<string, THREE.Material> = {
    laterite: std({ map: tex(paintLaterite(ppm * 1.6, rand), LAT_WM, LAT_HM), roughness: 0.95 }),
    concrete: std({ color: "#a29d93", roughness: 0.95 }),
    tin: std({ map: tex(paintTin(ppm, rand), TIN_WM, TIN_HM), roughness: 0.55, metalness: 0.35, side: THREE.DoubleSide }),
    steel: std({ color: "#3a3d3e", roughness: 0.6, metalness: 0.4 }),
    sign: std({ map: tex(paintSign(), 1, 1), roughness: 0.6 }),
  };

  const B = new Batch();
  const HX = 1.1, HZ = 2.25, T = 0.2;
  const FLOOR = 0.15;
  const yFront = 2.62, yBack = 2.3; // roof heights at x = -HX and x = +HX

  // floor slab and front step
  B.add("concrete", boxMM(-HX - 0.1, 0, -HZ - 0.1, HX + 0.05, FLOOR, HZ + 0.1));
  B.add("concrete", boxMM(-HX - 0.45, 0, -HZ + 0.4, -HX - 0.1, FLOOR * 0.5, HZ - 0.4));

  // back wall
  B.add("laterite", boxMM(HX - T, FLOOR, -HZ, HX, yBack - 0.08, HZ));
  // side walls: tops follow the roof pitch
  const slope = (yFront - yBack) / (2 * HX);
  for (const sz of [-1, 1]) {
    const sh = new THREE.Shape();
    const x0 = -HX + 0.05, x1 = HX - T;
    sh.moveTo(x0, FLOOR);
    sh.lineTo(x1, FLOOR);
    sh.lineTo(x1, yBack - 0.08 + slope * T);
    sh.lineTo(x0, yFront - 0.08 - slope * 0.05);
    const g = new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false, curveSegments: 1, steps: 1 });
    // shape x -> world x, extrusion -> world z
    g.translate(0, 0, sz < 0 ? -HZ : HZ - T);
    B.add("laterite", g);
  }
  // steel rafters and a front purlin carrying the sheet
  for (const sz of [-1, 1]) {
    const rz = sz * (HZ - T / 2);
    const len = Math.hypot(2 * HX + 0.3, yFront - yBack);
    const r = new THREE.BoxGeometry(len, 0.08, 0.06);
    r.rotateZ(-Math.atan2(yFront - yBack, 2 * HX));
    r.translate(0.0, (yFront + yBack) / 2 - 0.06, rz);
    B.add("steel", r);
  }
  B.add("steel", boxMM(-HX - 0.05, yFront - 0.14, -HZ - 0.15, -HX + 0.03, yFront - 0.04, HZ + 0.15));
  B.add("steel", boxMM(-0.05, (yFront + yBack) / 2 - 0.1, -HZ - 0.15, 0.05, (yFront + yBack) / 2 - 0.02, HZ + 0.15));

  // corrugated roof sheet, corrugations running down the slope
  {
    const x0 = -HX - 0.35, x1 = HX + 0.18;
    const z0 = -HZ - 0.3, z1 = HZ + 0.3;
    const yAt = (x: number) => yFront + (x - -HX) * -slope;
    const pitch = 0.2, amp = 0.025;
    const nz = Math.round((z1 - z0) / pitch) * (low ? 2 : 4);
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    const sf = Math.hypot(1, slope);
    for (let i = 0; i <= nz; i++) {
      const z = z0 + ((z1 - z0) * i) / nz;
      const dy = Math.sin(((z - z0) / pitch) * Math.PI * 2) * amp;
      for (const x of [x0, x1]) {
        pos.push(x, yAt(x) + dy + 0.02, z);
        uv.push(z, (x1 - x) * sf);
      }
      if (i > 0) {
        // a/b = front (x0) edge at z(i-1)/z(i); +1 = back (x1) edge; wound to face up
        const a = (i - 1) * 2, b = i * 2;
        idx.push(a, b + 1, a + 1, a, b, b + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    B.add("tin", g, null, "keep");
  }

  // concrete bench along the back wall
  B.add("concrete", boxMM(HX - T - 0.42, 0.44, -HZ + T + 0.15, HX - T, 0.5, HZ - T - 0.15));
  for (const z of [-1.4, 0, 1.4]) B.add("concrete", boxMM(HX - T - 0.36, FLOOR, z - 0.07, HX - T - 0.04, 0.44, z + 0.07));

  // stop sign on a post beside the shelter (board faces along the road)
  {
    const px = -HX - 0.7, pz = -HZ - 0.8;
    B.add("steel", new THREE.CylinderGeometry(0.035, 0.035, 2.5, 8).translate(px, 1.25, pz));
    B.add("steel", boxMM(px - 0.28, 2.09, pz - 0.015, px + 0.28, 2.51, pz + 0.015));
    for (const s of [-1, 1]) {
      const face = new THREE.PlaneGeometry(0.56, 0.42);
      if (s < 0) face.rotateY(Math.PI);
      face.translate(px, 2.3, pz + s * 0.016);
      B.add("sign", face, null, "keep");
    }
  }

  B.build(group, M, geometries);

  return {
    group,
    setNight() {
      /* an unlit village shelter */
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
      group.clear();
    },
  };
}
