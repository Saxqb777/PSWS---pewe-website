import type * as THREE from "three";

/**
 * Shared shapes for everything that goes into the Pewe scene.
 *
 * World conventions, used by every module:
 *   - units are metres
 *   - +Y is up, +X is east, -Z is north (so a compass bearing b points to
 *     (sin b, 0, -cos b))
 *   - the origin is the Community Building, at sea level
 */

export interface ModelContext {
  /** renderer.capabilities.getMaxAnisotropy(), for canvas textures */
  anisotropy: number;
  /** true on phones and weak GPUs: fewer triangles, smaller textures */
  lowPower: boolean;
}

export interface ModelHandle {
  /** Origin at ground level, centred on the footprint. */
  group: THREE.Group;
  /** 0 = full day, 1 = full night. Drives windows, lamps, headlights. */
  setNight(night: number): void;
  /** Optional per-frame hook: seconds since start, seconds since last frame. */
  update?(t: number, dt: number): void;
  dispose(): void;
}
