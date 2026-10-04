import * as THREE from "three";
import type { SharedUniforms } from "./uniforms";

/**
 * The sky dome. Its horizon colour is the fog colour, so distant hills melt
 * into it; at night it carries stars; during the survey it becomes paper.
 * Colours are fed in sRGB and written straight out, like the page itself.
 */
export function buildSky(U: SharedUniforms) {
  const uniforms = {
    uZenith: { value: new THREE.Vector3(0.43, 0.62, 0.82) },
    uHorizon: { value: new THREE.Vector3(0.85, 0.89, 0.91) },
    uGround: { value: new THREE.Vector3(0.6, 0.62, 0.6) },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Vector3(1, 0.95, 0.85) },
    uSunGlow: { value: 1 },
    uStars: { value: 0 },
    uSurvey: U.uSurvey,
    uPaper: U.uPaper,
    uTime: U.uTime,
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenith, uHorizon, uGround, uSunDir, uSunColor, uPaper;
      uniform float uSunGlow, uStars, uSurvey, uTime;
      varying vec3 vDir;
      float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.5));
        col = mix(col, uGround, smoothstep(0.0, -0.06, h));
        float s = max(dot(d, normalize(uSunDir)), 0.0);
        col += uSunColor * (pow(s, 1800.0) * 1.2 + pow(s, 24.0) * 0.16 + pow(s, 4.0) * 0.05) * uSunGlow;
        if (uStars > 0.001) {
          vec3 q = d * 420.0;
          vec3 cell = floor(q);
          float r = hash(cell);
          float star = step(0.9972, r) * smoothstep(0.02, 0.25, h);
          float tw = 0.75 + 0.25 * sin(uTime * 2.0 + r * 60.0);
          col += vec3(0.85, 0.9, 1.0) * star * uStars * tw * (0.5 + 0.5 * hash(cell + 3.1));
        }
        col = mix(col, uPaper, uSurvey);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const geo = new THREE.SphereGeometry(1, 48, 24);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  mesh.name = "sky";

  return {
    mesh,
    uniforms,
    /** keep the dome around the camera, just inside the far plane */
    follow(camera: THREE.PerspectiveCamera) {
      mesh.position.copy(camera.position);
      mesh.scale.setScalar(camera.far * 0.9);
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}

/**
 * A tiny scene with only the sky in it, used to bake a reflection map for
 * the water and the buildings whenever the light changes.
 */
export function buildSkyProbe(U: SharedUniforms, skyUniforms: ReturnType<typeof buildSky>["uniforms"]) {
  const scene = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenith, uHorizon, uGround, uSunDir, uSunColor;
      uniform float uSunGlow;
      varying vec3 vDir;
      vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.5));
        col = mix(col, uGround * 0.7, smoothstep(0.0, -0.1, h));
        float s = max(dot(d, normalize(uSunDir)), 0.0);
        col += uSunColor * (pow(s, 24.0) * 0.5 + pow(s, 4.0) * 0.08) * uSunGlow;
        gl_FragColor = vec4(toLinear(col), 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), mat);
  scene.add(mesh);
  void U;
  return {
    scene,
    dispose() {
      mesh.geometry.dispose();
      mat.dispose();
    },
  };
}
