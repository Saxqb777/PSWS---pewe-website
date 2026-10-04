import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";

/**
 * The world finale: Pewe as a dot on India's west coast, drawn as a survey
 * sheet in ink on paper, with laterite arcs to the cities where Pewe's people
 * live and work.
 *
 * Units and axes follow the engine: metres, +Y up, +X east, -Z north, origin
 * at `origin`, local equirectangular projection. Everything sits on or above
 * y = 0 and is drawn without depth testing, in renderOrder 900..906, so it
 * lies on top of whatever else is in the scene.
 *
 * Line widths and marker sizes are in CSS pixels and stay constant at any
 * camera distance: lines are screen-space LineMaterial, and markers size
 * themselves in their vertex shader from the view depth. Nothing has to be
 * fed in per frame; Line2 and the markers read the viewport while rendering.
 *
 * Colours assume the paper background #eef1ef. The base map (coast,
 * graticule, neatline) is printed like ink: each fragment is paper mixed
 * towards its pre-mixed ink colour by coverage x opacity, combined with MIN
 * blending, so crossings, joints and anti-aliased edges never double up and
 * a fade never beads. Arcs and markers are drawn over it with normal alpha.
 */

export interface WorldData {
  bbox: number[];
  lines: number[][];
}

export interface WorldCity {
  id: "mumbai" | "dubai" | "riyadh" | "kigali";
  name: string;
  lat: number;
  lng: number;
  position: THREE.Vector3;
}

export interface WorldHandle {
  group: THREE.Group;
  /** Pewe marker position. */
  pewe: THREE.Vector3;
  cities: WorldCity[];
  /** A good look-at point that frames Pewe + all cities (on y = 0). */
  center: THREE.Vector3;
  /** Metres: radius of the circle around `center` (on y = 0) holding Pewe + all cities, plus 6%. */
  radius: number;
  /** 0..1: fades coastlines, graticule, markers and arcs together. */
  setOpacity(o: number): void;
  /** 0..1: arcs draw out from Pewe to each city, staggered (Mumbai, Dubai, Riyadh, Kigali). */
  setProgress(p: number): void;
  /** Viewport size in CSS pixels (renderer.getSize). Optional: it is also read from the renderer each frame. */
  setResolution(w: number, h: number): void;
  /** Seconds; gently pulses the Pewe ring. */
  update(t: number): void;
  /**
   * Optional. Markers keep a constant on-screen size without it. Given the
   * camera's distance to its target (metres), markers grow by up to 25% as the
   * camera comes in under ~400 km, where the sheet around Pewe is nearly empty.
   */
  setCameraDistance(d: number): void;
  dispose(): void;
}

/** Progress window [start, end] of each arc inside setProgress(0..1); eased in-out within it. */
export const WORLD_ARC_TIMING: Record<WorldCity["id"], readonly [number, number]> = {
  mumbai: [0.0, 0.26],
  dubai: [0.12, 0.54],
  riyadh: [0.26, 0.74],
  kigali: [0.4, 1.0],
};

const PEWE = { lat: 17.558976159379238, lng: 73.24268669549738 };

