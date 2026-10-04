import * as THREE from "three";

/**
 * Values every Pewe shader reads. One object, shared by reference, so a
 * single assignment (uRise.value = 0.5) moves the whole scene together.
 */
export interface SharedUniforms {
  uTime: { value: number };
  /** 0 = flat survey sheet, 1 = the land at full height */
  uRise: { value: number };
  /** 1 = everything drawn as ink on paper, 0 = the living village */
  uSurvey: { value: number };
  /** radius (m) out to which the survey lines have drawn themselves */
  uReveal: { value: number };
  /** 0..1, houses and trees grow outward from the Community Building */
  uGrow: { value: number };
  uNight: { value: number };
  /** sRGB, mixed after tone mapping so it matches the page exactly */
  uPaper: { value: THREE.Vector3 };
  uInk: { value: THREE.Vector3 };
  uField: { value: THREE.Color };
  uFieldMix: { value: number };
  uForestTint: { value: THREE.Color };
  uContour: { value: number };
}

export const PAPER_HEX = "#eef1ef";
export const INK_HEX = "#18201d";

function srgbVec(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export function createUniforms(): SharedUniforms {
  return {
    uTime: { value: 0 },
    uRise: { value: 1 },
    uSurvey: { value: 0 },
    uReveal: { value: 1e6 },
    uGrow: { value: 1 },
    uNight: { value: 0 },
    uPaper: { value: srgbVec(PAPER_HEX) },
    uInk: { value: srgbVec(INK_HEX) },
    uField: { value: new THREE.Color("#b4a446") },
    uFieldMix: { value: 0.85 },
    uForestTint: { value: new THREE.Color("#ffffff") },
    uContour: { value: 0.35 },
  };
}

/** GLSL shared by the land and water shaders. */
export const SURVEY_GLSL = /* glsl */ `
uniform float uRise;
uniform float uSurvey;
uniform float uReveal;
uniform vec3 uPaper;
uniform vec3 uInk;
float pwContour(float h, float iv) {
  float f = h / iv;
  float w = fwidth(f);
  float d = abs(fract(f - 0.5) - 0.5);
  float line = 1.0 - smoothstep(w * 0.55, w * 1.55, d);
  return line * (1.0 - smoothstep(0.22, 0.55, w));
}
`;

/**
 * Grows instanced things out of the ground, nearest the Community Building
 * first. Insert after <begin_vertex>; needs `uniform float uGrow`.
 */
export const GROW_GLSL = /* glsl */ `
#ifdef USE_INSTANCING
  {
    vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
    float gd = length(ip);
    float gs = clamp((uGrow * 3200.0 - gd) / 160.0, 0.0, 1.0);
    gs = gs * gs * (3.0 - 2.0 * gs);
    transformed *= gs;
  }
#endif
`;

/** Add the grow animation to any instanced material (and its shadow). */
export function withGrow<T extends THREE.Material>(mat: T, U: SharedUniforms, extra?: (shader: THREE.WebGLProgramParametersWithUniforms) => void): T {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    prev?.call(mat, shader, renderer);
    shader.uniforms.uGrow = U.uGrow;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uGrow;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n" + GROW_GLSL);
    extra?.(shader);
  };
  mat.customProgramCacheKey = () => "grow-" + (extra ? "x" : "");
  return mat;
}

/** A depth material that grows in step, so shadows match the meshes. */
export function growDepthMaterial(U: SharedUniforms) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  return withGrow(m, U);
}
