import * as THREE from "three";
import { Ground, type MapData, WATER_Y } from "./data";
import type { ModelContext, ModelHandle } from "./types";
import { buildCommunityBuilding } from "./models/community-building";
import { buildHaveli } from "./models/haveli";
import { buildSchool } from "./models/school";
import { buildBusStop } from "./models/bus-stop";
import { buildBridge } from "./models/bridge";
import { buildBoat } from "./models/boat";
import { buildStBus } from "./models/st-bus";

/** Level the ground under the landmarks. Must run before the land is meshed. */
export function padLandmarks(ground: Ground, data: MapData) {
  const P = data.village.places;
  ground.addPad({ x: P.building[0], y: P.building[1], r: 24, falloff: 16 });
  ground.addPad({ x: P.haveli[0], y: P.haveli[1], r: 25, falloff: 14 });
  ground.addPad({ x: P.school[0], y: P.school[1], r: 17, falloff: 12 });
  ground.addPad({ x: P.busstop[0], y: P.busstop[1], r: 5, falloff: 6 });
  ground.addPad({ x: P.tanks[0], y: P.tanks[1], r: 15, falloff: 14 });
}

export interface Landmarks {
  group: THREE.Group;
  bus: ModelHandle;
  /** pickable groups by place id */
  pick: Record<string, THREE.Object3D>;
  setNight(n: number): void;
  update(t: number, dt: number): void;
  dispose(): void;
}

export function buildLandmarks(ground: Ground, data: MapData, ctx: ModelContext): Landmarks {
  const v = data.village;
  const P = v.places;
  const group = new THREE.Group();
  group.name = "landmarks";
  const handles: ModelHandle[] = [];
  const at = (h: ModelHandle, x: number, y: number, rotY = 0, yOverride?: number) => {
    h.group.position.set(x, yOverride ?? ground.height(x, y), -y);
    h.group.rotation.y = rotY;
    group.add(h.group);
    handles.push(h);
    return h;
  };

  const building = at(buildCommunityBuilding(ctx), P.building[0], P.building[1]);
  const haveli = at(buildHaveli(ctx), P.haveli[0], P.haveli[1]);
  const school = at(buildSchool(ctx), P.school[0], P.school[1]);
  at(buildBusStop(ctx), P.busstop[0], P.busstop[1]);
  const b = v.bridge;
  at(buildBridge(ctx, { length: b.length, deckHeight: 4.5 }), b.x, b.y, (b.angle * Math.PI) / 180, WATER_Y);

  const hulls = [
    ["#2e4c6d", "#c9a24a"],
    ["#a33b2b", "#efe6d2"],
    ["#2f6b5a", "#e8d9a8"],
    ["#30343a", "#c45a3a"],
  ];
  const boats = v.boats.map(([x, y, heading], i) =>
    at(buildBoat(ctx, { hull: hulls[i % hulls.length][0], trim: hulls[i % hulls.length][1] }), x, y, Math.PI - (heading * Math.PI) / 180, WATER_Y),
  );

  const bus = buildStBus(ctx);
  group.add(bus.group);
  handles.push(bus);

  for (const h of handles)
    h.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.frustumCulled = true;
    });

  return {
    group,
    bus,
    pick: { building: building.group, haveli: haveli.group, school: school.group },
    setNight(n) {
      for (const h of handles) h.setNight(n);
    },
    update(t, dt) {
      boats.forEach((h, i) => {
        h.group.position.y = WATER_Y + Math.sin(t * 1.25 + i * 1.7) * 0.06;
        h.group.rotation.z = Math.sin(t * 0.9 + i) * 0.025;
      });
      for (const h of handles) h.update?.(t, dt);
    },
    dispose() {
      for (const h of handles) h.dispose();
    },
  };
}
