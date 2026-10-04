import * as THREE from "three";
import type { Ground } from "./data";

/**
 * Tags on the map: small paper labels on a hairline stem, like the labels on
 * a museum model. They are real buttons, positioned every frame, and they
 * hide behind hills.
 */
export type LabelKind = "major" | "minor" | "city";

export interface LabelClasses {
  root: string;
  major: string;
  minor: string;
  city: string;
  active: string;
  tag: string;
  stem: string;
}

interface Label {
  id: string;
  kind: LabelKind;
  el: HTMLElement;
  world: THREE.Vector3;
  far: number;
  near: number;
  shown: boolean;
  opacity: number;
  priority: number;
  w: number;
  h: number;
}

const v = new THREE.Vector3();
const p = new THREE.Vector3();

export class Labels {
  private list: Label[] = [];
  private frame = 0;
  private occluded = new Map<string, boolean>();
  worldMode = false;
  enabled = true;

  constructor(
    private root: HTMLElement,
    private cls: LabelClasses,
    private ground: Ground,
    private onSelect: (id: string) => void,
  ) {
    root.classList.add(cls.root);
  }

  add(id: string, kind: LabelKind, text: string, world: THREE.Vector3, opts: { far?: number; near?: number; priority?: number } = {}) {
    const el = document.createElement(kind === "major" ? "button" : "div");
    el.className = `${this.cls[kind]}`;
    el.setAttribute("data-label", id);
    if (kind === "major") {
      (el as HTMLButtonElement).type = "button";
      el.setAttribute("aria-label", `Open ${text}`);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this.onSelect(id);
      });
    } else {
      el.setAttribute("aria-hidden", "true");
    }
    const tag = document.createElement("span");
    tag.className = this.cls.tag;
    tag.textContent = text;
    const stem = document.createElement("span");
    stem.className = this.cls.stem;
    el.append(tag, stem);
    el.style.opacity = "0";
    el.style.visibility = "hidden";
    this.root.appendChild(el);
    this.list.push({
      id,
      kind,
      el,
      world: world.clone(),
      far: opts.far ?? (kind === "major" ? 3600 : kind === "minor" ? 2400 : 1e12),
      near: opts.near ?? 0,
      shown: false,
      opacity: 0,
      priority: opts.priority ?? this.list.length,
      w: 0,
      h: 0,
    });
    this.list.sort((a, b) => a.priority - b.priority);
  }

  setActive(id: string | null) {
    for (const l of this.list) l.el.classList.toggle(this.cls.active, l.id === id);
  }

  move(id: string, world: THREE.Vector3) {
    const l = this.list.find((x) => x.id === id);
    if (l) l.world.copy(world);
  }

  private isOccluded(cam: THREE.Vector3, target: THREE.Vector3) {
    const steps = 14;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (t > 0.94) break;
      p.lerpVectors(cam, target, t);
      if (this.ground.height(p.x, -p.z) > p.y + 2.5) return true;
    }
    return false;
  }

  update(camera: THREE.PerspectiveCamera, width: number, height: number, dt: number, focusDist = 1000, activeId: string | null = null) {
    this.frame++;
    const camPos = camera.position;
    const taken: [number, number, number, number][] = [];
    // the open place claims its space first
    const ordered = activeId ? [...this.list].sort((a, b) => (a.id === activeId ? -1 : b.id === activeId ? 1 : a.priority - b.priority)) : this.list;
    for (const l of ordered) {
      let want = this.enabled;
      if (l.kind === "city" ? !this.worldMode : this.worldMode) want = false;
      // with a place open, its own tag is the only button on the map
      if (activeId && l.kind === "major" && l.id !== activeId) want = false;
      const dist = camPos.distanceTo(l.world);
      const reach = l.kind === "city" ? l.far : Math.min(l.far, Math.max(420, focusDist * 3.4));
      if (dist > reach || dist < l.near) want = false;
      let x = 0;
      let y = 0;
      if (want) {
        v.copy(l.world).project(camera);
        if (v.z > 1 || v.z < -1) want = false;
        x = (v.x * 0.5 + 0.5) * width;
        y = (-v.y * 0.5 + 0.5) * height;
        if (x < -80 || x > width + 80 || y < -40 || y > height + 120) want = false;
      }
      if (want && l.kind !== "city") {
        // occlusion is cheap but not free: refresh a few labels per frame
        if ((this.frame + l.id.length) % 4 === 0 || !this.occluded.has(l.id)) {
          this.occluded.set(l.id, this.isOccluded(camPos, l.world));
        }
        if (this.occluded.get(l.id)) want = false;
      }
      if (want) {
        // keep labels from piling up: higher priority wins the space
        if (!l.w) {
          l.w = l.el.offsetWidth || 120;
          l.h = l.el.offsetHeight || 40;
        }
        const r: [number, number, number, number] = [x - l.w / 2 - 4, y - l.h - 2, x + l.w / 2 + 4, y];
        if (taken.some((t) => r[0] < t[2] && r[2] > t[0] && r[1] < t[3] && r[3] > t[1])) want = false;
        else taken.push(r);
      }
      const target = want ? 1 : 0;
      l.opacity += (target - l.opacity) * Math.min(1, dt * 7);
      if (l.opacity < 0.02 && !want) {
        if (l.shown) {
          l.el.style.visibility = "hidden";
          l.shown = false;
        }
        continue;
      }
      if (!l.shown) {
        l.el.style.visibility = "visible";
        l.shown = true;
      }
      if (want) l.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      l.el.style.opacity = l.opacity.toFixed(3);
      l.el.style.pointerEvents = l.opacity > 0.6 ? "auto" : "none";
    }
  }

  dispose() {
    for (const l of this.list) l.el.remove();
    this.list = [];
  }
}
