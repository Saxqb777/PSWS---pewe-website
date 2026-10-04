import * as THREE from "three";
import type { ModelContext, ModelHandle } from "../types";

/*
 * MSRTC ordinary bus, the "Lal Pari": the red State Transport bus that links
 * Pewe to Guhagar. Bright red body, cream band under the windows, dark window
 * band with red pillars, grey roof with a luggage rail, black bumpers.
 *
 * Local frame: origin at ground level under the centre of the footprint.
 * The FRONT faces +Z, so the bus's left (kerb side, passenger door) is +X.
 * group.userData.wheels holds the six wheel meshes; the engine spins them
 * about their local X axis. update() adds a slight body sway that follows
 * how fast the wheels are turning.
 */

// ---------------------------------------------------------------------------
// small toolkit
// ---------------------------------------------------------------------------

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
  if (!g) throw new Error("st-bus: 2D canvas unavailable");
  return [c, g];
}

/** Metre UVs projected along the dominant axis of each triangle. */
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

/** UVs from a function of the (already transformed) vertex position. */
function mapUV(geo: THREE.BufferGeometry, f: (x: number, y: number, z: number) => [number, number]): void {
  const p = geo.getAttribute("position") as THREE.BufferAttribute;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const [u, v] = f(p.getX(i), p.getY(i), p.getZ(i));
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
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

  build(group: THREE.Object3D, mats: Record<string, THREE.Material>, shadows: (key: string) => [boolean, boolean], out: THREE.BufferGeometry[]): void {
    for (const [key, list] of this.parts) {
      const mat = mats[key];
      if (!mat) throw new Error("st-bus: no material " + key);
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
      mesh.name = "st-bus-" + key;
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

function rodGeo(a: V3, b: V3, r: number, seg: number): THREE.BufferGeometry {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const g = new THREE.CylinderGeometry(r, r, va.distanceTo(vb), seg, 1, false);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(va.add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  return g;
}

// ---------------------------------------------------------------------------
// dimensions
// ---------------------------------------------------------------------------

const L = 11, W = 2.5;
const HW = W / 2, ZF = L / 2, ZR = -L / 2;
const Y0 = 0.42; // underside of the body
const YK = 0.56; // top of the dark skirt band
const YRUB = 0.95; // rub rail
const YB0 = 1.4, YB1 = 1.66; // cream band
const YW0 = 1.72, YW1 = 2.58; // window band
const YS = 2.74; // top of the straight side
const RR = 0.21; // roof edge radius
const YT = YS + RR; // roof crown, 2.95 m
const YRAIL = 3.1; // luggage rail top
const FA = 3.3, RA = -2.4; // axle positions (z)
const WR = 0.5, AR = 0.6; // wheel radius, arch radius
const DOOR: [number, number] = [-4.45, -3.45]; // rear-left passenger door (z)
const LIVERY_W = 22, LIVERY_H = 3.2; // metres covered by the side livery canvas

// window spans (z0, z1) per side
function windowSpans(): { left: [number, number][]; right: [number, number][] } {
  const left: [number, number][] = [[4.3, 5.28]];
  const right: [number, number][] = [[4.34, 5.28]];
  const pil = 0.13;
  const spanL = (z1: number, z0: number, n: number, out: [number, number][]) => {
    const pitch = (z1 - z0) / n;
    for (let i = 0; i < n; i++) out.push([z0 + i * pitch + pil / 2, z0 + (i + 1) * pitch - pil / 2]);
  };
  spanL(4.2, -3.28, 7, left);
  left.push([-5.32, -4.58]);
  spanL(4.22, -5.38, 9, right);
  return { left, right };
}

// ---------------------------------------------------------------------------
// painters
// ---------------------------------------------------------------------------

const RED = "#c3352b", RED_DARK = "#992820", CREAM = "#efe2c4", ALU = "#c4c2bb";

function paintLivery(ppm: number, rand: Rand, spans: { left: [number, number][]; right: [number, number][] }): HTMLCanvasElement {
  const [c, g] = makeCanvas(LIVERY_W * ppm, LIVERY_H * ppm);
  const X = (u: number) => u * ppm;
  const Y = (y: number) => (LIVERY_H - y) * ppm;
  g.fillStyle = RED;
  g.fillRect(0, 0, c.width, c.height);
  // faint panel tonal variation (sun-faded panels)
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(${rand() < 0.5 ? "255,190,170" : "70,10,8"},${0.025 + rand() * 0.03})`;
    g.fillRect(X(rand() * LIVERY_W), Y(2.6), X(0.6 + rand() * 1.4), (2.6 - Y0) * ppm);
  }
  for (const side of ["R", "L"] as const) {
    const U = (z: number) => (side === "R" ? z + 5.5 : 16.5 - z);
    const u0 = side === "R" ? 0 : 11;
    const bandRect = (y0: number, y1: number, col: string) => {
      g.fillStyle = col;
      g.fillRect(X(u0), Y(y1), X(11), (y1 - y0) * ppm);
    };
    bandRect(Y0 - 0.1, YK, RED_DARK);
    bandRect(YRUB - 0.025, YRUB + 0.02, ALU);
    bandRect(YRUB - 0.045, YRUB - 0.025, "rgba(60,8,6,0.55)");
    bandRect(YB0, YB1, CREAM);
    bandRect(YB0, YB0 + 0.012, "rgba(90,40,20,0.5)");
    bandRect(YB1, YW0, ALU);
    bandRect(2.65, 2.68, ALU);
    bandRect(2.63, 2.65, "rgba(60,8,6,0.5)");
    // aluminium window surrounds + panel seams with rivets under each pillar
    const spans1 = side === "R" ? spans.right : spans.left;
    for (const [z0, z1] of spans1) {
      const a = Math.min(U(z0), U(z1)), b = Math.max(U(z0), U(z1));
      g.strokeStyle = ALU;
      g.lineWidth = Math.max(1, 0.035 * ppm);
      g.strokeRect(X(a) - 0.02 * ppm, Y(YW1 + 0.02), X(b - a) + 0.04 * ppm, (YW1 - YW0 + 0.04) * ppm);
      for (const e of [a - 0.065, b + 0.065]) {
        if (e < u0 + 0.1 || e > u0 + 10.9) continue;
        g.fillStyle = "rgba(70,12,8,0.45)";
        g.fillRect(X(e) - 0.5, Y(YB0), Math.max(1, 0.012 * ppm), (YB0 - YK) * ppm);
        g.fillStyle = "rgba(255,225,210,0.35)";
        for (let y = YK + 0.06; y < YB0 - 0.03; y += 0.09) g.fillRect(X(e + 0.025), Y(y), 1, 1);
      }
    }
    // rubber trims around the wheel arches
    for (const za of [FA, RA]) {
      g.strokeStyle = "#1c1c1c";
      g.lineWidth = 0.07 * ppm;
      g.beginPath();
      g.arc(X(U(za)), Y(WR), (AR + 0.03) * ppm, Math.PI, 0);
      g.stroke();
      g.fillStyle = "#1c1c1c";
      g.fillRect(X(U(za) - AR - 0.065), Y(WR), 0.07 * ppm, (WR - Y0 + 0.1) * ppm);
      g.fillRect(X(U(za) + AR - 0.005), Y(WR), 0.07 * ppm, (WR - Y0 + 0.1) * ppm);
    }
    // amber side reflectors
    for (const z of [4.6, 1.2, -1.2, -5.0]) {
      g.fillStyle = "#d9901f";
      g.fillRect(X(U(z)) - 0.05 * ppm, Y(0.7), 0.1 * ppm, 0.05 * ppm);
    }
    if (side === "R") {
      // driver's door outline and handle, fuel filler
      g.strokeStyle = "rgba(40,6,4,0.7)";
      g.lineWidth = Math.max(1, 0.012 * ppm);
      g.strokeRect(X(U(4.3)), Y(YW1 + 0.04), X(0.98), (YW1 + 0.04 - 0.62) * ppm);
      g.fillStyle = ALU;
      g.fillRect(X(U(4.42)), Y(1.32), 0.12 * ppm, 0.03 * ppm);
      g.fillStyle = "#3b3b3b";
      g.beginPath();
      g.arc(X(U(-0.9)), Y(0.78), 0.07 * ppm, 0, Math.PI * 2);
      g.fill();
    } else {
      // door surround
      g.strokeStyle = "#1c1c1c";
      g.lineWidth = Math.max(1, 0.03 * ppm);
      g.strokeRect(X(U(DOOR[1])) - 0.015 * ppm, Y(YW1 + 0.015), X(DOOR[1] - DOOR[0]) + 0.03 * ppm, (YW1 - Y0 + 0.1) * ppm);
    }
    // road dust: laterite-red at the foot, fading upward
    const grad = g.createLinearGradient(0, Y(Y0), 0, Y(1.1));
    grad.addColorStop(0, "rgba(128,82,52,0.55)");
    grad.addColorStop(1, "rgba(128,82,52,0)");
    g.fillStyle = grad;
    g.fillRect(X(u0), Y(1.1), X(11), (1.1 - Y0 + 0.1) * ppm);
  }
  return c;
}

/** Front face: windscreen surround, grille, lamp bezels, cream band. */
function paintFront(ppm: number): HTMLCanvasElement {
  const H = YT - Y0;
  const [c, g] = makeCanvas(W * ppm, H * ppm);
  const X = (x: number) => (x + HW) * ppm;
  const Y = (y: number) => (YT - y) * ppm;
  g.fillStyle = RED;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = RED_DARK;
  g.fillRect(0, Y(YK), c.width, (YK - Y0 + 0.1) * ppm);
  g.fillStyle = CREAM;
  g.fillRect(0, Y(YB1), c.width, (YB1 - YB0) * ppm);
  g.fillStyle = ALU;
  g.fillRect(0, Y(YRUB + 0.02), c.width, 0.045 * ppm);
  // windscreen rubber surround and destination-board surround
  g.fillStyle = "#151515";
  g.fillRect(X(-1.15), Y(2.62), 2.3 * ppm, (2.62 - 1.55) * ppm);
  g.fillRect(X(-0.86), Y(2.92), 1.72 * ppm, 0.3 * ppm);
  // grille with chrome slats
  g.fillStyle = "#1b1b1b";
  g.fillRect(X(-0.56), Y(1.14), 1.12 * ppm, 0.52 * ppm);
  g.fillStyle = "#8e9295";
  for (let y = 0.67; y < 1.12; y += 0.065) g.fillRect(X(-0.52), Y(y), 1.04 * ppm, Math.max(1, 0.018 * ppm));
  // lamp bezels
  g.fillStyle = "#1b1b1b";
  g.fillRect(X(0.62), Y(1.02), 0.6 * ppm, 0.32 * ppm);
  g.fillRect(X(-1.22), Y(1.02), 0.6 * ppm, 0.32 * ppm);
  const grad = g.createLinearGradient(0, Y(Y0), 0, Y(1.0));
  grad.addColorStop(0, "rgba(128,82,52,0.5)");
  grad.addColorStop(1, "rgba(128,82,52,0)");
  g.fillStyle = grad;
  g.fillRect(0, Y(1.0), c.width, (1.0 - Y0) * ppm);
  return c;
}

/** Rear face: rear window surround, lamp housings, cream band. */
function paintRear(ppm: number): HTMLCanvasElement {
  const H = YT - Y0;
  const [c, g] = makeCanvas(W * ppm, H * ppm);
  const X = (x: number) => (x + HW) * ppm; // x measured from the viewer's left
  const Y = (y: number) => (YT - y) * ppm;
  g.fillStyle = RED;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = RED_DARK;
  g.fillRect(0, Y(YK), c.width, (YK - Y0 + 0.1) * ppm);
  g.fillStyle = CREAM;
  g.fillRect(0, Y(YB1), c.width, (YB1 - YB0) * ppm);
  g.fillStyle = ALU;
  g.fillRect(0, Y(YRUB + 0.02), c.width, 0.045 * ppm);
  g.fillStyle = "#151515";
  g.fillRect(X(-0.96), Y(2.6), 1.92 * ppm, (2.6 - 1.86) * ppm);
  g.fillRect(X(-1.22), Y(1.18), 0.3 * ppm, 0.58 * ppm);
  g.fillRect(X(0.92), Y(1.18), 0.3 * ppm, 0.58 * ppm);
  // a blank, cream panel where the depot paints its numbers
  g.fillStyle = "rgba(239,226,196,0.9)";
  g.fillRect(X(-0.3), Y(1.24), 0.6 * ppm, 0.16 * ppm);
  const grad = g.createLinearGradient(0, Y(Y0), 0, Y(1.3));
  grad.addColorStop(0, "rgba(118,76,48,0.65)");
  grad.addColorStop(1, "rgba(118,76,48,0)");
  g.fillStyle = grad;
  g.fillRect(0, Y(1.3), c.width, (1.3 - Y0) * ppm);
  return c;
}

function paintRoof(ppm: number, rand: Rand): HTMLCanvasElement {
  // u = arc length across the roof (3 m), v = along the bus (1 m repeat)
  const [c, g] = makeCanvas(3 * ppm, 1 * ppm);
  g.fillStyle = "#a6a9a7";
  g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(${rand() < 0.5 ? "70,66,58" : "220,222,220"},0.05)`;
    g.fillRect(rand() * c.width, rand() * c.height, 4 + rand() * 12, 2 + rand() * 6);
  }
  g.fillStyle = "rgba(60,60,58,0.35)";
  g.fillRect(0, 0, c.width, Math.max(1, 0.015 * ppm));
  // dirt collects along the curved edges
  const grad = g.createLinearGradient(0, 0, c.width, 0);
  grad.addColorStop(0, "rgba(90,72,56,0.35)");
  grad.addColorStop(0.12, "rgba(90,72,56,0)");
  grad.addColorStop(0.88, "rgba(90,72,56,0)");
  grad.addColorStop(1, "rgba(90,72,56,0.35)");
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Glass: sky reflection at the top fading to the dark cabin (v = height in metres / 4). */
function paintGlass(): HTMLCanvasElement {
  const [c, g] = makeCanvas(4, 128);
  const Y = (y: number) => ((4 - y) / 4) * 128;
  const grad = g.createLinearGradient(0, Y(2.65), 0, Y(1.55));
  grad.addColorStop(0, "#73848c");
  grad.addColorStop(0.3, "#3a464c");
  grad.addColorStop(1, "#171c1e");
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 128);
  return c;
}

/** Interior light seen through the glass: brighter under the roof lamps. */
function paintCabinGlow(): HTMLCanvasElement {
  const [c, g] = makeCanvas(4, 128);
  const Y = (y: number) => ((4 - y) / 4) * 128;
  const grad = g.createLinearGradient(0, Y(2.65), 0, Y(1.55));
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(1, "#5a5a5a");
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 128);
  return c;
}

function paintHub(): HTMLCanvasElement {
  const [c, g] = makeCanvas(64, 64);
  const disc = (r: number, col: string, x = 32, y = 32) => {
    g.fillStyle = col;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };
  g.fillStyle = "#222";
  g.fillRect(0, 0, 64, 64);
  disc(31, "#5d6264");
  disc(28, "#8b9092");
  disc(25, "#80868a");
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    disc(3.4, "#1d1f20", 32 + Math.cos(a) * 17.5, 32 + Math.sin(a) * 17.5);
  }
  disc(11, "#6a7073");
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    disc(1.6, "#c9cdcf", 32 + Math.cos(a) * 7.5, 32 + Math.sin(a) * 7.5);
  }
  disc(3.5, "#3e4244");
  // a red valve stem mark so the spin reads
  g.fillStyle = "#b8352a";
  g.fillRect(30, 6, 4, 4);
  return c;
}