const CITY_TABLE: ReadonlyArray<Omit<WorldCity, "position">> = [
  { id: "mumbai", name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { id: "dubai", name: "Dubai", lat: 25.2048, lng: 55.2708 },
  { id: "riyadh", name: "Riyadh", lat: 24.7136, lng: 46.6753 },
  { id: "kigali", name: "Kigali", lat: -1.9441, lng: 30.0619 },
];

// Palette (sRGB hex). The page background while the world shows is PAPER.
const PAPER = "#eef1ef";
const INK = "#18201d";
const LATERITE = "#a4472b";

// Ink densities on paper.
const COAST_INK = 0.85;
const GRATICULE_INK = 0.12;
const FRAME_INK = 0.42;

// Line widths, CSS px.
const COAST_WIDTH = 1.15;
const GRATICULE_WIDTH = 1;
const FRAME_WIDTH = 1;
const ARC_WIDTH = 2.5;
/** Hairlines (graticule, frame) are never thinner than this many device px. */
const HAIRLINE_MIN_DEVICE_PX = 1.3;
/** Graduated neatline: tick length (deg) every 1 deg and every 5 deg. */
const TICK_MINOR = 0.22;
const TICK_MAJOR = 0.5;

// Arcs.
const ARC_POINTS = 96; // cosine-spaced: dense at both ends, which the close views look at
const ARC_HEIGHT = 0.16; // peak height / ground distance
/**
 * Height profile (4t(1-t))^ARC_LIFT_POWER: peak ARC_HEIGHT at mid-way, but
 * leaving Pewe and landing tangent to the sheet. A plain parabola climbs so
 * steeply at the start that, seen at a tilt, every arc is pushed towards
 * screen-up and the fan closes over Mumbai's marker next to Pewe.
 */
const ARC_LIFT_POWER = 1.5;
/**
 * Sideways bow of each arc's ground track: [amount as a fraction of the arc's
 * length, to the right of travel (north for the westward arcs); share of the
 * symmetric profile, the rest peaks late, near the destination].
 * With straight ground tracks the Riyadh arc runs over the Dubai marker at any
 * slight camera tilt and the arcs leave Pewe as one bundle. Riyadh bows late,
 * so it leaves Pewe low (clear of the Mumbai marker next door) and passes well
 * north of Dubai; Dubai bows a little south so the two arcs nest apart.
 * Checked in screen space for the finale pose (bearing 190, elevation 66):
 * the Riyadh arc clears Mumbai's centre by ~11 px, the Dubai and Riyadh arcs
 * stay ~7 px apart near Pewe, nothing crosses.
 */
const ARC_BOW: Record<WorldCity["id"], readonly [number, number]> = {
  mumbai: [0, 1],
  dubai: [-0.08, 1],
  riyadh: [0.18, 0.3],
  kigali: [0.05, 1],
};

// Markers, CSS px.
const CITY = { ringR: 6, ringW: 1.25, dotR: 2.2, halo: 1.75 };
const PEWE_MARK = { dotR: 4.25, ringR: 9.5, ringW: 1.5, breathe: 1.5, halo: 1.25, period: 3.6 };
const HEAD = { dotR: 3 };
/**
 * A city marker (and an arc's pen tip) fades out when it comes within this
 * many px of Pewe on screen, i.e. when it would sit under Pewe's own marker:
 * fully gone at [0], fully shown from [1] (where the two markers just touch).
 * Only Mumbai is ever that close, from ~10,000 km out.
 */
const AVOID_PEWE_PX = [11, 18.5] as const;

const RENDER_ORDER = { graticule: 900, frame: 901, coast: 902, arcs: 903, cities: 904, heads: 905, pewe: 906 };

const M_PER_DEG_LAT = 110574;
const M_PER_DEG_LNG = 111320;
const DEG = Math.PI / 180;

// ---------------------------------------------------------------------------
// Colours

/** Ink at `density` on paper, mixed in sRGB like ink on a page, as a linear Color. */
function inkOnPaper(ink: string, density: number): THREE.Color {
  const p = new THREE.Color(PAPER).getRGB({ r: 0, g: 0, b: 0 }, THREE.SRGBColorSpace);
  const k = new THREE.Color(ink).getRGB({ r: 0, g: 0, b: 0 }, THREE.SRGBColorSpace);
  return new THREE.Color().setRGB(
    p.r + (k.r - p.r) * density,
    p.g + (k.g - p.g) * density,
    p.b + (k.b - p.b) * density,
    THREE.SRGBColorSpace,
  );
}

// ---------------------------------------------------------------------------
// Lines

/** Cap handling patched into LineMaterial (see makeLineMaterial). */
const CAPS_ALL = 0;
const CAPS_ENDS = 1;

/**
 * A screen-space LineMaterial that draws over everything, with three patches:
 *
 * - Anti-aliasing. The quad is 1 px wider and the edge is a one device-pixel
 *   coverage ramp (fwidth), so thin, faint lines stay smooth and continuous
 *   at any pixel ratio, with or without MSAA.
 * - Ink (`ink`): the fragment is paper mixed towards the line colour by
 *   coverage x opacity and written with MIN blending, i.e. ink that only
 *   darkens the page. Overlaps (joints, crossings) keep the darker value
 *   instead of stacking, so translucent polylines never bead.
 * - Caps. With uCapMode = CAPS_ENDS only the first segment's start cap and the
 *   last drawn segment's end cap are kept: a smooth arc needs no joint caps,
 *   and under normal alpha they would bead while the arc fades.
 */
function makeLineMaterial(color: THREE.Color, width: number, ink: boolean, paper: THREE.Color): LineMaterial {
  const m = new LineMaterial({
    color,
    linewidth: width,
    worldUnits: false,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  m.toneMapped = false;
  if (ink) {
    m.blending = THREE.CustomBlending;
    m.blendEquation = THREE.MinEquation;
    m.blendSrc = THREE.OneFactor;
    m.blendDst = THREE.OneFactor;
  }
  m.uniforms.uCapMode = { value: CAPS_ALL };
  m.uniforms.uLastSeg = { value: 1e9 };
  m.uniforms.uPad = { value: 1 };
  m.uniforms.uInk = { value: ink ? 1 : 0 };
  m.uniforms.uPaper = { value: paper };
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", "uniform float uPad;\nvarying float vSeg;\nvoid main() {\n\tvSeg = float( gl_InstanceID );")
      .replace("offset *= linewidth;", "offset *= linewidth + uPad;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        "uniform float uCapMode;\nuniform float uLastSeg;\nuniform float uPad;\nuniform float uInk;\nuniform vec3 uPaper;\nvarying float vSeg;\nvoid main() {",
      )
      .replace(
        "gl_FragColor = vec4( diffuseColor.rgb, alpha );",
        `if ( alpha < 0.002 ) discard;
        gl_FragColor = uInk > 0.5 ? vec4( mix( uPaper, diffuseColor.rgb, alpha ), 1.0 ) : vec4( diffuseColor.rgb, alpha );`,
      )
      .replace(
        "float alpha = opacity;",
        `float alpha = opacity;
        float capT = step( 1.0, abs( vUv.y ) );
        float dLine = mix( abs( vUv.x ), length( vec2( vUv.x, abs( vUv.y ) - 1.0 ) ), capT ) * 0.5 * ( linewidth + uPad );
        float dAA = max( fwidth( dLine ), 1e-4 );
        if ( uCapMode > 0.5 && capT > 0.5 ) {
          bool keepCap = vUv.y < 0.0 ? vSeg < 0.5 : vSeg > uLastSeg - 0.5;
          if ( ! keepCap ) discard;
        }
        alpha *= clamp( ( 0.5 * linewidth - dLine ) / dAA + 0.5, 0.0, 1.0 );`,
      );
  };
  m.customProgramCacheKey = () => "pewe-world-line";
  return m;
}

function noRaycast() {
  /* the sheet is not pickable */
}

// ---------------------------------------------------------------------------
// Markers: screen-aligned quads with a constant CSS-pixel size and an
// analytic (fwidth) edge, so they are crisp with or without MSAA.

const MARKER_VERT = /* glsl */ `
uniform vec2 uResolution;
uniform float uExtent;
uniform float uScale;
uniform vec3 uAvoid;
uniform vec2 uAvoidPx;
varying vec2 vPx;
varying float vFade;
void main() {
  vPx = position.xy * uExtent;
  vec4 clip = projectionMatrix * modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
  vFade = 1.0;
  if ( uAvoidPx.y > 0.0 ) {
    vec4 a = projectionMatrix * modelViewMatrix * vec4( uAvoid, 1.0 );
    if ( a.w > 0.0 && clip.w > 0.0 ) {
      vec2 d = ( clip.xy / clip.w - a.xy / a.w ) * 0.5 * uResolution;
      vFade = smoothstep( uAvoidPx.x * uScale, uAvoidPx.y * uScale, length( d ) );
    }
  }
  clip.xy += position.xy * uExtent * uScale * 2.0 / uResolution * clip.w;
  gl_Position = clip;
}
`;

const MARKER_FRAG = /* glsl */ `
uniform vec3 uHaloColor;
uniform float uHaloR;
uniform vec3 uRingColor;
uniform float uRingR;
uniform float uRingW;
uniform float uRingA;
uniform vec3 uDotColor;
uniform float uDotR;
uniform float uOpacity;
varying vec2 vPx;
varying float vFade;
float cover( float d, float aa ) { return clamp( 0.5 - d / aa, 0.0, 1.0 ); }
void main() {
  float r = length( vPx );
  float aa = max( fwidth( r ), 1e-3 );
  vec4 c = vec4( uHaloColor, 1.0 ) * ( uHaloR > 0.0 ? cover( r - uHaloR, aa ) : 0.0 );
  float ring = uRingA * cover( abs( r - uRingR ) - 0.5 * uRingW, aa );
  c = vec4( uRingColor, 1.0 ) * ring + c * ( 1.0 - ring );
  float centre = cover( r - uDotR, aa );
  c = vec4( uDotColor, 1.0 ) * centre + c * ( 1.0 - centre );
  float a = c.a * uOpacity * vFade;
  if ( a < 0.002 ) discard;
  gl_FragColor = vec4( c.rgb / c.a, a );
  #include <colorspace_fragment>
}
`;

interface MarkerStyle {
  haloR: number;
  ringR: number;
  ringW: number;
  ringA: number;
  ringColor: THREE.Color;
  dotR: number;
  dotColor: THREE.Color;
  /** Largest radius the marker can reach, px (sets the quad size). */
  extent: number;
  /** Fade out near Pewe on screen. */
  avoidPewe: boolean;
}

type MarkerUniforms = {
  uResolution: THREE.IUniform<THREE.Vector2>;
  uExtent: THREE.IUniform<number>;
  uScale: THREE.IUniform<number>;
  uAvoid: THREE.IUniform<THREE.Vector3>;
  uAvoidPx: THREE.IUniform<THREE.Vector2>;
  uHaloColor: THREE.IUniform<THREE.Color>;
  uHaloR: THREE.IUniform<number>;
  uRingColor: THREE.IUniform<THREE.Color>;
  uRingR: THREE.IUniform<number>;
  uRingW: THREE.IUniform<number>;
  uRingA: THREE.IUniform<number>;
  uDotColor: THREE.IUniform<THREE.Color>;
  uDotR: THREE.IUniform<number>;
  uOpacity: THREE.IUniform<number>;
};

interface Marker {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  uniforms: MarkerUniforms;
}

const _viewport = new THREE.Vector4();

function makeMarker(quad: THREE.BufferGeometry, style: MarkerStyle, paper: THREE.Color, resolution: THREE.Vector2): Marker {
  const uniforms: MarkerUniforms = {
    uResolution: { value: resolution },
    uExtent: { value: style.extent + 2 },
    uScale: { value: 1 },
    uAvoid: { value: new THREE.Vector3() },
    uAvoidPx: { value: style.avoidPewe ? new THREE.Vector2(...AVOID_PEWE_PX) : new THREE.Vector2(0, 0) },
    uHaloColor: { value: paper },
    uHaloR: { value: style.haloR },
    uRingColor: { value: style.ringColor },
    uRingR: { value: style.ringR },
    uRingW: { value: style.ringW },
    uRingA: { value: style.ringA },
    uDotColor: { value: style.dotColor },
    uDotR: { value: style.dotR },
    uOpacity: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: MARKER_VERT,
    fragmentShader: MARKER_FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  material.toneMapped = false;
  const mesh = new THREE.Mesh(quad, material);
  mesh.frustumCulled = false;
  mesh.raycast = noRaycast;
  // Keep the pixel size right even if setResolution() is never called.
  mesh.onBeforeRender = (renderer) => {
    renderer.getViewport(_viewport);
    if (_viewport.z > 0 && _viewport.w > 0) resolution.set(_viewport.z, _viewport.w);
  };
  return { mesh, material, uniforms };
}

// ---------------------------------------------------------------------------

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeInOutSine = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * u);

export function buildWorld(data: WorldData, origin: { lat: number; lng: number }): WorldHandle {
  const kx = M_PER_DEG_LNG * Math.cos(origin.lat * DEG);
  const kz = M_PER_DEG_LAT;
  const projX = (lng: number) => (lng - origin.lng) * kx;
  const projZ = (lat: number) => -(lat - origin.lat) * kz;

  const group = new THREE.Group();
  group.name = "world";
  // setOpacity() toggles this inner group, so group.visible stays the engine's.
  const sheet = new THREE.Group();
  sheet.name = "world-sheet";
  group.add(sheet);

  const paper = new THREE.Color(PAPER);
  const laterite = new THREE.Color(LATERITE);
  const ink = new THREE.Color(INK);
  const resolution = new THREE.Vector2(1280, 800);
  const lineMaterials: LineMaterial[] = [];
  const disposables: { dispose(): void }[] = [];

  const addSegments = (positions: number[], color: THREE.Color, width: number, order: number, name: string, minDevicePx = 0) => {
    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(positions);
    const material = makeLineMaterial(color, width, true, paper);
    const lines = new LineSegments2(geometry, material);
    lines.name = name;
    lines.renderOrder = order;
    lines.raycast = noRaycast;
    if (minDevicePx > 0) {
      // As LineSegments2 does (resolution from the viewport), plus a floor on
      // the width in device pixels so faint hairlines survive at DPR 1.
      lines.onBeforeRender = (renderer: THREE.WebGLRenderer) => {
        renderer.getViewport(_viewport);
        if (_viewport.z > 0 && _viewport.w > 0) material.resolution.set(_viewport.z, _viewport.w);
        material.linewidth = Math.max(width, minDevicePx / Math.max(renderer.getPixelRatio(), 0.5));
      };
    }
    sheet.add(lines);
    lineMaterials.push(material);
    disposables.push(geometry, material);
    return material;
  };

  // --- graticule (10 deg) and sheet frame, clipped to the bbox ---------------
  const [west, south, east, north] = data.bbox && data.bbox.length === 4 ? data.bbox : [18, -28, 102, 46];
  const seg = (lng0: number, lat0: number, lng1: number, lat1: number, out: number[]) =>
    out.push(projX(lng0), 0, projZ(lat0), projX(lng1), 0, projZ(lat1));
  const grid: number[] = [];
  for (let lng = Math.ceil(west / 10) * 10; lng < east; lng += 10) if (lng > west) seg(lng, south, lng, north, grid);
  for (let lat = Math.ceil(south / 10) * 10; lat < north; lat += 10) if (lat > south) seg(west, lat, east, lat, grid);
  // The neatline, graduated like a survey sheet: a tick every degree on the
  // inside of the frame, longer every 5 degrees.
  const frame: number[] = [];
  seg(west, south, east, south, frame);
  seg(east, south, east, north, frame);
  seg(east, north, west, north, frame);
  seg(west, north, west, south, frame);
  const tick = (deg: number) => (Math.round(deg) % 5 === 0 ? TICK_MAJOR : TICK_MINOR);
  for (let lng = Math.ceil(west) + (Number.isInteger(west) ? 1 : 0); lng < east; lng++) {
    seg(lng, south, lng, south + tick(lng), frame);
    seg(lng, north, lng, north - tick(lng), frame);
  }
  for (let lat = Math.ceil(south) + (Number.isInteger(south) ? 1 : 0); lat < north; lat++) {
    seg(west, lat, west + tick(lat), lat, frame);
    seg(east, lat, east - tick(lat), lat, frame);
  }
  const hairline = HAIRLINE_MIN_DEVICE_PX;
  if (grid.length) {
    addSegments(grid, inkOnPaper(INK, GRATICULE_INK), GRATICULE_WIDTH, RENDER_ORDER.graticule, "world-graticule", hairline);
  }
  addSegments(frame, inkOnPaper(INK, FRAME_INK), FRAME_WIDTH, RENDER_ORDER.frame, "world-frame", hairline);

  // --- coastlines ------------------------------------------------------------
  const coast: number[] = [];
  for (const line of data.lines ?? []) {
    for (let i = 0; i + 3 < line.length; i += 2) {
      coast.push(projX(line[i]), 0, projZ(line[i + 1]), projX(line[i + 2]), 0, projZ(line[i + 3]));
    }
  }
  if (coast.length) addSegments(coast, inkOnPaper(INK, COAST_INK), COAST_WIDTH, RENDER_ORDER.coast, "world-coast");

  // --- places ----------------------------------------------------------------
  const pewe = new THREE.Vector3(projX(PEWE.lng), 0, projZ(PEWE.lat));
  const cities: WorldCity[] = CITY_TABLE.map((c) => ({
    ...c,
    position: new THREE.Vector3(projX(c.lng), 0, projZ(c.lat)),
  }));

  // Framing: centre of the bbox of Pewe + cities, and the circle around it.
  const places = [pewe, ...cities.map((c) => c.position)];
  const center = new THREE.Box3().setFromPoints(places).getCenter(new THREE.Vector3()).setY(0);
  let reach = 0;
  for (const p of places) reach = Math.max(reach, p.distanceTo(center));
  const radius = reach * 1.06;

  // --- markers ---------------------------------------------------------------
  const quad = new THREE.PlaneGeometry(2, 2);
  disposables.push(quad);
  const markers: Marker[] = [];
  const addMarker = (style: MarkerStyle, at: THREE.Vector3, order: number, name: string) => {
    const m = makeMarker(quad, style, paper, resolution);
    m.mesh.name = name;
    m.mesh.position.copy(at);
    m.mesh.renderOrder = order;
    m.uniforms.uAvoid.value.subVectors(pewe, at);
    sheet.add(m.mesh);
    markers.push(m);
    disposables.push(m.material);
    return m;
  };

  for (const c of cities) {
    addMarker(
      {
        haloR: CITY.ringR + CITY.ringW / 2 + CITY.halo,
        ringR: CITY.ringR,
        ringW: CITY.ringW,
        ringA: 1,
        ringColor: ink,
        dotR: CITY.dotR,
        dotColor: ink,
        extent: CITY.ringR + CITY.ringW / 2 + CITY.halo,
        avoidPewe: true,
      },
      c.position,
      RENDER_ORDER.cities,
      `world-city-${c.id}`,
    );
  }

  // The halo holds the ring at its widest breath, so the breathing never
  // reaches past it into the coast or a neighbouring marker.
  const peweHalo = PEWE_MARK.ringR + PEWE_MARK.breathe + PEWE_MARK.ringW / 2 + PEWE_MARK.halo;
  const peweMarker = addMarker(
    {
      haloR: peweHalo,
      ringR: PEWE_MARK.ringR,
      ringW: PEWE_MARK.ringW,
      ringA: 1,
      ringColor: laterite,
      dotR: PEWE_MARK.dotR,
      dotColor: laterite,
      extent: peweHalo,
      avoidPewe: false,
    },
    pewe,
    RENDER_ORDER.pewe,
    "world-pewe",
  );

  // --- arcs ------------------------------------------------------------------
  const segments = ARC_POINTS - 1;
  // Sample i sits at t = arcT(i); segmentAt(t) inverts it for the moving head.
  const arcT = (i: number) => 0.5 - 0.5 * Math.cos((Math.PI * i) / segments);
  const segmentAt = (t: number) => Math.min(segments - 1, Math.floor((Math.acos(1 - 2 * t) * segments) / Math.PI));
  const arcs = cities.map((c) => {
    const dx = c.position.x - pewe.x;
    const dz = c.position.z - pewe.z;
    const length = Math.hypot(dx, dz) || 1;
    const height = ARC_HEIGHT * length;
    // sideways bow, to the right of travel, in the ground plane
    const [bowAmount, bowSymmetric] = ARC_BOW[c.id];
    const bow = bowAmount * length;
    const rx = -dz / length;
    const rz = dx / length;
    const points = new Float32Array(ARC_POINTS * 3);
    for (let i = 0; i < ARC_POINTS; i++) {
      const t = arcT(i);
      const arch = 4 * t * (1 - t); // peaks at t = 0.5
      const late = 6.75 * t * t * (1 - t); // peaks at t = 2/3
      const side = bow * (bowSymmetric * arch + (1 - bowSymmetric) * late);
      points[i * 3] = pewe.x + dx * t + rx * side;
      points[i * 3 + 1] = height * Math.pow(arch, ARC_LIFT_POWER);
      points[i * 3 + 2] = pewe.z + dz * t + rz * side;
    }
    const geometry = new LineGeometry();
    geometry.setPositions(points);
    const material = makeLineMaterial(laterite.clone(), ARC_WIDTH, false, paper);
    material.uniforms.uCapMode.value = CAPS_ENDS;
    const line = new Line2(geometry, material);
    line.name = `world-arc-${c.id}`;
    line.renderOrder = RENDER_ORDER.arcs;
    line.raycast = noRaycast;
    line.visible = false;
    sheet.add(line);
    lineMaterials.push(material);
    disposables.push(geometry, material);

    // The pen tip; once the arc has landed it stays as the city's laterite centre.
    const head = addMarker(
      {
        haloR: 0,
        ringR: 0,
        ringW: 0,
        ringA: 0,
        ringColor: laterite,
        dotR: HEAD.dotR,
        dotColor: laterite,
        extent: HEAD.dotR,
        avoidPewe: true,
      },
      pewe,
      RENDER_ORDER.heads,
      `world-arc-head-${c.id}`,
    );
    head.mesh.visible = false;

    const buffer = (geometry.attributes.instanceStart as THREE.InterleavedBufferAttribute).data as THREE.InstancedInterleavedBuffer;
    return { id: c.id, points, geometry, material, line, head, buffer, window: WORLD_ARC_TIMING[c.id], patched: -1 };
  });

  // --- state -----------------------------------------------------------------
  let opacity = 1;
  let progress = -1;
  let boost = 1;

  function applyOpacity() {
    sheet.visible = opacity > 0.002;
    for (const m of lineMaterials) m.opacity = opacity;
    for (const m of markers) m.uniforms.uOpacity.value = opacity;
  }

  function applyProgress() {
    for (const arc of arcs) {
      const [a, b] = arc.window;
      const f = easeInOutSine(clamp01((progress - a) / (b - a)));
      const arr = arc.buffer.array as Float32Array;
      const P = arc.points;
      if (arc.patched >= 0) {
        // put back the end point moved last time
        const k = arc.patched;
        arr[k * 6 + 3] = P[(k + 1) * 3];
        arr[k * 6 + 4] = P[(k + 1) * 3 + 1];
        arr[k * 6 + 5] = P[(k + 1) * 3 + 2];
        arc.patched = -1;
        arc.buffer.needsUpdate = true;
      }
      if (f <= 0) {
        arc.line.visible = false;
        arc.head.mesh.visible = false;
        continue;
      }
      // Whole segments up to the head, plus the head's segment cut at the head.
      // f runs evenly along the ground track (t), not over the samples.
      const k = segmentAt(f);
      const t0 = arcT(k);
      const u = Math.min(1, Math.max(0, (f - t0) / (arcT(k + 1) - t0)));
      const hx = P[k * 3] + (P[(k + 1) * 3] - P[k * 3]) * u;
      const hy = P[k * 3 + 1] + (P[(k + 1) * 3 + 1] - P[k * 3 + 1]) * u;
      const hz = P[k * 3 + 2] + (P[(k + 1) * 3 + 2] - P[k * 3 + 2]) * u;
      if (u < 1) {
        arr[k * 6 + 3] = hx;
        arr[k * 6 + 4] = hy;
        arr[k * 6 + 5] = hz;
        arc.patched = k;
        arc.buffer.needsUpdate = true;
      }
      arc.geometry.instanceCount = k + 1;
      arc.material.uniforms.uLastSeg.value = k;
      arc.line.visible = true;
      const head = arc.head;
      head.mesh.visible = true;
      head.mesh.position.set(hx, hy, hz);
      head.uniforms.uAvoid.value.subVectors(pewe, head.mesh.position);
    }
  }

  applyOpacity();

  const handle: WorldHandle = {
    group,
    pewe,
    cities,
    center,
    radius,
    setOpacity(o: number) {
      opacity = clamp01(o);
      applyOpacity();
    },
    setProgress(p: number) {
      const next = clamp01(p);
      if (next === progress) return;
      progress = next;
      applyProgress();
    },
    setResolution(w: number, h: number) {
      if (!(w > 0 && h > 0)) return;
      resolution.set(w, h);
      for (const m of lineMaterials) m.resolution.set(w, h);
    },
    update(t: number) {
      // A slow breath: the ring widens by 1.5 px, thinning and lightening a
      // little, then returns. One breath every 3.6 s.
      const s = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / PEWE_MARK.period);
      const u = peweMarker.uniforms;
      u.uRingR.value = PEWE_MARK.ringR + PEWE_MARK.breathe * s;
      u.uRingW.value = PEWE_MARK.ringW * (1 - 0.25 * s);
      u.uRingA.value = 1 - 0.2 * s;
    },
    setCameraDistance(d: number) {
      // 1 from ~400 km out, rising to 1.25 at 50 km and closer.
      const k = clamp01((Math.log(Math.max(d, 1)) - Math.log(5e4)) / (Math.log(4e5) - Math.log(5e4)));
      const next = 1.25 - 0.25 * k;
      if (next === boost) return;
      boost = next;
      for (const m of markers) m.uniforms.uScale.value = boost;
    },
    dispose() {
      group.removeFromParent();
      for (const d of disposables) d.dispose();
      group.clear();
    },
  };
  handle.setProgress(0);
  return handle;
}
