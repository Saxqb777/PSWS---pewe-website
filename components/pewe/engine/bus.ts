import * as THREE from "three";
import { Ground, type XY, resample } from "./data";
import type { ModelHandle } from "./types";

/**
 * The red ST bus. It runs the valley road on its own, end to end, stopping
 * at the stop in front of the Haveli; the tour can take it over for a run.
 * It keeps to the left, as in India.
 */
interface RoutePoint {
  x: number;
  y: number;
  s: number;
}

export class BusDriver {
  private pts: RoutePoint[];
  readonly length: number;
  readonly stopS: number;
  s = 0;
  private dir: 1 | -1 = 1;
  private speed = 0;
  private wait = 3;
  private waitedAtStop = false;
  private script: { to: number; max: number; resolve: () => void } | null = null;
  private wheels: THREE.Object3D[];
  readonly pos = new THREE.Vector3();
  readonly forward = new THREE.Vector3(0, 0, 1);

  constructor(
    private ground: Ground,
    route: XY[],
    stop: XY,
    private model: ModelHandle,
  ) {
    const r = resample(route, 2);
    let s = 0;
    this.pts = r.map(([x, y], i) => {
      if (i > 0) s += Math.hypot(x - r[i - 1][0], y - r[i - 1][1]);
      return { x, y, s };
    });
    this.length = s;
    let best = 0;
    let bd = Infinity;
    for (const p of this.pts) {
      const d = Math.hypot(p.x - stop[0], p.y - stop[1]);
      if (d < bd) {
        bd = d;
        best = p.s;
      }
    }
    this.stopS = best;
    this.s = Math.max(0, this.stopS - 420);
    this.model.group.rotation.order = "YXZ";
    this.wheels = (this.model.group.userData.wheels as THREE.Object3D[] | undefined) ?? [];
    this.place();
  }

  private at(s: number): { x: number; y: number; dx: number; dy: number } {
    s = THREE.MathUtils.clamp(s, 0, this.length);
    let lo = 0;
    let hi = this.pts.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.pts[mid].s <= s) lo = mid;
      else hi = mid;
    }
    const a = this.pts[lo];
    const b = this.pts[hi];
    const t = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    return { x: a.x + dx * t, y: a.y + dy * t, dx: dx / l, dy: dy / l };
  }

  /** Put the bus on the road at its current distance. */
  private place() {
    const ahead = this.at(this.s + 5 * this.dir);
    const behind = this.at(this.s - 5 * this.dir);
    const here = this.at(this.s);
    const fx = ahead.x - behind.x;
    const fy = ahead.y - behind.y;
    const fl = Math.hypot(fx, fy) || 1;
    const dx = fx / fl;
    const dy = fy / fl;
    // keep left: left of travel direction (dx, dy) is (-dy, dx)
    const lx = here.x - dy * 1.5;
    const ly = here.y + dx * 1.5;
    const hFront = this.ground.height(ahead.x, ahead.y);
    const hBack = this.ground.height(behind.x, behind.y);
    const h = Math.max(this.ground.height(lx, ly), (hFront + hBack) / 2) + 0.35;
    this.pos.set(lx, h, -ly);
    this.forward.set(dx, 0, -dy).normalize();
    const g = this.model.group;
    g.position.copy(this.pos);
    g.rotation.y = Math.atan2(this.forward.x, this.forward.z);
    g.rotation.x = -Math.atan2(hFront - hBack, 10);
  }

  /** Teleport, facing along the route (+1) or back along it (-1). */
  teleport(s: number, dir: 1 | -1 = 1) {
    this.s = THREE.MathUtils.clamp(s, 0, this.length);
    this.dir = dir;
    this.speed = 0;
    this.wait = 0;
    this.place();
  }

  /** Drive to distance `to` and stop there. Resolves on arrival. */
  runTo(to: number, max = 14) {
    this.script?.resolve();
    return new Promise<void>((resolve) => {
      this.dir = to >= this.s ? 1 : -1;
      this.script = { to: THREE.MathUtils.clamp(to, 0, this.length), max, resolve };
    });
  }

  release() {
    this.script?.resolve();
    this.script = null;
    this.wait = 4;
    this.waitedAtStop = true;
  }

  update(dt: number) {
    dt = Math.min(dt, 0.1);
    let target: number;
    let max: number;
    if (this.script) {
      target = this.script.to;
      max = this.script.max;
    } else {
      if (this.wait > 0) {
        this.wait -= dt;
        this.speed = 0;
        this.place();
        return;
      }
      const stopAhead = this.dir === 1 ? this.stopS > this.s + 0.5 : this.stopS < this.s - 0.5;
      target = !this.waitedAtStop && stopAhead ? this.stopS : this.dir === 1 ? this.length : 0;
      max = 8.5;
    }
    const remaining = Math.abs(target - this.s);
    const brake = Math.sqrt(2 * 2.2 * remaining);
    const want = Math.min(max, brake);
    this.speed += THREE.MathUtils.clamp(want - this.speed, -4 * dt, 2.4 * dt);
    const step = Math.min(this.speed * dt, remaining);
    this.s += step * this.dir;
    for (const w of this.wheels) w.rotation.x += (step / 0.5) * this.dir;
    if (remaining - step < 0.05) {
      this.s = target;
      this.speed = 0;
      if (this.script) {
        const r = this.script.resolve;
        this.script = null;
        this.wait = 6;
        this.waitedAtStop = true;
        r();
      } else if (target === this.stopS && !this.waitedAtStop) {
        this.wait = 7;
        this.waitedAtStop = true;
      } else {
        // end of the road: wait, turn round
        this.wait = 9;
        this.waitedAtStop = false;
        this.dir = this.dir === 1 ? -1 : 1;
      }
    }
    this.place();
  }
}
