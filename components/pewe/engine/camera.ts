import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Ground } from "./data";

/**
 * The camera: free to drag and pinch when you explore, flown on slow,
 * weighted arcs between places, and driven frame by frame during the tour.
 */

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

/** Camera position for a bearing/elevation/distance around a target (three coords). */
export function orbitPosition(target: THREE.Vector3, az: number, el: number, dist: number, out = new THREE.Vector3()) {
  const a = (az * Math.PI) / 180;
  const e = (el * Math.PI) / 180;
  return out.set(
    target.x + dist * Math.cos(e) * Math.sin(a),
    target.y + dist * Math.sin(e),
    target.z - dist * Math.cos(e) * Math.cos(a),
  );
}

export type Driver = (dt: number, t: number) => { pos: THREE.Vector3; target: THREE.Vector3; fov?: number } | null;

interface Flight {
  p0: THREE.Vector3;
  p1: THREE.Vector3;
  c: THREE.Vector3;
  t0: THREE.Vector3;
  t1: THREE.Vector3;
  fov0: number;
  fov1: number;
  dur: number;
  t: number;
  ease: (t: number) => number;
  resolve: () => void;
}

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  private flight: Flight | null = null;
  private driver: { fn: Driver; t: number; resolve: () => void } | null = null;
  private baseFov: number;
  private _world = false;
  /** world mode lifts the ground clamp and the distance limits */
  get worldMode() {
    return this._world;
  }
  set worldMode(on: boolean) {
    this._world = on;
    this.controls.minDistance = on ? 20000 : 28;
    this.controls.maxDistance = on ? 2.4e7 : 4200;
    this.controls.maxPolarAngle = on ? 1.2 : 1.36;
  }

  constructor(
    canvas: HTMLCanvasElement,
    private ground: Ground,
    portrait: boolean,
  ) {
    this.baseFov = portrait ? 50 : 38;
    this.camera = new THREE.PerspectiveCamera(this.baseFov, 1, 1, 30000);
    this.controls = new OrbitControls(this.camera, canvas);
    const c = this.controls;
    c.enableDamping = true;
    c.dampingFactor = 0.075;
    c.rotateSpeed = 0.45;
    c.zoomSpeed = 0.85;
    c.panSpeed = 0.9;
    c.screenSpacePanning = false;
    c.minDistance = 28;
    c.maxDistance = 4200;
    c.minPolarAngle = 0.12;
    c.maxPolarAngle = 1.36;
    c.zoomToCursor = true;
    c.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  }

  get busy() {
    return !!this.flight || !!this.driver;
  }

  setPortrait(portrait: boolean) {
    this.baseFov = portrait ? 50 : 38;
    if (!this.busy) {
      this.camera.fov = this.baseFov;
      this.camera.updateProjectionMatrix();
    }
  }

  get fov() {
    return this.baseFov;
  }

  set(pos: THREE.Vector3, target: THREE.Vector3) {
    this.camera.position.copy(pos);
    this.controls.target.copy(target);
    this.camera.lookAt(target);
    this.controls.update();
  }

  /** Fly on an arc. Long hops lift high so you see the land pass beneath. */
  fly(pos: THREE.Vector3, target: THREE.Vector3, dur: number, opts: { lift?: number; fov?: number; ease?: (t: number) => number } = {}) {
    this.cancel();
    const p0 = this.camera.position.clone();
    const t0 = this.controls.target.clone();
    const span = p0.distanceTo(pos);
    const mid = p0.clone().add(pos).multiplyScalar(0.5);
    const lift = opts.lift ?? Math.min(span * 0.32, 1100);
    mid.y = Math.max(mid.y, Math.max(p0.y, pos.y)) + lift;
    if (dur <= 0) {
      this.set(pos, target);
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.controls.enabled = false;
      this.flight = {
        p0,
        p1: pos.clone(),
        c: mid,
        t0,
        t1: target.clone(),
        fov0: this.camera.fov,
        fov1: opts.fov ?? this.baseFov,
        dur,
        t: 0,
        ease: opts.ease ?? easeInOut,
        resolve,
      };
    });
  }

  /** Hand the camera to a per-frame function until it returns null. */
  drive(fn: Driver) {
    this.cancel();
    this.controls.enabled = false;
    return new Promise<void>((resolve) => {
      this.driver = { fn, t: 0, resolve };
    });
  }

  cancel() {
    if (this.flight) {
      const r = this.flight.resolve;
      this.flight = null;
      r();
    }
    if (this.driver) {
      const r = this.driver.resolve;
      this.driver = null;
      r();
    }
    this.controls.enabled = true;
  }

  update(dt: number) {
    const cam = this.camera;
    if (this.flight) {
      const f = this.flight;
      f.t = Math.min(f.t + dt / f.dur, 1);
      const e = f.ease(f.t);
      const u = 1 - e;
      cam.position.set(
        u * u * f.p0.x + 2 * u * e * f.c.x + e * e * f.p1.x,
        u * u * f.p0.y + 2 * u * e * f.c.y + e * e * f.p1.y,
        u * u * f.p0.z + 2 * u * e * f.c.z + e * e * f.p1.z,
      );
      this.controls.target.lerpVectors(f.t0, f.t1, e);
      cam.fov = f.fov0 + (f.fov1 - f.fov0) * e;
      cam.lookAt(this.controls.target);
      if (f.t >= 1) {
        this.flight = null;
        this.controls.enabled = true;
        f.resolve();
      }
    } else if (this.driver) {
      const d = this.driver;
      d.t += dt;
      const r = d.fn(dt, d.t);
      if (!r) {
        this.driver = null;
        this.controls.enabled = true;
        d.resolve();
      } else {
        cam.position.copy(r.pos);
        this.controls.target.copy(r.target);
        if (r.fov) cam.fov = r.fov;
        cam.lookAt(r.target);
      }
    } else {
      this.controls.update();
    }

    if (!this.worldMode) {
      // stay above the land, keep the target on it, and inside the valley
      const tg = this.controls.target;
      tg.x = THREE.MathUtils.clamp(tg.x, -1150, 1050);
      tg.z = THREE.MathUtils.clamp(tg.z, -1400, 850);
      const gh = this.ground.height(cam.position.x, -cam.position.z);
      if (cam.position.y < gh + 6) cam.position.y = gh + 6;
    }
    const dist = cam.position.distanceTo(this.controls.target);
    const altitude = Math.max(cam.position.y, 1);
    cam.near = THREE.MathUtils.clamp(Math.min(dist, altitude) * 0.004, 0.4, 4000);
    cam.far = THREE.MathUtils.clamp(Math.max(dist, altitude) * 30 + 22000, 26000, 4e7);
    cam.updateProjectionMatrix();
  }
}
