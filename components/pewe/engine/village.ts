import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Ground, type MapData, type XY, distToPolyline, pointInPolygon, resample, polylineLength, WATER_Y } from "./data";
import { mulberry32, valueNoise } from "./noise";
import { type SharedUniforms, withGrow, growDepthMaterial, INK_HEX } from "./uniforms";

/**
 * Everything ordinary in Pewe, drawn the same for everyone: roads, houses,
 * trees, palms, mangroves, poles and lamps, the yellow-and-white posts, the
 * hill tanks and the pipes. Landmarks live in landmarks.ts.
 */

const lin = (h: string) => new THREE.Color(h);

export interface VillageOptions {
  lowPower: boolean;
  month: number;
}

/* ------------------------------------------------------------------ roads */

interface Ribbon {
  pos: number[];
  nor: number[];
  t: number[];
  idx: number[];
}

function ribbon(ground: Ground, line: XY[], width: number, lift: number, out: Ribbon) {
  const pts = resample(line, 3);
  const L = polylineLength(pts) || 1;
  const base = out.pos.length / 3;
  let run = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    const a = pts[Math.max(i - 1, 0)];
    const b = pts[Math.min(i + 1, pts.length - 1)];
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const nx = -ty;
    const ny = tx;
    if (i > 0) run += Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]);
    const hc = ground.height(x, y);
    for (const s of [-1, 1]) {
      const sx = x + nx * (width / 2) * s;
      const sy = y + ny * (width / 2) * s;
      let h = Math.max(ground.height(sx, sy), hc) + lift;
      // over the creek the road rides the bridge deck
      if (ground.water(sx, sy) > 0.26 || ground.water(x, y) > 0.26) h = Math.max(h, WATER_Y + 4.7);
      out.pos.push(sx, h, -sy);
      out.nor.push(0, 1, 0);
      out.t.push(run / L);
    }
    if (i > 0) {
      const k = base + i * 2;
      out.idx.push(k - 2, k, k - 1, k - 1, k, k + 1);
    }
  }
}

function ribbonGeometry(r: Ribbon) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(r.pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(r.nor, 3));
  g.setAttribute("aT", new THREE.Float32BufferAttribute(r.t, 1));
  g.setIndex(r.idx);
  return g;
}

/** Roads rise with the land and turn to ink during the survey. */
function roadMaterial(color: string, U: SharedUniforms) {
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.96,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -6,
  });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uRise = U.uRise;
    shader.uniforms.uSurvey = U.uSurvey;
    shader.uniforms.uInk = U.uInk;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uRise;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.y = transformed.y * uRise + 0.4 * (1.0 - uRise);");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uSurvey;\nuniform vec3 uInk;")
      .replace("#include <fog_fragment>", "#include <fog_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, uInk, uSurvey * 0.85);");
  };
  m.customProgramCacheKey = () => "pewe-road";
  return m;
}

/** The roads drawing themselves, for the "Roads" stop. */
function drawMaterial(U: SharedUniforms) {
  const uniforms = { uDraw: { value: 0 }, uRise: U.uRise };
  const m = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -10,
    vertexShader: /* glsl */ `
      attribute float aT;
      varying float vT;
      uniform float uRise;
      void main() {
        vT = aT;
        vec3 p = position;
        p.y = p.y * uRise + 0.25 * (1.0 - uRise);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uDraw;
      varying float vT;
      void main() {
        if (vT > uDraw) discard;
        float head = smoothstep(uDraw - 0.035, uDraw, vT);
        vec3 col = mix(vec3(0.97, 0.94, 0.86), vec3(0.93, 0.55, 0.36), head);
        gl_FragColor = vec4(col, 0.92);
      }`,
  });
  return { material: m, uniforms };
}

/* ----------------------------------------------------------------- houses */

