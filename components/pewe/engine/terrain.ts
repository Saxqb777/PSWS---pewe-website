import * as THREE from "three";
import { Ground, type MapData, type XY, pointInPolygon } from "./data";
import { fbm, valueNoise } from "./noise";
import { SURVEY_GLSL, type SharedUniforms } from "./uniforms";

/**
 * The land itself: a 10 m mesh over the village and a 100 m ring out to the
 * sea, coloured from height, slope and water, and drawn with a shader that
 * can turn the whole thing back into a survey sheet of contour lines.
 */

type RGB = [number, number, number];
const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16) / 255,
  parseInt(h.slice(3, 5), 16) / 255,
  parseInt(h.slice(5, 7), 16) / 255,
];
const C = {
  // darker than a lawn: from above, the Konkan hills are one closed canopy
  forestA: hex("#2c4327"),
  forestB: hex("#385233"),
  forestC: hex("#48613c"),
  deciduous: hex("#7a8549"),
  laterite: hex("#8d5b3a"),
  dryGrass: hex("#a39058"),
  grass: hex("#7a9454"),
  field: hex("#9aa65a"),
  village: hex("#8a6a4c"),
  shore: hex("#55603f"),
  mud: hex("#6a5640"),
  bed: hex("#3f3d31"),
};
const lerp = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sat = (x: number) => Math.min(Math.max(x, 0), 1);
const smooth = (e0: number, e1: number, x: number) => {
  const t = sat((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

export interface HouseIndex {
  near(x: number, y: number, r: number): number;
}

export function houseIndex(houses: [number, number, number][]): HouseIndex {
  const cell = 40;
  const map = new Map<string, XY[]>();
  for (const [x, y] of houses) {
    const k = `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
    (map.get(k) ?? map.set(k, []).get(k)!).push([x, y]);
  }
  return {
    near(x, y, r) {
      let best = Infinity;
      const cx = Math.floor(x / cell);
      const cy = Math.floor(y / cell);
      const span = Math.ceil(r / cell);
      for (let i = -span; i <= span; i++)
        for (let j = -span; j <= span; j++) {
          const list = map.get(`${cx + i},${cy + j}`);
          if (!list) continue;
          for (const [hx, hy] of list) {
            const d = Math.hypot(hx - x, hy - y);
            if (d < best) best = d;
          }
        }
      return best;
    },
  };
}

/** Land colour (sRGB) and the season masks for one point. */
export function landAt(
  ground: Ground,
  x: number,
  y: number,
  paddy: XY[] | null,
  houses: HouseIndex | null,
): { rgb: RGB; field: number; forest: number } {
  const raw = ground.raw(x, y);
  const w = ground.water(x, y);
  const slope = ground.slope(x, y, 10);
  const n1 = fbm(x, y, 220, 3);
  const n2 = valueNoise(x, y, 45, 9);

  if (w > 0.5) return { rgb: C.bed, field: 0, forest: 0 };

  // Forest is the default for anything above the valley floor.
  let rgb = lerp(lerp(C.forestA, C.forestB, n1), C.forestC, sat(n2 - 0.35) * 0.9);
  if (n1 > 0.68) rgb = lerp(rgb, C.deciduous, smooth(0.68, 0.85, n1) * 0.6);
  let forest = 1;
  let field = 0;

  // Valley floor: grass and fields, warmer near the houses.
  const flat = 1 - smooth(4, 11, slope);
  const low = 1 - smooth(9, 20, raw);
  const valley = flat * low;
  if (valley > 0) {
    // fields come in patches, not across the whole floor
    const patch = smooth(0.48, 0.66, valueNoise(x, y, 90, 21));
    let floor = lerp(C.grass, C.field, patch * 0.8);
    field = 0.75 * valley * patch;
    if (houses) {
      const hd = houses.near(x, y, 60);
      const v = 1 - smooth(10, 38, hd);
      floor = lerp(floor, C.village, v * 0.7);
      field *= 1 - v;
    }
    rgb = lerp(rgb, floor, valley);
    forest = 1 - valley;
  }
  if (paddy && pointInPolygon(x, y, paddy)) {
    rgb = C.field;
    field = 1;
    forest = 0;
  }

  // Laterite plateaus: high, flat, red earth with dry grass.
  const plateau = smooth(70, 110, raw) * (1 - smooth(6, 14, slope));
  if (plateau > 0) {
    const lat = lerp(C.laterite, C.dryGrass, n2);
    rgb = lerp(rgb, lat, plateau * (0.55 + 0.45 * n1));
    forest *= 1 - plateau * 0.8;
  }

  // Creek edges: mangrove and mud.
  const shore = smooth(0.18, 0.34, w) * (1 - smooth(0.42, 0.5, w));
  if (shore > 0) {
    rgb = lerp(rgb, lerp(C.shore, C.mud, n2), shore);
    forest *= 1 - shore;
    field *= 1 - shore;
  }
  return { rgb, field, forest };
}

const tmpColor = new THREE.Color();

function makeMaterial(U: SharedUniforms) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uRise: U.uRise,
      uSurvey: U.uSurvey,
      uReveal: U.uReveal,
      uPaper: U.uPaper,
      uInk: U.uInk,
      uField: U.uField,
      uFieldMix: U.uFieldMix,
      uForestTint: U.uForestTint,
      uContour: U.uContour,
    });
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uRise;\nattribute vec4 aMeta;\nvarying vec4 vMeta;\nvarying vec3 vWPos;",
      )
      .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.y *= uRise;\nvMeta = aMeta;")
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\n" +
          SURVEY_GLSL +
          "\nuniform vec3 uField;\nuniform float uFieldMix;\nuniform vec3 uForestTint;\nuniform float uContour;\nvarying vec4 vMeta;\nvarying vec3 vWPos;",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        {
          vec2 q = mat2(0.955, -0.296, 0.296, 0.955) * vWPos.xz;
          vec2 cid = floor(q / 17.0);
          float hsh = fract(sin(dot(cid, vec2(12.9898, 78.233))) * 43758.5453);
          vec3 fc = uField * (0.86 + hsh * 0.26);
          fc = mix(fc, fc * vec3(0.8, 1.06, 0.74), step(0.8, hsh));
          vec2 gq = abs(fract(q / 17.0) - 0.5);
          float fw = fwidth(q.x / 17.0);
          float edge = 0.5 - max(gq.x, gq.y);
          float bund = (1.0 - smoothstep(0.0, fw * 1.4, edge)) * (1.0 - smoothstep(0.05, 0.14, fw));
          diffuseColor.rgb = mix(diffuseColor.rgb, fc, vMeta.x * uFieldMix);
          // canopy texture on forested ground, so far hills read as forest
          vec2 fp = vWPos.xz / 23.0;
          vec2 fi = floor(fp); vec2 ff = fract(fp); ff = ff * ff * (3.0 - 2.0 * ff);
          float h00 = fract(sin(dot(fi, vec2(127.1, 311.7))) * 43758.5453);
          float h10 = fract(sin(dot(fi + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);
          float h01 = fract(sin(dot(fi + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
          float h11 = fract(sin(dot(fi + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
          float cn = mix(mix(h00, h10, ff.x), mix(h01, h11, ff.x), ff.y);
          diffuseColor.rgb *= 1.0 + (cn - 0.5) * 0.26 * vMeta.y;
          diffuseColor.rgb *= 1.0 - bund * 0.28 * smoothstep(0.5, 0.9, vMeta.x);
        }
        diffuseColor.rgb *= mix(vec3(1.0), uForestTint, vMeta.y);`,
      )
      .replace(
        "#include <fog_fragment>",
        `#include <fog_fragment>
        {
          float hgt = vMeta.z;
          float land = step(0.8, hgt) * (1.0 - smoothstep(0.38, 0.5, vMeta.w));
          float c10 = pwContour(hgt, 10.0);
          float c50 = pwContour(hgt, 50.0);
          float lines = max(c10 * 0.55, c50) * land;
          gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.8, lines * uContour * (1.0 - uSurvey));
          float rd = length(vWPos.xz);
          float reveal = 1.0 - smoothstep(uReveal - 220.0, uReveal, rd);
          float wet = smoothstep(0.38, 0.5, vMeta.w);
          float shoreW = fwidth(vMeta.w);
          float shoreLine = 1.0 - smoothstep(shoreW * 0.6, shoreW * 1.8, abs(vMeta.w - 0.42));
          vec3 sheet = mix(uPaper, uPaper * vec3(0.9, 0.93, 0.94), wet * reveal);
          sheet = mix(sheet, uInk, clamp(lines * 0.8 + shoreLine * 0.9, 0.0, 1.0) * reveal);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, sheet, uSurvey);
        }`,
      );
  };
  mat.customProgramCacheKey = () => "pewe-terrain";
  return mat;
}

interface Built {
  geometry: THREE.BufferGeometry;
}

function buildGrid(
  ground: Ground,
  x0: number,
  y0: number,
  step: number,
  nx: number,
  ny: number,
  colourAt: (x: number, y: number) => { rgb: RGB; field: number; forest: number },
  sinkInside: ((x: number, y: number) => number) | null,
  skirt: number,
): Built {
  const n = nx * ny;
  const ring = skirt > 0 ? 2 * (nx + ny) - 4 : 0;
  const pos = new Float32Array((n + ring) * 3);
  const col = new Float32Array((n + ring) * 3);
  const meta = new Float32Array((n + ring) * 4);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      const x = x0 + i * step;
      const y = y0 - j * step;
      let h = ground.height(x, y);
      if (sinkInside) h -= sinkInside(x, y);
      pos[k * 3] = x;
      pos[k * 3 + 1] = h;
      pos[k * 3 + 2] = -y;
      const c = colourAt(x, y);
      tmpColor.setRGB(c.rgb[0], c.rgb[1], c.rgb[2], THREE.SRGBColorSpace);
      col[k * 3] = tmpColor.r;
      col[k * 3 + 1] = tmpColor.g;
      col[k * 3 + 2] = tmpColor.b;
      meta[k * 4] = c.field;
      meta[k * 4 + 1] = c.forest;
      meta[k * 4 + 2] = ground.raw(x, y);
      meta[k * 4 + 3] = ground.water(x, y);
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < ny - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i;
      const b = a + 1;
      const c = a + nx;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  if (skirt > 0) {
    // A curtain hanging from the edge hides any crack against the outer ring.
    const edge: number[] = [];
    for (let i = 0; i < nx; i++) edge.push(i);
    for (let j = 1; j < ny; j++) edge.push(j * nx + nx - 1);
    for (let i = nx - 2; i >= 0; i--) edge.push((ny - 1) * nx + i);
    for (let j = ny - 2; j >= 1; j--) edge.push(j * nx);
    edge.forEach((src, e) => {
      const k = n + e;
      pos[k * 3] = pos[src * 3];
      pos[k * 3 + 1] = pos[src * 3 + 1] - skirt;
      pos[k * 3 + 2] = pos[src * 3 + 2];
      col.copyWithin(k * 3, src * 3, src * 3 + 3);
      meta.copyWithin(k * 4, src * 4, src * 4 + 4);
    });
    for (let e = 0; e < edge.length; e++) {
      const a = edge[e];
      const b = edge[(e + 1) % edge.length];
      const a2 = n + e;
      const b2 = n + ((e + 1) % edge.length);
      idx.push(a, b, a2, b, b2, a2, a, a2, b, b, a2, b2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aMeta", new THREE.BufferAttribute(meta, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geometry: g };
}

export function buildTerrain(ground: Ground, data: MapData, U: SharedUniforms, houses: HouseIndex, coarse = false) {
  const v = data.village;
  const mat = makeMaterial(U);
  const paddy = v.paddy;

  const inner = buildGrid(
    ground,
    v.inner.x0,
    v.inner.y0,
    v.inner.step,
    v.inner.nx,
    v.inner.ny,
    (x, y) => landAt(ground, x, y, paddy, houses),
    null,
    18,
  );
  const innerMesh = new THREE.Mesh(inner.geometry, mat);
  innerMesh.receiveShadow = true;
  innerMesh.castShadow = true;
  innerMesh.name = "land-inner";

  // weaker devices draw the far land at half the detail
  const k = coarse ? 2 : 1;
  const outer = buildGrid(
    ground,
    v.outer.x0,
    v.outer.y0,
    v.outer.step * k,
    Math.floor((v.outer.nx - 1) / k) + 1,
    Math.floor((v.outer.ny - 1) / k) + 1,
    (x, y) => landAt(ground, x, y, null, null),
    (x, y) => (ground.insideInner(x, y, 15) ? 14 : 0),
    0,
  );
  const outerMesh = new THREE.Mesh(outer.geometry, mat);
  outerMesh.receiveShadow = true;
  outerMesh.name = "land-outer";

  return {
    inner: innerMesh,
    outer: outerMesh,
    material: mat,
    dispose() {
      inner.geometry.dispose();
      outer.geometry.dispose();
      mat.dispose();
    },
  };
}
