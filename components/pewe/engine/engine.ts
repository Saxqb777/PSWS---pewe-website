import * as THREE from "three";
import { loadMapData, Ground, type MapData, type XY } from "./data";
import { createUniforms, type SharedUniforms } from "./uniforms";
import { buildTerrain, houseIndex } from "./terrain";
import { buildWater } from "./water";
import { buildSky, buildSkyProbe } from "./sky";
import { buildVillage, type VillageHandle } from "./village";
import { padLandmarks, buildLandmarks, type Landmarks } from "./landmarks";
import { BusDriver } from "./bus";
import { CameraRig, orbitPosition, easeInOut, easeInOutSine } from "./camera";
import { Labels, type LabelClasses } from "./labels";
import { sunPosition, moonPosition, skyFor, seasonOf, seasonColours, peweClock, formatClock } from "./sun";
import { fetchWeather, weatherOverride, buildRain, CLEAR, type Weather } from "./weather";
import { PLACES, PLACE_BY_ID, MINOR_LABELS, HOME_VIEW, TOUR_LINES, type PlaceId, type PlaceView } from "../places";
import type { WorldHandle } from "./world";

export interface ClockInfo {
  time: string;
  tempC: number | null;
  label: string;
  live: boolean;
  night: boolean;
}

export interface EngineOptions {
  lowPower: boolean;
  reducedMotion: boolean;
  portrait: boolean;
  labelRoot: HTMLElement;
  labelClasses: LabelClasses;
  timeOverride?: Date | null;
  monthOverride?: number | null;
  weatherOverride?: string | null;
  onSelect(id: PlaceId): void;
  onClock?(c: ClockInfo): void;
  onProgress?(p: number): void;
  /** test hook: exposes the scene on window.__pewe */
  debug?: boolean;
}

export type TourLine = (line: string | null, progress: number) => void;

export interface PeweEngine {
  playIntro(kind: "full" | "short" | "none"): Promise<void>;
  flyTo(id: PlaceId | "home", opts?: { fast?: boolean }): Promise<void>;
  focus(id: PlaceId | null): void;
  tour(onLine: TourLine): Promise<"done" | "cancelled">;
  cancelTour(): void;
  setTime(date: Date | null): void;
  resize(): void;
  dispose(): void;
}

const CANCEL = Symbol("cancel");
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
};
const lerpAngle = (a: number, b: number, t: number) => {
  const d = ((((b - a) % 360) + 540) % 360) - 180;
  return a + d * t;
};

interface Tween {
  t: number;
  dur: number;
  fn: (e: number) => void;
  ease: (t: number) => number;
  resolve: () => void;
}

