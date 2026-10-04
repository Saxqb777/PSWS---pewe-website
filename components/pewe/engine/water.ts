import * as THREE from "three";
import { WATER_Y } from "./data";
import type { SharedUniforms } from "./uniforms";

/** The creek, the river and the sea: one sheet of water with a slow ripple. */
export function buildWater(U: SharedUniforms) {
  const geo = new THREE.PlaneGeometry(26000, 26000, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: "#556659",
    roughness: 0.34,
    metalness: 0.0,
    envMapIntensity: 0.5,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = U.uTime;
    shader.uniforms.uSurvey = U.uSurvey;
    shader.uniforms.uPaper = U.uPaper;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uTime;\nuniform float uSurvey;\nuniform vec3 uPaper;\nvarying vec3 vWPos;",
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        {
          vec2 p = vWPos.xz;
          float t = uTime;
          vec2 g = vec2(
            sin(p.x * 0.041 + t * 0.8 + sin(p.y * 0.023 + t * 0.3) * 1.7) * 0.6 +
            sin(p.x * 0.13 - p.y * 0.07 + t * 1.6) * 0.25 + sin(p.x * 0.31 + p.y * 0.19 - t * 2.3) * 0.1,
            cos(p.y * 0.047 - t * 0.7 + sin(p.x * 0.019) * 1.5) * 0.6 +
            cos(p.y * 0.12 + p.x * 0.08 - t * 1.4) * 0.25 + cos(p.y * 0.29 - p.x * 0.21 + t * 2.1) * 0.1
          );
          float dist = length(cameraPosition - vWPos);
          float k = 0.035 * (1.0 - smoothstep(400.0, 2200.0, dist));
          normal = normalize(normal + (viewMatrix * vec4(g.x * k, 0.0, g.y * k, 0.0)).xyz);
        }`,
      )
      .replace(
        "#include <fog_fragment>",
        `#include <fog_fragment>
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uPaper * vec3(0.9, 0.93, 0.94), uSurvey);`,
      );
  };
  mat.customProgramCacheKey = () => "pewe-water";
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = WATER_Y;
  mesh.receiveShadow = true;
  mesh.name = "water";
  mesh.renderOrder = 1;
  return {
    mesh,
    material: mat,
    /** keep the sheet under the flattened land while it rises */
    setRise(r: number) {
      mesh.position.y = WATER_Y - (1 - r) * 12;
      mesh.visible = r > 0.02;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