function hipRoof(overhang: number, ridge: number, height: number) {
  const o = 0.5 + overhang;
  const r = ridge / 2;
  const v = [
    // front (+z) trapezoid
    -o, 0, o, o, 0, o, r, height, 0, -o, 0, o, r, height, 0, -r, height, 0,
    // back (-z)
    o, 0, -o, -o, 0, -o, -r, height, 0, o, 0, -o, -r, height, 0, r, height, 0,
    // right end (+x)
    o, 0, o, o, 0, -o, r, height, 0,
    // left end (-x)
    -o, 0, -o, -o, 0, o, -r, height, 0,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

function houseGeometry(wallH: number) {
  const walls = new THREE.BoxGeometry(1, wallH, 1).toNonIndexed();
  walls.translate(0, wallH / 2, 0);
  walls.deleteAttribute("uv");
  const roof = hipRoof(0.09, 0.34, 2.4);
  roof.translate(0, wallH, 0);
  const tag = (g: THREE.BufferGeometry, part: number) => {
    const n = g.attributes.position.count;
    g.setAttribute("aPart", new THREE.Float32BufferAttribute(new Array(n).fill(part), 1));
    return g;
  };
  const merged = mergeGeometries([tag(walls, 0), tag(roof, 1)]);
  walls.dispose();
  roof.dispose();
  return merged!;
}

function houseMaterial(U: SharedUniforms, storeys: number) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
  withGrow(m, U, (shader) => {
    shader.uniforms.uNight = U.uNight;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute float aPart; attribute vec3 aWall; attribute vec3 aRoof; attribute float aLit;
        varying float vPart; varying vec3 vBase; varying float vLit; varying vec3 vLocal; varying vec3 vLocalN;`,
      )
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>
        vLocalN = objectNormal;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vPart = aPart; vBase = mix(aWall, aRoof, aPart); vLit = aLit; vLocal = position;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uNight;
        varying float vPart; varying vec3 vBase; varying float vLit; varying vec3 vLocal; varying vec3 vLocalN;
        float pwWindow() {
          if (vPart > 0.5 || abs(vLocalN.y) > 0.5) return 0.0;
          float u = abs(vLocalN.x) > 0.5 ? vLocal.z : vLocal.x;
          float slots = abs(vLocalN.x) > 0.5 ? 2.0 : 3.0;
          float cu = (floor((u + 0.5) * slots) + 0.5) / slots - 0.5;
          float inU = step(abs(u - cu), 0.075);
          float y = vLocal.y;
          float inV = step(1.05, y) * step(y, 2.25) + step(${storeys > 1 ? "4.0" : "99.0"}, y) * step(y, 5.2);
          return inU * min(inV, 1.0);
        }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float pwWin = pwWindow();
        diffuseColor.rgb = mix(vBase, vec3(0.05, 0.06, 0.06), pwWin * 0.85);
        if (vPart < 0.5) diffuseColor.rgb *= 0.82 + 0.18 * smoothstep(0.0, 0.7, vLocal.y);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.68, 0.36) * pwWin * vLit * uNight * 2.4;`,
      );
  });
  m.customProgramCacheKey = () => "pewe-house-" + storeys;
  return m;
}

/* ------------------------------------------------------------------ palms */

function frondGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const n = 11;
  for (let f = 0; f < n; f++) {
    const seg = 7;
    const len = 3.6 + (f % 3) * 0.35;
    const pos: number[] = [];
    const idx: number[] = [];
    const pitch = 0.55 - (f % 4) * 0.12;
    for (let s = 0; s <= seg; s++) {
      const t = s / seg;
      const x = t * len;
      const y = pitch * x - 0.42 * x * x * 0.42;
      const w = 0.62 * Math.sin(Math.PI * Math.min(t * 1.15, 1)) + 0.04;
      pos.push(x, y, -w, x, y - 0.06, w);
      if (s > 0) {
        const k = s * 2;
        idx.push(k - 2, k - 1, k, k - 1, k + 1, k);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.rotateY((f / n) * Math.PI * 2 + (f % 2) * 0.2);
    parts.push(g.toNonIndexed());
    g.dispose();
  }
  const merged = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  merged.computeVertexNormals();
  return merged;
}

/** A canopy that reads as foliage, not a ball: an icosphere pushed in and out. */
function canopyGeometry(detail: number, seed: number) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n =
      Math.sin(v.x * 3.1 + seed) * Math.cos(v.z * 2.7 - seed * 0.5) * 0.16 +
      Math.sin(v.y * 4.3 + v.x * 1.7 + seed * 2.0) * 0.1;
    v.multiplyScalar(1 + n);
    v.y *= v.y < 0 ? 0.62 : 1.0;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ build */

export interface VillageHandle {
  group: THREE.Group;
  /** 0..1 roads drawing in, for the Roads stop */
  setRoadDraw(p: number): void;
  /** 0..1 visibility of water pulses in the pipes */
  setFlow(f: number): void;
  setNight(n: number): void;
  update(t: number): void;
  /** obstacles other modules should avoid (x, y, radius) */
  dispose(): void;
}

export function buildVillage(ground: Ground, data: MapData, U: SharedUniforms, opts: VillageOptions): VillageHandle {
  const v = data.village;
  const group = new THREE.Group();
  group.name = "village";
  const rand = mulberry32(20151);
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => {
    disposables.push(x);
    return x;
  };
  const P = v.places;
  const late: THREE.Object3D[] = [];
  const monsoon = opts.month >= 6 && opts.month <= 9;

  /* roads ------------------------------------------------------------- */
  const mainR: Ribbon = { pos: [], nor: [], t: [], idx: [] };
  const laneR: Ribbon = { pos: [], nor: [], t: [], idx: [] };
  const drawR: Ribbon = { pos: [], nor: [], t: [], idx: [] };
  for (const [name, line] of Object.entries(v.roads)) {
    const main = name === "main" || name === "west" || name === "east";
    ribbon(ground, line, main ? 5.6 : 3.8, 0.35, main ? mainR : laneR);
    ribbon(ground, line, main ? 2.6 : 1.8, 0.55, drawR);
  }
  const roadMats = [keep(roadMaterial("#8a8378", U)), keep(roadMaterial("#a8785a", U))];
  [mainR, laneR].forEach((r, i) => {
    const g = keep(ribbonGeometry(r));
    const m = new THREE.Mesh(g, roadMats[i]);
    m.receiveShadow = true;
    m.name = i === 0 ? "roads-main" : "roads-lanes";
    group.add(m);
  });
  const draw = drawMaterial(U);
  keep(draw.material);
  const drawMesh = new THREE.Mesh(keep(ribbonGeometry(drawR)), draw.material);
  drawMesh.visible = false;
  drawMesh.renderOrder = 3;
  group.add(drawMesh);

  const allRoads = Object.values(v.roads);
  const roadDist = (x: number, y: number) => {
    let d = Infinity;
    for (const line of allRoads) d = Math.min(d, distToPolyline(x, y, line));
    return d;
  };

  /* reserved ground ----------------------------------------------------- */
  const reserved: [number, number, number][] = [
    [P.building[0], P.building[1], 27],
    [P.haveli[0], P.haveli[1], 30],
    [P.school[0], P.school[1], 20],
    [P.busstop[0], P.busstop[1], 7],
    [P.tanks[0], P.tanks[1], 16],
    [v.bridge.x, v.bridge.y, 34],
  ];
  const isReserved = (x: number, y: number, pad = 0) => reserved.some(([rx, ry, r]) => Math.hypot(x - rx, y - ry) < r + pad);

  /* houses ------------------------------------------------------------- */
  const houses = v.houses.filter(([x, y]) => !isReserved(x, y, 4));
  const wallPal = ["#efece4", "#efece4", "#e8dcc4", "#e9cfc4", "#dfe5d6", "#e6dcb4", "#d6dde2", "#c98f6a", "#efece4", "#e8dcc4"];
  const roofPal = ["#a8452c", "#b4523a", "#9b3f29", "#b85d3e", "#a8452c", "#b4523a"];
  const byStorey: { list: [number, number, number][]; mesh?: THREE.InstancedMesh }[] = [{ list: [] }, { list: [] }];
  for (const h of houses) byStorey[rand() < 0.24 ? 1 : 0].list.push(h);
  const dummy = new THREE.Object3D();
  byStorey.forEach((bucket, si) => {
    const n = bucket.list.length;
    if (!n) return;
    const geo = keep(houseGeometry(si ? 6.2 : 3.4));
    const aWall = new Float32Array(n * 3);
    const aRoof = new Float32Array(n * 3);
    const aLit = new Float32Array(n);
    const mat = keep(houseMaterial(U, si + 1));
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    bucket.list.forEach(([x, y, ang], i) => {
      const w = 7.5 + rand() * 4.5;
      const d = 6 + rand() * 2.6;
      dummy.position.set(x, ground.height(x, y) - 0.4, -y);
      dummy.rotation.set(0, (ang * Math.PI) / 180, 0);
      dummy.scale.set(w, 1, d);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      const wc = lin(wallPal[Math.floor(rand() * wallPal.length)]);
      let rc = lin(roofPal[Math.floor(rand() * roofPal.length)]);
      const r = rand();
      if (r < 0.13) rc = lin("#7c8386");
      else if (r < 0.17) rc = lin("#4d4f4e");
      else if (monsoon && r < 0.24) rc = lin("#2f62a8");
      aWall.set([wc.r, wc.g, wc.b], i * 3);
      aRoof.set([rc.r, rc.g, rc.b], i * 3);
      aLit[i] = rand() < 0.72 ? 0.55 + rand() * 0.45 : 0;
    });
    geo.setAttribute("aWall", new THREE.InstancedBufferAttribute(aWall, 3));
    geo.setAttribute("aRoof", new THREE.InstancedBufferAttribute(aRoof, 3));
    geo.setAttribute("aLit", new THREE.InstancedBufferAttribute(aLit, 1));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.customDepthMaterial = keep(growDepthMaterial(U));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = `houses-${si + 1}`;
    mesh.frustumCulled = false;
    group.add(mesh);
    bucket.mesh = mesh;
  });
  const houseNear = (x: number, y: number, r: number) => houses.some(([hx, hy]) => Math.abs(hx - x) < r && Math.abs(hy - y) < r && Math.hypot(hx - x, hy - y) < r);

  /* trees -------------------------------------------------------------- */
  const treeMat = keep(
    withGrow(new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9, metalness: 0 }), U, (shader) => {
      shader.uniforms.uForestTint = U.uForestTint;
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform vec3 uForestTint;")
        .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb *= uForestTint;");
    }),
  );
  treeMat.customProgramCacheKey = () => "pewe-tree";
  const treeNear: THREE.Matrix4[] = [];
  const treeFar: THREE.Matrix4[] = [];
  const treeNearC: THREE.Color[] = [];
  const treeFarC: THREE.Color[] = [];
  const greens = ["#3d5934", "#47643c", "#516e41", "#385030", "#5b7846", "#66824c", "#72894d", "#4a6338"].map(lin);
  const budget = opts.lowPower ? 7000 : 17000;
  const ix0 = v.inner.x0 + 40;
  const ix1 = v.inner.x0 + (v.inner.nx - 1) * v.inner.step - 40;
  const iy1 = v.inner.y0 - 40;
  const iy0 = v.inner.y0 - (v.inner.ny - 1) * v.inner.step + 40;
  const spacing = opts.lowPower ? 15 : 11;
  for (let y = iy0; y < iy1; y += spacing) {
    for (let x = ix0; x < ix1; x += spacing) {
      const px = x + (rand() - 0.5) * spacing * 0.9;
      const py = y + (rand() - 0.5) * spacing * 0.9;
      const w = ground.water(px, py);
      if (w > 0.16) continue;
      const raw = ground.raw(px, py);
      if (raw < 1.2) continue;
      if (pointInPolygon(px, py, v.paddy)) continue;
      if (isReserved(px, py, 2)) continue;
      const slope = ground.slope(px, py, 10);
      const dCenter = Math.hypot(px, py);
      let p: number;
      const hill = raw > 14 || slope > 9;
      if (hill) p = 0.78;
      else p = 0.16;
      const plateau = raw > 85 && slope < 9;
      if (plateau) p = 0.14;
      p *= 0.55 + 0.7 * valueNoise(px, py, 140, 5);
      if (!hill) {
        if (roadDist(px, py) < 8) continue;
        if (houseNear(px, py, 9)) continue;
        if (houseNear(px, py, 45)) p += 0.22;
      } else if (roadDist(px, py) < 6) continue;
      if (rand() > p) continue;
      const r = (hill ? 2.6 : 3.3) + rand() * (hill ? 2.2 : 3.0);
      const m = new THREE.Matrix4();
      const h = ground.height(px, py);
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2);
      m.compose(new THREE.Vector3(px, h + r * 0.78, -py), q, new THREE.Vector3(r, r * (0.95 + rand() * 0.3), r));
      const c = greens[Math.floor(rand() * greens.length)].clone();
      c.offsetHSL(0, 0, (rand() - 0.5) * 0.04);
      if (dCenter < 950) {
        treeNear.push(m);
        treeNearC.push(c);
      } else {
        treeFar.push(m);
        treeFarC.push(c);
      }
    }
  }
  const thin = (ms: THREE.Matrix4[], cs: THREE.Color[], max: number) => {
    if (ms.length <= max) return;
    const keepEvery = max / ms.length;
    let w = 0;
    for (let i = 0; i < ms.length; i++) if (rand() < keepEvery) { ms[w] = ms[i]; cs[w] = cs[i]; w++; }
    ms.length = w;
    cs.length = w;
  };
  thin(treeNear, treeNearC, Math.floor(budget * 0.55));
  thin(treeFar, treeFarC, Math.floor(budget * 0.45));
  const addTrees = (ms: THREE.Matrix4[], cs: THREE.Color[], detail: number, shadows: boolean, name: string) => {
    if (!ms.length) return;
    const geo = keep(canopyGeometry(detail, detail * 3.7 + 1.3));
    const mesh = new THREE.InstancedMesh(geo, treeMat, ms.length);
    ms.forEach((m, i) => {
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, cs[i]);
    });
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    if (shadows) mesh.customDepthMaterial = keep(growDepthMaterial(U));
    mesh.frustumCulled = false;
    mesh.name = name;
    group.add(mesh);
  };
  addTrees(treeNear, treeNearC, 1, true, "trees-near");
  addTrees(treeFar, treeFarC, 1, false, "trees-far");
  if (treeNear.length) {
    // trunks under the near trees, so they stand on the ground
    const tg = keep(new THREE.CylinderGeometry(0.22, 0.34, 1, 5, 1));
    tg.translate(0, 0.5, 0);
    const tm = keep(withGrow(new THREE.MeshStandardMaterial({ color: "#4d3e30", roughness: 0.95 }), U));
    tm.customProgramCacheKey = () => "pewe-trunk";
    const trunks = new THREE.InstancedMesh(tg, tm, treeNear.length);
    const pos = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    treeNear.forEach((m, i) => {
      m.decompose(pos, q, sc);
      const h = Math.max(pos.y - sc.y * 0.55 - ground.height(pos.x, -pos.z), 0.5) + 0.6;
      trunks.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(pos.x, pos.y - sc.y * 0.55 - h + 0.6, pos.z), q, new THREE.Vector3(sc.x * 0.22, h, sc.z * 0.22)));
    });
    trunks.castShadow = true;
    trunks.customDepthMaterial = keep(growDepthMaterial(U));
    trunks.frustumCulled = false;
    trunks.name = "trunks";
    group.add(trunks);
  }

  /* palms -------------------------------------------------------------- */
  const palmSpots: XY[] = [];
  for (const [hx, hy] of houses) {
    const n = rand() < 0.35 ? 0 : 1 + Math.floor(rand() * 2.2);
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2;
      const r = 7 + rand() * 9;
      palmSpots.push([hx + Math.cos(a) * r, hy + Math.sin(a) * r]);
    }
  }
  // the row in front of the haveli, and along the paddy's road edge
  for (let k = 0; k < 14; k++) palmSpots.push([P.haveli[0] - 16 - rand() * 10, P.haveli[1] - 24 + k * 3.6 + rand() * 2]);
  for (const [x, y] of resample(v.paddy, 14)) if (rand() < 0.55) palmSpots.push([x + (rand() - 0.5) * 6, y + (rand() - 0.5) * 6]);
  const palms = palmSpots.filter(([x, y]) => {
    if (ground.water(x, y) > 0.2) return false;
    if (roadDist(x, y) < 3.5) return false;
    if (isReserved(x, y, -12)) return false;
    return !houseNear(x, y, 5);
  });
  if (palms.length) {
    const trunkGeo = keep(new THREE.CylinderGeometry(0.15, 0.24, 1, 6, 1));
    trunkGeo.translate(0, 0.5, 0);
    const crownGeo = keep(frondGeometry());
    const trunkMat = keep(withGrow(new THREE.MeshStandardMaterial({ color: "#7d6c58", roughness: 0.95 }), U));
    trunkMat.customProgramCacheKey = () => "pewe-palm-trunk";
    const crownMat = keep(withGrow(new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide }), U));
    crownMat.customProgramCacheKey = () => "pewe-palm-crown";
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palms.length);
    const crowns = new THREE.InstancedMesh(crownGeo, crownMat, palms.length);
    const fronds = ["#4e6b2c", "#58742f", "#647a33", "#4a6330"].map(lin);
    palms.forEach(([x, y], i) => {
      const H = 9 + rand() * 7;
      const lean = (rand() * 9 * Math.PI) / 180;
      const dir = rand() * Math.PI * 2;
      const axis = new THREE.Vector3(Math.cos(dir), 0, Math.sin(dir));
      const q = new THREE.Quaternion().setFromAxisAngle(axis, lean);
      const base = new THREE.Vector3(x, ground.height(x, y) - 0.2, -y);
      const tm = new THREE.Matrix4().compose(base, q, new THREE.Vector3(1, H, 1));
      trunks.setMatrixAt(i, tm);
      const top = new THREE.Vector3(0, H, 0).applyQuaternion(q).add(base);
      const cq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2).premultiply(q);
      const s = 0.85 + rand() * 0.35;
      crowns.setMatrixAt(i, new THREE.Matrix4().compose(top, cq, new THREE.Vector3(s, s, s)));
      crowns.setColorAt(i, fronds[i % fronds.length]);
    });
    for (const m of [trunks, crowns]) {
      m.castShadow = true;
      m.receiveShadow = true;
      m.customDepthMaterial = keep(growDepthMaterial(U));
      m.frustumCulled = false;
      group.add(m);
    }
    trunks.name = "palm-trunks";
    crowns.name = "palm-crowns";
  }

  /* mangroves ---------------------------------------------------------- */
  const mangroves: THREE.Matrix4[] = [];
  for (let y = iy0; y < iy1; y += 9) {
    for (let x = ix0; x < ix1; x += 9) {
      const px = x + (rand() - 0.5) * 8;
      const py = y + (rand() - 0.5) * 8;
      const w = ground.water(px, py);
      if (w < 0.24 || w > 0.47) continue;
      if (rand() > 0.75) continue;
      if (isReserved(px, py, 0)) continue;
      for (let k = 0; k < 2; k++) {
        const r = 1.3 + rand() * 1.5;
        const ox = (rand() - 0.5) * 5;
        const oy = (rand() - 0.5) * 5;
        mangroves.push(
          new THREE.Matrix4().compose(
            new THREE.Vector3(px + ox, Math.max(ground.height(px + ox, py + oy), WATER_Y) + r * 0.3, -(py + oy)),
            new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6.28),
            new THREE.Vector3(r * 1.25, r * 0.7, r),
          ),
        );
      }
    }
  }
  if (mangroves.length) {
    const geo = keep(canopyGeometry(1, 5.1));
    const mat = keep(withGrow(new THREE.MeshStandardMaterial({ color: "#4a6440", flatShading: true, roughness: 0.9 }), U));
    mat.customProgramCacheKey = () => "pewe-mangrove";
    const mesh = new THREE.InstancedMesh(geo, mat, mangroves.length);
    mangroves.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.name = "mangroves";
    group.add(mesh);
  }

  /* poles, wires, lamps -------------------------------------------------- */
  const poleSpots: { x: number; y: number; nx: number; ny: number }[] = [];
  for (const [name, line] of Object.entries(v.roads)) {
    const pts = resample(line, name === "main" ? 42 : 48);
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, y] = pts[i];
      const tx = pts[i + 1][0] - pts[i - 1][0];
      const ty = pts[i + 1][1] - pts[i - 1][1];
      const tl = Math.hypot(tx, ty) || 1;
      const nx = ty / tl;
      const ny = -tx / tl;
      const px = x + nx * 4.6;
      const py = y + ny * 4.6;
      if (isReserved(px, py, -4) || ground.water(px, py) > 0.3) continue;
      poleSpots.push({ x: px, y: py, nx: -nx, ny: -ny });
    }
  }
  const poleGeo = keep(new THREE.CylinderGeometry(0.11, 0.16, 8.6, 5));
  poleGeo.translate(0, 4.3, 0);
  const poleMat = keep(withGrow(new THREE.MeshStandardMaterial({ color: "#8e8b84", roughness: 0.9 }), U));
  poleMat.customProgramCacheKey = () => "pewe-pole";
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, poleSpots.length);
  const lampGeo = keep(new THREE.SphereGeometry(0.24, 8, 6));
  const lampMat = keep(new THREE.MeshBasicMaterial({ color: "#a9a69c", toneMapped: false }));
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, poleSpots.length);
  const poolTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,210,150,1)");
    grd.addColorStop(0.45, "rgba(255,190,120,0.35)");
    grd.addColorStop(1, "rgba(255,180,110,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return keep(new THREE.CanvasTexture(c));
  })();
  const poolGeo = keep(new THREE.PlaneGeometry(16, 16));
  poolGeo.rotateX(-Math.PI / 2);
  const poolMat = keep(
    new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false }),
  );
  const pools = new THREE.InstancedMesh(poolGeo, poolMat, poleSpots.length);
  poleSpots.forEach((s, i) => {
    const h = ground.height(s.x, s.y);
    dummy.position.set(s.x, h - 0.2, -s.y);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poles.setMatrixAt(i, dummy.matrix);
    dummy.position.set(s.x + s.nx * 1.3, h + 8.2, -(s.y + s.ny * 1.3));
    dummy.updateMatrix();
    lamps.setMatrixAt(i, dummy.matrix);
    dummy.position.set(s.x + s.nx * 2.2, ground.height(s.x + s.nx * 2.2, s.y + s.ny * 2.2) + 0.7, -(s.y + s.ny * 2.2));
    dummy.updateMatrix();
    pools.setMatrixAt(i, dummy.matrix);
  });
  poles.castShadow = true;
  poles.customDepthMaterial = keep(growDepthMaterial(U));
  for (const m of [poles, lamps, pools]) {
    m.frustumCulled = false;
    group.add(m);
  }
  pools.renderOrder = 2;
  // wires along the main road only
  const wirePts: number[] = [];
  const mainPoles = poleSpots.filter((s) => distToPolyline(s.x, s.y, v.roads.main) < 7);
  for (let i = 0; i < mainPoles.length - 1; i++) {
    const a = mainPoles[i];
    const b = mainPoles[i + 1];
    const span = Math.hypot(b.x - a.x, b.y - a.y);
    if (span > 70) continue;
    const ha = ground.height(a.x, a.y) + 8.0;
    const hb = ground.height(b.x, b.y) + 8.0;
    for (const off of [-0.35, 0.35]) {
      for (let k = 0; k < 8; k++) {
        for (const kk of [k, k + 1]) {
          const t = kk / 8;
          const x = a.x + (b.x - a.x) * t + a.nx * off;
          const y = a.y + (b.y - a.y) * t + a.ny * off;
          const sag = Math.sin(Math.PI * t) * 0.9;
          wirePts.push(x, ha + (hb - ha) * t - sag, -y);
        }
      }
    }
  }
  const wireGeo = keep(new THREE.BufferGeometry());
  wireGeo.setAttribute("position", new THREE.Float32BufferAttribute(wirePts, 3));
  const wireMat = keep(new THREE.LineBasicMaterial({ color: INK_HEX, transparent: true, opacity: 0.45 }));
  const wires = new THREE.LineSegments(wireGeo, wireMat);
  wires.name = "wires";
  group.add(wires);
  late.push(wires, lamps);

  /* yellow-and-white posts by the Community Building ---------------------- */
  const postSpots: { x: number; y: number }[] = [];
  {
    const line = resample(v.roads.main, 2.6);
    for (let i = 1; i < line.length - 1; i++) {
      const [x, y] = line[i];
      if (y < -45 || y > 265) continue;
      const tx = line[i + 1][0] - line[i - 1][0];
      const ty = line[i + 1][1] - line[i - 1][1];
      const tl = Math.hypot(tx, ty) || 1;
      const nx = ty / tl;
      const ny = -tx / tl;
      // east side of a south-running road
      const sx = x - nx * 3.6;
      const sy = y - ny * 3.6;
      if (isReserved(sx, sy, -10)) continue;
      postSpots.push({ x: sx, y: sy });
    }
  }
  if (postSpots.length) {
    const whiteGeo = keep(new THREE.BoxGeometry(0.2, 1.05, 0.2));
    whiteGeo.translate(0, 0.52, 0);
    const capGeo = keep(new THREE.BoxGeometry(0.21, 0.36, 0.21));
    capGeo.translate(0, 1.2, 0);
    const wm = keep(withGrow(new THREE.MeshStandardMaterial({ color: "#f2efe6", roughness: 0.6 }), U));
    wm.customProgramCacheKey = () => "pewe-post-w";
    const ym = keep(withGrow(new THREE.MeshStandardMaterial({ color: "#e8b81e", roughness: 0.5 }), U));
    ym.customProgramCacheKey = () => "pewe-post-y";
    const white = new THREE.InstancedMesh(whiteGeo, wm, postSpots.length);
    const caps = new THREE.InstancedMesh(capGeo, ym, postSpots.length);
    postSpots.forEach((s, i) => {
      dummy.position.set(s.x, ground.height(s.x, s.y), -s.y);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      white.setMatrixAt(i, dummy.matrix);
      caps.setMatrixAt(i, dummy.matrix);
    });
    for (const m of [white, caps]) {
      m.frustumCulled = false;
      m.castShadow = true;
      group.add(m);
    }
  }

  /* hill tanks + pipes ----------------------------------------------------- */
  {
    const [tx, ty] = P.tanks;
    const tankMat = keep(new THREE.MeshStandardMaterial({ color: "#d9d5ca", roughness: 0.85 }));
    const rimMat = keep(new THREE.MeshStandardMaterial({ color: "#8f8a80", roughness: 0.8 }));
    const tanks: [number, number, number, number][] = [
      [tx - 6, ty + 1, 4.6, 5.6],
      [tx + 6, ty + 3, 4.6, 5.6],
      [tx + 0.5, ty - 9, 2.9, 4.2],
    ];
    for (const [x, y, r, h] of tanks) {
      const g = keep(new THREE.CylinderGeometry(r, r, h, 28));
      const m = new THREE.Mesh(g, tankMat);
      m.position.set(x, ground.height(x, y) + h / 2 - 0.3, -y);
      m.castShadow = m.receiveShadow = true;
      group.add(m);
      late.push(m);
      const rg = keep(new THREE.CylinderGeometry(r + 0.15, r + 0.15, 0.35, 28));
      const rim = new THREE.Mesh(rg, rimMat);
      rim.position.set(x, ground.height(x, y) + h - 0.1, -y);
      group.add(rim);
      late.push(rim);
    }
  }
  const pipeMat = keep(new THREE.MeshStandardMaterial({ color: "#3a3f3d", roughness: 0.7 }));
  const flowUniforms = { uFlow: { value: 0 }, uTime: U.uTime, uLen: { value: 1 } };
  const flowMats: THREE.ShaderMaterial[] = [];
  const pipeLines: XY[][] = [v.pipes.feed, v.pipes.north, v.pipes.south];
  pipeLines.forEach((line, li) => {
    const pts = resample(line, 6).map(([x, y]) => new THREE.Vector3(x, ground.height(x, y) + 0.45, -y));
    if (pts.length < 2) return;
    const curve = new THREE.CatmullRomCurve3(pts);
    const segs = Math.max(8, Math.floor(curve.getLength() / 4));
    const pg = keep(new THREE.TubeGeometry(curve, segs, 0.26, 5, false));
    const pipe = new THREE.Mesh(pg, pipeMat);
    pipe.castShadow = true;
    pipe.visible = false;
    pipe.name = "pipe";
    group.add(pipe);
    const fg = keep(new THREE.TubeGeometry(curve, segs, 0.62, 6, false));
    const len = curve.getLength();
    const fm = keep(
      new THREE.ShaderMaterial({
        uniforms: { ...flowUniforms, uLen: { value: len }, uStart: { value: li === 0 ? 0 : 1 } },
        transparent: true,
        depthWrite: false,
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uFlow; uniform float uTime; uniform float uLen; uniform float uStart;
          varying vec2 vUv;
          void main() {
            float s = vUv.x * uLen;
            float reach = clamp(uFlow * 1.6 - uStart * 0.5, 0.0, 1.0) * uLen;
            if (s > reach) discard;
            float p = fract(s / 26.0 - uTime * 0.55);
            float band = smoothstep(0.0, 0.18, p) * (1.0 - smoothstep(0.32, 0.6, p));
            vec3 col = mix(vec3(0.42, 0.68, 0.8), vec3(0.85, 0.95, 1.0), band);
            gl_FragColor = vec4(col, (0.35 + 0.65 * band) * min(uFlow * 2.0, 1.0));
          }`,
      }),
    );
    flowMats.push(fm);
    const flow = new THREE.Mesh(fg, fm);
    flow.renderOrder = 4;
    flow.visible = false;
    flow.name = "flow";
    group.add(flow);
  });

  const lampDay = new THREE.Color("#a9a69c");
  const lampNight = new THREE.Color("#ffd7a0").multiplyScalar(2.2);

  return {
    group,
    setRoadDraw(p) {
      draw.uniforms.uDraw.value = p;
      drawMesh.visible = p > 0.001;
    },
    setFlow(f) {
      for (const m of flowMats) m.uniforms.uFlow.value = f;
      group.children.forEach((c) => {
        if (c.name === "flow" || c.name === "pipe") c.visible = f > 0.001;
      });
    },
    setNight(n) {
      lampMat.color.copy(lampDay).lerp(lampNight, n);
      poolMat.opacity = n * 0.55;
      pools.visible = n > 0.02;
    },
    update() {
      const show = U.uGrow.value > 0.55;
      for (const o of late) o.visible = show;
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}