export async function createEngine(canvas: HTMLCanvasElement, opts: EngineOptions): Promise<PeweEngine> {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", alpha: false });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, opts.lowPower ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const ctx = { anisotropy: Math.min(renderer.capabilities.getMaxAnisotropy(), 8), lowPower: opts.lowPower };

  opts.onProgress?.(0.1);
  const data: MapData = await loadMapData();
  opts.onProgress?.(0.35);
  const ground = new Ground(data);
  padLandmarks(ground, data);
  const P = data.village.places;
  const U: SharedUniforms = createUniforms();

  const scene = new THREE.Scene();
  const fog = new THREE.Fog("#cfd6d6", 1800, 12000);
  scene.fog = fog;

  /* light */
  const sunLight = new THREE.DirectionalLight("#fff1dc", 3);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(opts.lowPower ? 1024 : 2048, opts.lowPower ? 1024 : 2048);
  sunLight.shadow.bias = -0.00035;
  scene.add(sunLight, sunLight.target);
  const hemi = new THREE.HemisphereLight("#dfe8ee", "#6b5a48", 0.9);
  scene.add(hemi);

  /* land, water, sky */
  const terrain = buildTerrain(
    ground,
    data,
    U,
    houseIndex([...data.village.houses, ...(["building", "haveli", "school", "busstop"] as const).map((k) => [P[k][0], P[k][1], 0] as [number, number, number])]),
  );
  scene.add(terrain.inner, terrain.outer);
  const water = buildWater(U);
  scene.add(water.mesh);
  const sky = buildSky(U);
  scene.add(sky.mesh);
  const probe = buildSkyProbe(U, sky.uniforms);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT: THREE.WebGLRenderTarget | null = null;
  opts.onProgress?.(0.55);

  /* village + landmarks */
  const startClock = peweClock(opts.timeOverride ?? new Date());
  const month = opts.monthOverride ?? startClock.month;
  const village: VillageHandle = buildVillage(ground, data, U, { lowPower: opts.lowPower, month });
  scene.add(village.group);
  opts.onProgress?.(0.75);
  let landmarks: Landmarks | null = null;
  let bus: BusDriver | null = null;
  try {
    landmarks = buildLandmarks(ground, data, ctx);
    scene.add(landmarks.group);
    bus = new BusDriver(ground, data.village.busRoute, P.busstop, landmarks.bus);
  } catch (e) {
    console.error("landmarks failed", e);
  }
  const rain = buildRain(opts.lowPower);
  scene.add(rain.object);
  opts.onProgress?.(0.9);

  /* camera + labels */
  const rig = new CameraRig(canvas, ground, opts.portrait);
  const camera = rig.camera;
  const anchorXY = (a: string | [number, number]): XY => (typeof a === "string" ? P[a] : a);
  const anchor3 = (a: string | [number, number], h: number) => {
    const [x, y] = anchorXY(a);
    return new THREE.Vector3(x, ground.height(x, y) + h, -y);
  };
  const labels = new Labels(opts.labelRoot, opts.labelClasses, ground, (id) => opts.onSelect(id as PlaceId));
  for (const p of PLACES) labels.add(p.id, "major", p.tag, anchor3(p.anchor, p.anchorHeight), { far: p.id === "roads" ? 4200 : 3600 });
  for (const m of MINOR_LABELS) labels.add(`minor-${m.text}`, "minor", m.text, anchor3(m.anchor, m.height), { far: m.far ?? 2600 });

  const portraitFactor = () => (camera.aspect < 0.8 ? 1.45 : camera.aspect < 1.1 ? 1.2 : 1);
  function poseFor(view: PlaceView, anchor: string | [number, number]) {
    const [tx, ty] = view.target ?? anchorXY(anchor);
    const target = new THREE.Vector3(tx, ground.height(tx, ty) + view.lookHeight, -ty);
    const pos = orbitPosition(target, view.az, view.el, view.dist * portraitFactor());
    return { pos, target };
  }

  /* tweens */
  const tweens: Tween[] = [];
  const tween = (dur: number, fn: (e: number) => void, ease: (t: number) => number = easeInOut) =>
    new Promise<void>((resolve) => {
      if (dur <= 0) {
        fn(1);
        resolve();
        return;
      }
      tweens.push({ t: 0, dur, fn, ease, resolve });
    });
  const wait = (s: number) => tween(s, () => {});
  const clearTweens = () => {
    const list = tweens.splice(0);
    list.forEach((tw) => {
      tw.fn(1);
      tw.resolve();
    });
  };

  /* time, weather, season */
  let timeOverride: Date | null = opts.timeOverride ?? null;
  let weather: Weather = weatherOverride(opts.weatherOverride ?? null) ?? CLEAR;
  const weatherFixed = !!weatherOverride(opts.weatherOverride ?? null);
  let lastEnvKey = "";
  const sunDir = new THREE.Vector3();
  const lightDir = new THREE.Vector3();
  let nightNow = 0;
  const season = seasonColours(seasonOf(month));
  U.uField.value.setRGB(...season.field, THREE.SRGBColorSpace);
  U.uFieldMix.value = season.fieldMix;
  U.uForestTint.value.setRGB(...season.forest, THREE.SRGBColorSpace);
  water.material.color.setRGB(...season.water, THREE.SRGBColorSpace);

  function dirFrom(az: number, el: number, out: THREE.Vector3) {
    const a = (az * Math.PI) / 180;
    const e = (el * Math.PI) / 180;
    return out.set(Math.cos(e) * Math.sin(a), Math.sin(e), -Math.cos(e) * Math.cos(a));
  }

  function updateSky() {
    const date = timeOverride ?? new Date();
    const { elevation, azimuth } = sunPosition(date);
    const s = skyFor(elevation, weather.cloud, weather.rain);
    dirFrom(azimuth, elevation, sunDir);
    const moon = elevation < -3;
    if (moon) {
      const m = moonPosition(azimuth);
      dirFrom(m.azimuth, m.elevation, lightDir);
    } else dirFrom(azimuth, Math.max(elevation, 3), lightDir);
    sunLight.color.setRGB(...s.sun, THREE.SRGBColorSpace);
    sunLight.intensity = moon ? 0.95 * (1 - weather.cloud * 0.6) : s.sunI;
    hemi.color.setRGB(...s.hemiSky, THREE.SRGBColorSpace);
    hemi.groundColor.setRGB(...s.hemiGround, THREE.SRGBColorSpace);
    hemi.intensity = s.hemiI;
    sky.uniforms.uZenith.value.set(...s.zenith);
    sky.uniforms.uHorizon.value.set(...s.horizon);
    sky.uniforms.uGround.value.set(s.horizon[0] * 0.8, s.horizon[1] * 0.8, s.horizon[2] * 0.8);
    sky.uniforms.uSunDir.value.copy(sunDir);
    sky.uniforms.uSunColor.value.set(...s.sun);
    sky.uniforms.uSunGlow.value = elevation > -5 ? 1 - weather.cloud * 0.85 : 0;
    sky.uniforms.uStars.value = s.stars;
    fog.color.setRGB(...s.horizon, THREE.SRGBColorSpace);
    U.uNight.value = s.night;
    nightNow = s.night;
    village.setNight(s.night);
    landmarks?.setNight(s.night);
    renderer.toneMappingExposure = 1.12 + s.night * 0.45;
    const key = `${Math.round(elevation / 3)}|${weather.cloud.toFixed(1)}|${weather.rain}`;
    if (key !== lastEnvKey) {
      lastEnvKey = key;
      const rt = pmrem.fromScene(probe.scene, 0, 0.1, 100);
      envRT?.dispose();
      envRT = rt;
      scene.environment = rt.texture;
      scene.environmentIntensity = 0.35 + (1 - s.night) * 0.35;
    }
    opts.onClock?.({
      time: formatClock(date),
      tempC: weather.tempC,
      label: weather.label,
      live: !timeOverride,
      night: s.night > 0.5,
    });
  }

  let weatherTimer = 0;
  const weatherAbort = new AbortController();
  async function refreshWeather() {
    if (weatherFixed) return;
    try {
      weather = await fetchWeather(weatherAbort.signal);
      lastEnvKey = "";
      updateSky();
    } catch {
      /* offline or blocked: keep the last known sky */
    }
  }

  /* world finale (loaded on first use) */
  let world: WorldHandle | null = null;
  let worldMode = false;
  async function ensureWorld() {
    if (world) return world;
    const [mod, wd] = await Promise.all([import("./world"), fetch("/map/world.json").then((r) => r.json())]);
    world = mod.buildWorld(wd, data.village.origin);
    world.group.visible = false;
    world.setOpacity(0);
    world.setProgress(0);
    world.setResolution(canvas.clientWidth, canvas.clientHeight);
    scene.add(world.group);
    labels.add("world-pewe", "city", "Pewe", world.pewe.clone().setY(0));
    for (const c of world.cities) labels.add(`city-${c.id}`, "city", c.name, c.position.clone());
    return world;
  }
  const landObjects = () => [terrain.inner, terrain.outer, water.mesh, village.group, landmarks?.group, rain.object].filter(Boolean) as THREE.Object3D[];
  function setLandVisible(v: boolean) {
    for (const o of landObjects()) o.visible = v;
    if (v) water.setRise(U.uRise.value);
  }

  function fitDistance(radius: number) {
    const v = (camera.fov * Math.PI) / 180;
    const h = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
    return (radius / Math.tan(Math.min(v, h) / 2)) * 1.08;
  }

  async function worldOut(dur: number) {
    const w = await ensureWorld();
    w.group.visible = true;
    worldMode = true;
    rig.worldMode = true;
    const p0 = camera.position.clone();
    const t0 = rig.controls.target.clone();
    const off = p0.clone().sub(t0);
    const d0 = off.length();
    const el0 = (Math.asin(off.y / d0) * 180) / Math.PI;
    const az0 = (Math.atan2(off.x, -off.z) * 180) / Math.PI;
    const tEnd = w.center.clone();
    const dEnd = fitDistance(w.radius);
    const tg = new THREE.Vector3();
    await rig.drive((_dt, t) => {
      const k = Math.min(t / dur, 1);
      const e = easeInOutSine(k);
      const d = Math.exp(Math.log(d0) + (Math.log(dEnd) - Math.log(d0)) * e);
      tg.lerpVectors(t0, tEnd, smooth(0.15, 0.95, e));
      const pos = orbitPosition(tg, lerpAngle(az0, 190, e), el0 + (66 - el0) * e, d);
      U.uSurvey.value = smooth(7000, 32000, d);
      const wo = smooth(30000, 260000, d);
      w.setOpacity(wo);
      labels.worldMode = wo > 0.5;
      w.setCameraDistance(d);
      setLandVisible(d < 140000);
      if (d > 20000) {
        fog.near = 1e9;
        fog.far = 2e9;
      }
      return k >= 1 ? null : { pos, target: tg.clone() };
    });
    await tween(2.8, (e) => w.setProgress(e), easeInOutSine);
  }

  async function worldIn(dur: number, to = poseFor(HOME_VIEW, HOME_VIEW.target!)) {
    if (!world || !worldMode) return;
    const w = world;
    const p0 = camera.position.clone();
    const t0 = rig.controls.target.clone();
    const off = p0.clone().sub(t0);
    const d0 = off.length();
    const el0 = (Math.asin(off.y / d0) * 180) / Math.PI;
    const az0 = (Math.atan2(off.x, -off.z) * 180) / Math.PI;
    const toOff = to.pos.clone().sub(to.target);
    const d1 = toOff.length();
    const el1 = (Math.asin(toOff.y / d1) * 180) / Math.PI;
    const az1 = (Math.atan2(toOff.x, -toOff.z) * 180) / Math.PI;
    const tg = new THREE.Vector3();
    await rig.drive((_dt, t) => {
      const k = Math.min(t / dur, 1);
      const e = easeInOutSine(k);
      const d = Math.exp(Math.log(d0) + (Math.log(d1) - Math.log(d0)) * e);
      tg.lerpVectors(t0, to.target, smooth(0.05, 0.85, e));
      const pos = orbitPosition(tg, lerpAngle(az0, az1, e), el0 + (el1 - el0) * e, d);
      U.uSurvey.value = smooth(7000, 32000, d);
      const wo = smooth(30000, 260000, d);
      w.setOpacity(wo);
      w.setProgress(Math.min(1, wo * 1.5));
      labels.worldMode = wo > 0.5;
      w.setCameraDistance(d);
      setLandVisible(d < 140000);
      return k >= 1 ? null : { pos, target: tg.clone() };
    });
    U.uSurvey.value = 0;
    w.group.visible = false;
    w.setOpacity(0);
    worldMode = false;
    rig.worldMode = false;
    labels.worldMode = false;
    setLandVisible(true);
  }

  /* focus effects */
  let focused: PlaceId | null = null;
  let flowTarget = 0;
  let flowNow = 0;
  let roadNow = 0;
  let roadTarget = 0;
  function focus(id: PlaceId | null) {
    focused = id;
    labels.setActive(id);
    flowTarget = id === "water" ? 1 : 0;
    roadTarget = id === "roads" ? 1 : 0;
    if (id === "roads") roadNow = 0;
  }

  /* picking the 3D landmarks themselves */
  const ray = new THREE.Raycaster();
  let down: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
  const onUp = (e: PointerEvent) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 || !landmarks || worldMode) return;
    const r = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    for (const [id, obj] of Object.entries(landmarks.pick)) {
      if (ray.intersectObject(obj, true).length) {
        opts.onSelect(id as PlaceId);
        return;
      }
    }
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);

  /* size */
  let width = 1;
  let height = 1;
  function resize() {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    rig.setPortrait(height > width);
    camera.updateProjectionMatrix();
    world?.setResolution(width, height);
  }
  resize();

  /* start: the survey sheet, seen from straight above */
  U.uSurvey.value = 1;
  U.uRise.value = 0;
  U.uGrow.value = 0;
  U.uReveal.value = 0;
  water.setRise(0);
  const startTarget = new THREE.Vector3(-10, 0, -250);
  rig.set(orbitPosition(startTarget, 335, 89, 3900 * portraitFactor()), startTarget);
  updateSky();
  void refreshWeather();

  /* loop */
  let raf = 0;
  let last = performance.now();
  let clockT = 0;
  let elapsed = 0;
  let slowFor = 0;
  const shadowCam = sunLight.shadow.camera;
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    elapsed += dt;
    U.uTime.value = elapsed;

    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t = Math.min(tw.t + dt / tw.dur, 1);
      tw.fn(tw.ease(tw.t));
      if (tw.t >= 1) {
        tweens.splice(i, 1);
        tw.resolve();
      }
    }
    rig.update(dt);

    flowNow += (flowTarget - flowNow) * Math.min(1, dt * (flowTarget ? 0.6 : 3));
    village.setFlow(flowNow);
    if (roadTarget) roadNow = Math.min(1, roadNow + dt / 3.2);
    else roadNow = Math.max(0, roadNow - dt * 2);
    village.setRoadDraw(roadNow);

    bus?.update(dt);
    landmarks?.update(elapsed, dt);
    village.update(elapsed);
    water.setRise(U.uRise.value);
    if (worldMode && world) world.update(elapsed);

    sky.follow(camera);
    const tg = rig.controls.target;
    const dist = camera.position.distanceTo(tg);
    if (!worldMode) {
      fog.near = 1500 + dist * 0.6;
      fog.far = fog.near + 9500 + dist * 2.6;
    }
    const half = THREE.MathUtils.clamp(dist * 0.62, 70, 1150);
    shadowCam.left = -half;
    shadowCam.right = half;
    shadowCam.top = half;
    shadowCam.bottom = -half;
    shadowCam.near = 10;
    shadowCam.far = 7000;
    shadowCam.updateProjectionMatrix();
    sunLight.shadow.normalBias = half * 0.0016;
    sunLight.position.copy(tg).addScaledVector(lightDir, 3200);
    sunLight.target.position.copy(tg);
    sunLight.target.updateMatrixWorld();
    sunLight.castShadow = U.uRise.value > 0.98 && !worldMode;

    const raining = weather.rain && !worldMode && U.uRise.value > 0.9;
    rain.object.visible = raining;
    if (raining) {
      rain.uniforms.uTime.value = elapsed;
      rain.uniforms.uCenter.value.copy(camera.position).lerp(tg, 0.55);
      rain.uniforms.uSize.value.set(Math.min(dist * 0.9, 420), Math.min(dist * 0.6, 260), Math.min(dist * 0.9, 420));
      rain.uniforms.uOpacity.value = 0.32 - nightNow * 0.12;
    }

    // no tags on the survey sheet; they arrive once the land has risen
    labels.enabled = worldMode || (U.uRise.value > 0.95 && U.uSurvey.value < 0.25);
    labels.update(camera, width, height, dt, dist, focused);
    renderer.render(scene, camera);

    clockT += dt;
    if (clockT > 1) {
      clockT = 0;
      updateSky();
    }
    weatherTimer += dt;
    if (weatherTimer > 900) {
      weatherTimer = 0;
      void refreshWeather();
    }
    // keep it smooth on weaker machines
    if (dt > 0.042) slowFor += dt;
    else slowFor = Math.max(0, slowFor - dt * 0.5);
    if (slowFor > 2.5 && pixelRatio > 1) {
      pixelRatio = Math.max(1, pixelRatio - 0.25);
      renderer.setPixelRatio(pixelRatio);
      resize();
      slowFor = 0;
    }
  }
  raf = requestAnimationFrame(frame);
  opts.onProgress?.(1);
  if (opts.debug) (window as unknown as { __pewe: unknown }).__pewe = { scene, camera, rig, U, getWorld: () => world, isWorld: () => worldMode };

  /* intro */
  function setFinal() {
    U.uSurvey.value = 0;
    U.uRise.value = 1;
    U.uGrow.value = 1;
    U.uReveal.value = 1e6;
  }
  async function playIntro(kind: "full" | "short" | "none") {
    const home = poseFor(HOME_VIEW, HOME_VIEW.target!);
    if (kind === "none" || opts.reducedMotion) {
      setFinal();
      rig.set(home.pos, home.target);
      return;
    }
    const k = kind === "full" ? 1 : 0.55;
    await tween(1.9 * k, (e) => (U.uReveal.value = e * 4200), (t) => t);
    const fly = rig.fly(home.pos, home.target, 4.4 * k, { lift: 0, ease: easeInOutSine });
    const rise = tween(3.4 * k, (e) => (U.uRise.value = e), easeInOutSine);
    const colour = wait(0.5 * k).then(() => tween(2.6 * k, (e) => (U.uSurvey.value = 1 - e)));
    const grow = wait(2.2 * k).then(() => tween(2.8 * k, (e) => (U.uGrow.value = e), (t) => t));
    await Promise.all([fly, rise, colour, grow]);
    setFinal();
  }

  async function flyTo(id: PlaceId | "home", o: { fast?: boolean } = {}) {
    const pose = id === "home" ? poseFor(HOME_VIEW, HOME_VIEW.target!) : poseFor(PLACE_BY_ID[id].view, PLACE_BY_ID[id].anchor);
    if (worldMode && id !== "world") {
      await worldIn(o.fast || opts.reducedMotion ? 0.01 : 3.6, pose);
      return;
    }
    const span = camera.position.distanceTo(pose.pos);
    const dur = o.fast || opts.reducedMotion ? 0 : THREE.MathUtils.clamp(1.5 + span / 1300, 1.8, 3.8);
    await rig.fly(pose.pos, pose.target, dur);
    if (id === "world") await worldOut(opts.reducedMotion ? 0.01 : 4.8);
  }

  /* the guided tour */
  let tourToken: { cancelled: boolean } | null = null;
  async function tour(onLine: TourLine): Promise<"done" | "cancelled"> {
    const tk = { cancelled: false };
    tourToken = tk;
    const check = () => {
      if (tk.cancelled) throw CANCEL;
    };
    const say = (key: keyof typeof TOUR_LINES, p: number) => onLine(TOUR_LINES[key], p);
    const go = async (id: PlaceId, dur: number) => {
      const pose = poseFor(PLACE_BY_ID[id].view, PLACE_BY_ID[id].anchor);
      await rig.fly(pose.pos, pose.target, dur);
      check();
    };
    try {
      focus(null);
      if (worldMode) await worldIn(2);
      setFinal();
      // 1. dive across the creek and the paddy to the Community Building
      say("arrive", 0.03);
      const B = PLACE_BY_ID.building;
      const bPose = poseFor(B.view, B.anchor);
      const pathXYH: [number, number, number][] = [
        [-760, 420, 360],
        [-320, 170, 90],
        [-175, 70, 24],
      ];
      const pts = [camera.position.clone(), ...pathXYH.map(([x, y, h]) => new THREE.Vector3(x, ground.height(x, y) + h, -y)), bPose.pos];
      const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
      const tStart = rig.controls.target.clone();
      const diveDur = 7.2;
      await rig.drive((_dt, t) => {
        const k = Math.min(t / diveDur, 1);
        const e = easeInOutSine(k);
        return k >= 1 ? null : { pos: curve.getPoint(e), target: tStart.clone().lerp(bPose.target, smooth(0, 0.8, e)) };
      });
      check();
      say("building", 0.13);
      const orbitDur = 6;
      await rig.drive((_dt, t) => {
        const k = Math.min(t / orbitDur, 1);
        const e = easeInOutSine(k);
        const pos = orbitPosition(bPose.target, 292 - 88 * e, 13 + 5 * e, B.view.dist * portraitFactor() * (1 - 0.15 * e));
        return k >= 1 ? null : { pos, target: bPose.target };
      });
      check();
      // 2. the red ST bus comes down the valley road to the stop
      if (bus) {
        say("bus", 0.25);
        bus.teleport(Math.max(0, bus.stopS - 130), 1);
        const run = bus.runTo(bus.stopS, 13);
        let arrived = false;
        void run.then(() => (arrived = true));
        const camPos = camera.position.clone();
        const look = rig.controls.target.clone();
        await rig.drive((dt, t) => {
          if (tk.cancelled) return null;
          const f = bus!.forward;
          const left = new THREE.Vector3(f.z, 0, -f.x);
          const want = bus!.pos.clone().addScaledVector(f, -26).addScaledVector(left, 7).add(new THREE.Vector3(0, 9, 0));
          const wantLook = bus!.pos.clone().addScaledVector(f, 22).add(new THREE.Vector3(0, 2, 0));
          const a = 1 - Math.exp(-dt * (t < 1.2 ? 1.6 : 3.2));
          camPos.lerp(want, a);
          look.lerp(wantLook, a);
          return (arrived && t > 2) || t > 12 ? null : { pos: camPos.clone(), target: look.clone() };
        });
        check();
      }
      // 3. the Haveli, from the stop
      say("haveli", 0.36);
      await go("haveli", 2.6);
      await wait(2.6);
      check();
      bus?.release();
      // 4. water down from the hill tanks
      say("water", 0.47);
      await go("water", 3.2);
      focus("water");
      await wait(3.8);
      check();
      focus(null);
      // 5. roads drawing themselves
      say("roads", 0.58);
      await go("roads", 3.2);
      focus("roads");
      await wait(3.6);
      check();
      focus(null);
      // 6. the school
      say("school", 0.68);
      await go("school", 3.2);
      await wait(2.4);
      check();
      // 7. the fields: Zakat
      say("fields", 0.78);
      await go("fields", 3.0);
      await wait(3.2);
      check();
      // 8. along the creek and out to the world
      say("world", 0.88);
      await go("world", 3.0);
      await worldOut(5.6);
      check();
      await wait(2.6);
      check();
      await worldIn(5.2);
      check();
      say("end", 1);
      await wait(2.2);
      onLine(null, 1);
      return "done";
    } catch (e) {
      if (e === CANCEL) return "cancelled";
      throw e;
    } finally {
      if (tourToken === tk) tourToken = null;
    }
  }

  function cancelTour() {
    if (!tourToken) return;
    tourToken.cancelled = true;
    rig.cancel();
    clearTweens();
    bus?.release();
    focus(null);
    setFinal();
    if (worldMode && world) {
      world.group.visible = false;
      world.setOpacity(0);
      worldMode = false;
      rig.worldMode = false;
      labels.worldMode = false;
      U.uSurvey.value = 0;
      setLandVisible(true);
      const home = poseFor(HOME_VIEW, HOME_VIEW.target!);
      rig.set(home.pos, home.target);
    }
  }

  return {
    playIntro,
    flyTo,
    focus,
    tour,
    cancelTour,
    setTime(date) {
      timeOverride = date;
      updateSky();
    },
    resize,
    dispose() {
      cancelAnimationFrame(raf);
      weatherAbort.abort();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      rig.controls.dispose();
      labels.dispose();
      terrain.dispose();
      water.dispose();
      sky.dispose();
      probe.dispose();
      village.dispose();
      landmarks?.dispose();
      rain.dispose();
      world?.dispose();
      envRT?.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
