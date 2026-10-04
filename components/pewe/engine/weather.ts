import * as THREE from "three";
import { PEWE_LAT, PEWE_LNG } from "./sun";

/** Pewe's weather right now, from Open-Meteo (free, no key). */
export interface Weather {
  tempC: number | null;
  cloud: number;
  rain: boolean;
  label: string;
}

export const CLEAR: Weather = { tempC: null, cloud: 0.1, rain: false, label: "" };

function label(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Mist";
  if (code >= 51 && code <= 57) return "Drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "Rain";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}

export async function fetchWeather(signal?: AbortSignal): Promise<Weather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${PEWE_LAT}&longitude=${PEWE_LNG}` +
    `&current=temperature_2m,precipitation,rain,weather_code,cloud_cover&timezone=Asia%2FKolkata`;
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`weather ${r.status}`);
  const j = (await r.json()) as {
    current?: { temperature_2m?: number; rain?: number; precipitation?: number; weather_code?: number; cloud_cover?: number };
  };
  const c = j.current ?? {};
  const code = c.weather_code ?? 0;
  const rain = (c.rain ?? 0) > 0.05 || (c.precipitation ?? 0) > 0.1 || (code >= 51 && code <= 67) || (code >= 80 && code <= 99);
  return {
    tempC: typeof c.temperature_2m === "number" ? Math.round(c.temperature_2m) : null,
    cloud: Math.min(Math.max((c.cloud_cover ?? 20) / 100, 0), 1),
    rain,
    label: label(code),
  };
}

export function weatherOverride(kind: string | null): Weather | null {
  if (kind === "rain") return { tempC: 26, cloud: 1, rain: true, label: "Rain" };
  if (kind === "cloudy") return { tempC: 28, cloud: 0.85, rain: false, label: "Cloudy" };
  if (kind === "clear") return { tempC: 31, cloud: 0.05, rain: false, label: "Clear" };
  return null;
}

/** Rain as streaks around the point you're looking at. Moves in the shader. */
export function buildRain(lowPower: boolean) {
  const n = lowPower ? 1400 : 3200;
  const pos = new Float32Array(n * 2 * 3);
  const seed = new Float32Array(n * 2);
  const end = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const x = (Math.random() - 0.5) * 2;
    const z = (Math.random() - 0.5) * 2;
    const y = Math.random();
    const s = Math.random();
    for (let k = 0; k < 2; k++) {
      pos.set([x, y, z], (i * 2 + k) * 3);
      seed[i * 2 + k] = s;
      end[i * 2 + k] = k;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  geo.setAttribute("aEnd", new THREE.BufferAttribute(end, 1));
  const uniforms = {
    uTime: { value: 0 },
    uCenter: { value: new THREE.Vector3() },
    uSize: { value: new THREE.Vector3(260, 180, 260) },
    uOpacity: { value: 0 },
    uColor: { value: new THREE.Color("#c9d3da") },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      attribute float aSeed; attribute float aEnd;
      uniform float uTime; uniform vec3 uCenter; uniform vec3 uSize;
      varying float vA;
      void main() {
        float fall = fract(position.y - uTime * (0.16 + aSeed * 0.05));
        vec3 p = uCenter + vec3(position.x * uSize.x, (fall - 0.3) * uSize.y, position.z * uSize.z);
        p.x += (1.0 - fall) * 6.0;
        p.y -= aEnd * 2.6; p.x -= aEnd * 0.25;
        vA = 1.0 - aEnd * 0.7;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; uniform vec3 uColor; varying float vA;
      void main() { gl_FragColor = vec4(uColor, uOpacity * vA); }`,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.renderOrder = 6;
  lines.visible = false;
  return {
    object: lines,
    uniforms,
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