// ---------------------------------------------------------------------------
// the model
// ---------------------------------------------------------------------------

export function buildStBus(ctx: ModelContext): ModelHandle {
  const low = ctx.lowPower;
  const ppm = low ? 20 : 40;
  const rand = makeRand(0x1a1fa21);

  const group = new THREE.Group();
  group.name = "st-bus";
  const body = new THREE.Group();
  body.name = "st-bus-body";
  group.add(body);

  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];

  const tex = (canvas: HTMLCanvasElement, srgb: boolean, ru = 1, rv = 1, wrap = false): THREE.CanvasTexture => {
    const t = new THREE.CanvasTexture(canvas);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ctx.anisotropy;
    if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(ru, rv);
    t.needsUpdate = true;
    textures.push(t);
    return t;
  };
  const std = (p: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial => {
    const m = new THREE.MeshStandardMaterial(p);
    materials.push(m);
    return m;
  };

  const spans = windowSpans();
  // the livery carries fine linework, so it gets a denser canvas
  const liveryMap = tex(paintLivery(ppm * 1.6, rand, spans), true);
  const frontMap = tex(paintFront(ppm * 2), true);
  const rearMap = tex(paintRear(ppm * 2), true);
  const roofMap = tex(paintRoof(ppm, rand), true, 1 / 3, 1, true);
  const glassMap = tex(paintGlass(), true, 1, 1 / 4, true);
  const cabinMap = tex(paintCabinGlow(), true, 1, 1 / 4, true);
  const hubMap = tex(paintHub(), true);

  const glass = std({ map: glassMap, roughness: 0.15, metalness: 0.2, emissive: "#ffd7a0", emissiveMap: cabinMap, emissiveIntensity: 0 });
  const head = std({ color: "#e9e7e0", roughness: 0.18, metalness: 0.4, emissive: "#fff1d6", emissiveIntensity: 0 });
  const tail = std({ color: "#8f1c14", roughness: 0.3, emissive: "#ff0c04", emissiveIntensity: 0 });
  const board = std({ color: "#f1e6c6", roughness: 0.55, emissive: "#fff0d0", emissiveIntensity: 0 });
  const rubber = std({ color: "#1d1d1d", roughness: 0.92 });
  const hubMat = std({ map: hubMap, roughness: 0.5, metalness: 0.45 });
  const M: Record<string, THREE.Material> = {
    livery: std({ map: liveryMap, roughness: 0.5 }),
    front: std({ map: frontMap, roughness: 0.5 }),
    rear: std({ map: rearMap, roughness: 0.5 }),
    roof: std({ map: roofMap, roughness: 0.75 }),
    red: std({ color: RED, roughness: 0.5 }),
    black: std({ color: "#1a1a1a", roughness: 0.7 }),
    under: std({ color: "#141414", roughness: 0.9, side: THREE.DoubleSide }),
    metal: std({ color: "#a3a7a9", roughness: 0.4, metalness: 0.6 }),
    amber: std({ color: "#d58a1e", roughness: 0.35 }),
    plate: std({ color: "#ece8dc", roughness: 0.6 }),
    glass,
    head,
    tail,
    board,
  };

  const B = new Batch();

  // ---- side panels: silhouette with wheel arches, window holes, door notch ----
  for (const left of [true, false]) {
    const sOf = (z: number) => (left ? -z : z);
    const shape = new THREE.Shape();
    type Feat = { s0: number; s1: number; arch: boolean };
    const feats: Feat[] = [FA, RA].map((z) => ({ s0: sOf(z) - AR, s1: sOf(z) + AR, arch: true }));
    if (left) feats.push({ s0: Math.min(sOf(DOOR[0]), sOf(DOOR[1])), s1: Math.max(sOf(DOOR[0]), sOf(DOOR[1])), arch: false });
    feats.sort((a, b) => a.s0 - b.s0);
    shape.moveTo(-ZF, Y0);
    for (const f of feats) {
      shape.lineTo(f.s0, Y0);
      if (f.arch) {
        shape.lineTo(f.s0, WR);
        shape.absarc((f.s0 + f.s1) / 2, WR, AR, Math.PI, 0, true);
        shape.lineTo(f.s1, Y0);
      } else {
        shape.lineTo(f.s0, YW1);
        shape.lineTo(f.s1, YW1);
        shape.lineTo(f.s1, Y0);
      }
    }
    shape.lineTo(ZF, Y0);
    shape.lineTo(ZF, YS);
    shape.lineTo(-ZF, YS);
    for (const [z0, z1] of left ? spans.left : spans.right) {
      const a = Math.min(sOf(z0), sOf(z1)), b = Math.max(sOf(z0), sOf(z1));
      const h = new THREE.Path();
      h.moveTo(a, YW0);
      h.lineTo(a, YW1);
      h.lineTo(b, YW1);
      h.lineTo(b, YW0);
      shape.holes.push(h);
    }
    const g = new THREE.ShapeGeometry(shape, low ? 6 : 10);
    const m = new THREE.Matrix4().makeRotationY(left ? Math.PI / 2 : -Math.PI / 2).setPosition(left ? HW : -HW, 0, 0);
    const added = B.add("livery", g, m, "keep");
    mapUV(added, (_x, y, z) => [(left ? 16.5 - z : z + 5.5) / LIVERY_W, y / LIVERY_H]);
  }

  // ---- front and rear faces ----
  const faceShape = () => {
    const s = new THREE.Shape();
    s.moveTo(-HW, Y0);
    s.lineTo(HW, Y0);
    s.lineTo(HW, YS);
    s.absarc(HW - RR, YS, RR, 0, Math.PI / 2, false);
    s.lineTo(-HW + RR, YT);
    s.absarc(-HW + RR, YS, RR, Math.PI / 2, Math.PI, false);
    return s;
  };
  {
    const g = new THREE.ShapeGeometry(faceShape(), 6);
    g.translate(0, 0, ZF);
    const added = B.add("front", g, null, "keep");
    mapUV(added, (x, y) => [(x + HW) / W, (y - Y0) / (YT - Y0)]);
  }
  {
    const g = new THREE.ShapeGeometry(faceShape(), 6);
    const added = B.add("rear", g, new THREE.Matrix4().makeRotationY(Math.PI).setPosition(0, 0, ZR), "keep");
    mapUV(added, (x, y) => [(HW - x) / W, (y - Y0) / (YT - Y0)]);
  }

  // ---- roof: rounded-edge sweep ----
  {
    const prof: [number, number][] = [];
    const segs = low ? 3 : 5;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * (Math.PI / 2);
      prof.push([HW - RR + Math.cos(a) * RR, YS + Math.sin(a) * RR]);
    }
    for (let i = 0; i <= segs; i++) {
      const a = Math.PI / 2 + (i / segs) * (Math.PI / 2);
      prof.push([-HW + RR + Math.cos(a) * RR, YS + Math.sin(a) * RR]);
    }
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    let arc = 0;
    for (let i = 0; i < prof.length; i++) {
      if (i > 0) arc += Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]);
      pos.push(prof[i][0], prof[i][1], ZR, prof[i][0], prof[i][1], ZF);
      uv.push(arc, ZR, arc, ZF);
      if (i > 0) {
        const a = (i - 1) * 2, b = i * 2, c2 = i * 2 + 1, d = (i - 1) * 2 + 1;
        idx.push(a, b, c2, a, c2, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    B.add("roof", g, null, "keep");
  }

  // ---- glass: inset window band, windscreen, rear window ----
  {
    const gh = YW1 - YW0 + 0.04, gy = (YW0 + YW1) / 2;
    const pane = (left: boolean, z0: number, z1: number) => {
      const p = new THREE.PlaneGeometry(z1 - z0, gh);
      p.rotateY(left ? Math.PI / 2 : -Math.PI / 2);
      p.translate(left ? HW - 0.04 : -HW + 0.04, gy, (z0 + z1) / 2);
      B.add("glass", p);
    };
    pane(false, ZR + 0.08, ZF - 0.1);
    pane(true, ZR + 0.08, DOOR[0] - 0.02);
    pane(true, DOOR[1] + 0.02, ZF - 0.1);
  }
  B.add("metal", boxMM(-HW + 0.025, 2.16, ZR + 0.1, -HW + 0.045, 2.2, ZF - 0.12));
  B.add("metal", boxMM(HW - 0.045, 2.16, ZR + 0.1, HW - 0.025, 2.2, ZF - 0.12));
  {
    const ws = new THREE.PlaneGeometry(2.2, 1.0);
    ws.translate(0, 2.08, ZF + 0.012);
    B.add("glass", ws);
    B.add("black", boxMM(-0.035, 1.58, ZF, 0.035, 2.6, ZF + 0.03));
    // wipers parked along the bottom of the screen
    for (const sx of [-1, 1]) {
      const wg = new THREE.BoxGeometry(0.78, 0.022, 0.02);
      wg.rotateZ(sx * 0.12);
      wg.translate(sx * 0.52, 1.7, ZF + 0.035);
      B.add("black", wg);
    }
    const rw = new THREE.PlaneGeometry(1.84, 0.68);
    rw.rotateY(Math.PI);
    rw.translate(0, 2.23, ZR - 0.012);
    B.add("glass", rw);
  }

  // ---- destination board (left blank on purpose) ----
  B.add("board", boxMM(-0.8, 2.65, ZF - 0.02, 0.8, 2.89, ZF + 0.035));

  // ---- lamps, bumpers, plate, mirrors ----
  const lampSeg = low ? 10 : 14;
  for (const x of [-1.02, -0.79, 0.79, 1.02]) {
    const hg = new THREE.CylinderGeometry(0.088, 0.088, 0.05, lampSeg);
    hg.rotateX(Math.PI / 2);
    hg.translate(x, 0.87, ZF + 0.025);
    B.add("head", hg);
  }
  for (const sx of [-1, 1]) {
    B.add("amber", boxMM(sx * 1.12 - 0.04, 0.8, ZF, sx * 1.12 + 0.04, 0.93, ZF + 0.04));
    B.add("tail", boxMM(sx * 1.07 - 0.1, 0.84, ZR - 0.035, sx * 1.07 + 0.1, 1.08, ZR));
    B.add("amber", boxMM(sx * 1.07 - 0.1, 0.7, ZR - 0.035, sx * 1.07 + 0.1, 0.82, ZR));
  }
  B.add("black", boxMM(-HW - 0.03, 0.32, ZF - 0.05, HW + 0.03, 0.6, ZF + 0.16));
  B.add("black", boxMM(-HW - 0.03, 0.32, ZR - 0.15, HW + 0.03, 0.58, ZR + 0.05));
  B.add("plate", boxMM(-0.26, 0.38, ZF + 0.16, 0.26, 0.54, ZF + 0.175));
  B.add("plate", boxMM(-0.26, 0.62, ZR - 0.05, 0.26, 0.78, ZR - 0.035));
  for (const sx of [-1, 1]) {
    const x0 = sx * (HW - 0.06), x1 = sx * (HW + 0.2);
    B.add("black", rodGeo([x0, 2.62, ZF - 0.1], [x1, 2.66, ZF + 0.42], 0.018, 5));
    B.add("black", rodGeo([x1, 2.66, ZF + 0.42], [x1, 2.18, ZF + 0.42], 0.018, 5));
    B.add("black", boxMM(x1 - 0.04, 1.82, ZF + 0.33, x1 + 0.04, 2.2, ZF + 0.52));
  }

  // ---- roof luggage rail ----
  {
    const z0 = -5.1, z1 = 0.7, rx = HW - 0.27, t = 0.035;
    for (const sx of [-1, 1]) B.add("metal", boxMM(sx * rx - t / 2, YRAIL - t, z0, sx * rx + t / 2, YRAIL, z1));
    for (const z of [z0, -3.17, -1.23, z1]) B.add("metal", boxMM(-rx, YRAIL - t, z - t / 2, rx, YRAIL, z + t / 2));
    for (const sx of [-1, 1]) {
      for (const z of [z0, -3.17, -1.23, z1]) B.add("metal", boxMM(sx * rx - 0.02, YT - 0.02, z - 0.02, sx * rx + 0.02, YRAIL - t, z + 0.02));
    }
    for (let i = 1; i < 6; i++) {
      const x = -rx + (i * 2 * rx) / 6;
      B.add("metal", boxMM(x - 0.015, YT + 0.005, z0, x + 0.015, YT + 0.03, z1));
    }
  }

  // ---- rear ladder up to the roof carrier (left side) ----
  {
    const zl = ZR - 0.07;
    for (const x of [0.6, 0.92]) B.add("metal", boxMM(x - 0.015, 0.75, zl - 0.015, x + 0.015, YRAIL - 0.02, zl + 0.015));
    for (let y = 0.95; y < YRAIL - 0.1; y += 0.3) B.add("metal", boxMM(0.6, y - 0.012, zl - 0.012, 0.92, y + 0.012, zl + 0.012));
  }

  // ---- passenger door (folding, rear left), step and jambs ----
  {
    const xd = HW - 0.07, zm = (DOOR[0] + DOOR[1]) / 2, dw = DOOR[1] - DOOR[0];
    const lower = new THREE.PlaneGeometry(dw - 0.04, 1.08);
    lower.rotateY(Math.PI / 2);
    lower.translate(xd, 0.5 + 0.54, zm);
    B.add("red", lower);
    const upper = new THREE.PlaneGeometry(dw - 0.04, 0.92);
    upper.rotateY(Math.PI / 2);
    upper.translate(xd, 1.58 + 0.46, zm);
    B.add("glass", upper);
    B.add("black", boxMM(xd - 0.01, 0.5, zm - 0.015, xd + 0.01, YW1, zm + 0.015));
    B.add("black", boxMM(xd - 0.01, 1.56, DOOR[0], xd + 0.01, 1.6, DOOR[1]));
    B.add("black", boxMM(HW - 0.08, Y0, DOOR[0] - 0.02, HW, YW1, DOOR[0] + 0.01));
    B.add("black", boxMM(HW - 0.08, Y0, DOOR[1] - 0.01, HW, YW1, DOOR[1] + 0.02));
    B.add("black", boxMM(HW - 0.08, YW1 - 0.03, DOOR[0], HW, YW1, DOOR[1]));
    B.add("under", boxMM(HW - 0.42, 0.3, DOOR[0], HW - 0.06, 0.5, DOOR[1]));
  }

  // ---- underbody: wheel wells, chassis, axles, mud flaps ----
  {
    for (const za of [FA, RA]) {
      const well = new THREE.CylinderGeometry(AR - 0.01, AR - 0.01, W - 0.03, low ? 8 : 12, 1, true, 0, Math.PI);
      well.rotateZ(Math.PI / 2);
      well.translate(0, WR, za);
      B.add("under", well);
      B.add("under", rodGeo([-1.0, WR, za], [1.0, WR, za], 0.06, 6));
    }
    B.add("under", boxMM(-HW, Y0 - 0.02, FA + AR, HW, Y0 + 0.02, ZF));
    B.add("under", boxMM(-HW, Y0 - 0.02, RA + AR, HW, Y0 + 0.02, FA - AR));
    B.add("under", boxMM(-HW, Y0 - 0.02, ZR, HW, Y0 + 0.02, RA - AR));
    for (const sx of [-1, 1]) B.add("under", boxMM(sx * 0.45 - 0.07, 0.26, -4.7, sx * 0.45 + 0.07, Y0, 4.9));
    B.add("under", boxMM(-0.2, 0.3, RA - 0.18, 0.2, 0.62, RA + 0.18));
    for (const sx of [-1, 1]) {
      B.add("black", boxMM(sx * 0.62, 0.14, RA - AR - 0.06, sx * 1.2, Y0 + 0.02, RA - AR - 0.04));
      B.add("black", boxMM(sx * 0.86, 0.16, FA - AR - 0.06, sx * 1.2, Y0 + 0.02, FA - AR - 0.04));
    }
  }

  B.build(
    body,
    M,
    (key) => {
      if (key === "head" || key === "tail" || key === "amber" || key === "plate" || key === "board") return [false, true];
      return [true, true];
    },
    geometries,
  );

  // ---- wheels: lathe-turned tyre + textured steel hub, one mesh each ----
  const wheelGeo = (() => {
    const segs = low ? 12 : 16;
    const prof = [
      [0.305, -0.125], [0.4, -0.142], [0.468, -0.132], [0.5, -0.095], [0.5, 0.095], [0.468, 0.132], [0.4, 0.142], [0.305, 0.125],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const tyre = new THREE.LatheGeometry(prof, segs).toNonIndexed();
    tyre.rotateZ(Math.PI / 2);
    const hub = new THREE.CylinderGeometry(0.31, 0.31, 0.2, segs, 1, false).toNonIndexed();
    hub.rotateZ(Math.PI / 2);
    const nT = tyre.getAttribute("position").count, nH = hub.getAttribute("position").count;
    const pos = new Float32Array((nT + nH) * 3), nor = new Float32Array((nT + nH) * 3), uv = new Float32Array((nT + nH) * 2);
    pos.set(tyre.getAttribute("position").array as Float32Array, 0);
    pos.set(hub.getAttribute("position").array as Float32Array, nT * 3);
    nor.set(tyre.getAttribute("normal").array as Float32Array, 0);
    nor.set(hub.getAttribute("normal").array as Float32Array, nT * 3);
    uv.set(tyre.getAttribute("uv").array as Float32Array, 0);
    uv.set(hub.getAttribute("uv").array as Float32Array, nT * 2);
    tyre.dispose();
    hub.dispose();
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.addGroup(0, nT, 0);
    g.addGroup(nT, nH, 1);
    g.computeBoundingSphere();
    return g;
  })();
  geometries.push(wheelGeo);
  const wheels: THREE.Mesh[] = [];
  const wheelPos: [number, number][] = [[1.03, FA], [-1.03, FA], [1.06, RA], [0.77, RA], [-1.06, RA], [-0.77, RA]];
  for (const [x, z] of wheelPos) {
    const m = new THREE.Mesh(wheelGeo, [rubber, hubMat]);
    m.name = "st-bus-wheel";
    m.position.set(x, WR, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    wheels.push(m);
  }
  group.userData.wheels = wheels;

  // body sway follows the wheel spin the engine applies
  let lastSpin = 0, sway = 0;
  return {
    group,
    setNight(n: number) {
      const k = Math.min(1, Math.max(0, n));
      head.emissiveIntensity = 3.2 * k;
      tail.emissiveIntensity = 0.9 * k;
      glass.emissiveIntensity = 0.2 * k;
      board.emissiveIntensity = 0.35 * k;
    },
    update(t: number, dt: number) {
      const r = wheels[0].rotation.x;
      const d = r - lastSpin;
      lastSpin = r;
      const spin = Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
      const speed = dt > 0 ? (spin * WR) / dt : 0; // m/s
      const target = Math.min(1, speed / 12);
      sway += (target - sway) * Math.min(1, dt * 2.5);
      body.position.y = 0.003 * Math.sin(t * 29) * (0.4 + sway) + 0.012 * sway * Math.sin(t * 2.1);
      body.rotation.z = 0.007 * sway * Math.sin(t * 1.3);
      body.rotation.x = 0.003 * sway * Math.sin(t * 1.9 + 0.7);
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
      group.clear();
    },
  };
}
