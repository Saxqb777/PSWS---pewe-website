#!/usr/bin/env node
/**
 * Builds public/map/world.json: the coastlines for the "world finale" survey
 * sheet (Pewe -> Mumbai, Dubai, Riyadh, Kigali).
 *
 *   node scripts/map/build-world.mjs [path/to/node_modules]
 *   WORLD_NODE_MODULES=/path/to/node_modules node scripts/map/build-world.mjs
 *
 * The node_modules folder must contain world-atlas@2 and topojson-client@3
 * (they are deliberately not dependencies of the app).
 *
 * What it does
 *   - Natural Earth 1:50m land (world-atlas land-50m.json) for the whole sheet,
 *     clipped to the sheet bbox (lines are split where they leave the box),
 *     simplified with Douglas-Peucker (0.02 deg), tiny islands dropped.
 *   - Inside a small window around Pewe (+-2 deg) the 1:10m land is used
 *     instead, with a tolerance that tightens towards Pewe and two Chaikin
 *     passes, so the close view (camera ~50 km up) shows the real Konkan coast
 *     and the Dabhol creek as a drawn line rather than a polygon. Where the two
 *     sources meet on the window edge the 1:50m ends are snapped onto the 1:10m
 *     ends, so the coast stays continuous.
 *
 * Output: {"bbox":[18,-28,102,46],"lines":[[lng,lat,lng,lat,...],...]}
 * with 3-decimal coordinates (~110 m).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");
const OUT = path.join(REPO, "public", "map", "world.json");
const DEFAULT_NODE_MODULES =
  "/tmp/claude-0/-home-user-PSWS---pewe-website/d6660240-16ec-54f7-9a1d-aab68359b85e/scratchpad/worlddata/node_modules";
const NODE_MODULES = path.resolve(process.argv[2] || process.env.WORLD_NODE_MODULES || DEFAULT_NODE_MODULES);

// Sheet extent [west, south, east, north] in degrees.
const BBOX = [18, -28, 102, 46];
// Pewe, the origin of the map.
const PEWE = { lat: 17.558976159379238, lng: 73.24268669549738 };
const COS0 = Math.cos((PEWE.lat * Math.PI) / 180);

// 1:50m sheet: Douglas-Peucker tolerance (deg) and smallest island kept (deg).
const SHEET_TOLERANCE = 0.02;
const SHEET_MIN_ISLAND = 0.25;
// 1:10m detail window around Pewe: half-size (deg), tolerance near / at edge,
// and Chaikin passes that round the 1:10m polygon corners for the close view.
const DETAIL_HALF = 2;
const DETAIL_TOL_NEAR = 0.002; // within DETAIL_NEAR deg of Pewe
const DETAIL_NEAR = 0.4;
const DETAIL_TOL_EDGE = 0.012; // at the window edge
const DETAIL_SMOOTH = 2;
const DETAIL_MIN_ISLAND = 0.03;
const SNAP_DISTANCE = 0.2; // deg; how far a 1:50m end may move onto a 1:10m end

const DETAIL_BOX = [PEWE.lng - DETAIL_HALF, PEWE.lat - DETAIL_HALF, PEWE.lng + DETAIL_HALF, PEWE.lat + DETAIL_HALF];

const require = createRequire(import.meta.url);
let topojson;
try {
  topojson = require(path.join(NODE_MODULES, "topojson-client", "dist", "topojson-client.js"));
} catch (err) {
  console.error(`build-world: cannot load topojson-client from ${NODE_MODULES}`);
  console.error("Pass the node_modules folder that holds world-atlas@2 and topojson-client@3 as the first argument or WORLD_NODE_MODULES.");
  throw err;
}

/**
 * All land rings (outer rings and holes) as arrays of [lng, lat]. Rings that
 * jump across the antimeridian (Fiji, Chukotka) are split at the jump, or the
 * jump would be clipped into a line straight across the sheet.
 */
function loadRings(file) {
  const topology = JSON.parse(fs.readFileSync(path.join(NODE_MODULES, "world-atlas", file), "utf8"));
  const geo = topojson.feature(topology, topology.objects.land);
  const geoms = geo.type === "FeatureCollection" ? geo.features.map((f) => f.geometry) : [geo.geometry];
  const rings = [];
  for (const g of geoms) {
    if (!g) continue;
    const polys = g.type === "MultiPolygon" ? g.coordinates : g.type === "Polygon" ? [g.coordinates] : [];
    for (const poly of polys) {
      for (const ring of poly) {
        let run = [];
        for (const [x, y] of ring) {
          if (run.length && Math.abs(x - run[run.length - 1][0]) > 180) {
            if (run.length > 1) rings.push(run);
            run = [];
          }
          run.push([x, y]);
        }
        if (run.length > 1) rings.push(run);
      }
    }
  }
  return rings;
}

/** Extent of a ring in (roughly) equal-area degrees: max(dx*cos(lat0), dy). */
function extent(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return Math.max((x1 - x0) * COS0, y1 - y0);
}

function boxOverlaps(pts, [w, s, e, n]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return x1 >= w && x0 <= e && y1 >= s && y0 <= n;
}

const samePoint = (a, b) => a[0] === b[0] && a[1] === b[1];

/**
 * Liang-Barsky: the part of segment a->b inside the box as [t0, t1], or null.
 */
function segmentInterval(a, b, [w, s, e, n]) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  let t0 = 0, t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [a[0] - w, e - a[0], a[1] - s, n - a[1]];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) {
        if (r > t1) return null;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return null;
        if (r < t1) t1 = r;
      }
    }
  }
  return t0 <= t1 ? [t0, t1] : null;
}

/** Point at t on a->b, snapped exactly onto the box edge it lies on. */
function pointAt(a, b, t, [w, s, e, n]) {
  if (t <= 0) return [a[0], a[1]];
  if (t >= 1) return [b[0], b[1]];
  let x = a[0] + (b[0] - a[0]) * t;
  let y = a[1] + (b[1] - a[1]) * t;
  const eps = 1e-9;
  if (Math.abs(x - w) < eps) x = w;
  if (Math.abs(x - e) < eps) x = e;
  if (Math.abs(y - s) < eps) y = s;
  if (Math.abs(y - n) < eps) y = n;
  return [x, y];
}

/**
 * Splits a polyline at the box boundary. Returns the runs inside the box
 * (keep = "inside") or outside it (keep = "outside"). A closed ring whose
 * start lies in a kept run is re-joined across its start point.
 */
function clipToBox(pts, box, keep = "inside") {
  const runs = [];
  let cur = null;
  const push = (p) => {
    if (!cur) cur = [p];
    else if (!samePoint(cur[cur.length - 1], p)) cur.push(p);
  };
  const end = () => {
    if (cur && cur.length > 1) runs.push(cur);
    cur = null;
  };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const iv = segmentInterval(a, b, box);
    if (keep === "inside") {
      if (!iv) { end(); continue; }
      const [t0, t1] = iv;
      if (t0 > 0) end();
      push(pointAt(a, b, t0, box));
      push(pointAt(a, b, t1, box));
      if (t1 < 1) end();
    } else {
      if (!iv || iv[0] >= iv[1]) { push(a); push(b); continue; }
      const [t0, t1] = iv;
      if (t0 > 0) { push(a); push(pointAt(a, b, t0, box)); }
      end();
      if (t1 < 1) { push(pointAt(a, b, t1, box)); push(b); }
    }
  }
  end();
  const closed = pts.length > 3 && samePoint(pts[0], pts[pts.length - 1]);
  if (closed && runs.length > 1) {
    const first = runs[0], last = runs[runs.length - 1];
    if (samePoint(first[0], pts[0]) && samePoint(last[last.length - 1], pts[pts.length - 1])) {
      runs[0] = last.concat(first.slice(1));
      runs.pop();
    }
  }
  return runs;
}

/**
 * Douglas-Peucker in locally equal-area degrees (x scaled by cos(lat0)), with
 * a tolerance that may vary along the line: a point is kept when its offset
 * from the chord exceeds tol(point). Closed rings are split at their farthest
 * point first so both halves keep a stable anchor.
 */
function simplify(pts, tol) {
  if (pts.length <= 2) return pts.slice();
  const closed = samePoint(pts[0], pts[pts.length - 1]);
  if (closed) {
    let far = 0, best = -1;
    for (let i = 1; i < pts.length - 1; i++) {
      const dx = (pts[i][0] - pts[0][0]) * COS0, dy = pts[i][1] - pts[0][1];
      const d = dx * dx + dy * dy;
      if (d > best) { best = d; far = i; }
    }
    const a = simplifyOpen(pts.slice(0, far + 1), tol);
    const b = simplifyOpen(pts.slice(far), tol);
    return a.concat(b.slice(1));
  }
  return simplifyOpen(pts, tol);
}

function simplifyOpen(pts, tol) {
  const n = pts.length;
  if (n <= 2) return pts.slice();
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [i0, i1] = stack.pop();
    const ax = pts[i0][0] * COS0, ay = pts[i0][1];
    const bx = pts[i1][0] * COS0, by = pts[i1][1];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let worst = 1, at = -1;
    for (let i = i0 + 1; i < i1; i++) {
      const px = pts[i][0] * COS0, py = pts[i][1];
      let d;
      if (len2 === 0) d = Math.hypot(px - ax, py - ay);
      else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
        d = Math.hypot(px - ax - t * dx, py - ay - t * dy);
      }
      const r = d / tol(pts[i]);
      if (r > worst) { worst = r; at = i; }
    }
    if (at >= 0) {
      keep[at] = 1;
      stack.push([i0, at], [at, i1]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

const constantTol = (t) => () => t;
const detailTol = ([x, y]) => {
  const d = Math.hypot((x - PEWE.lng) * COS0, y - PEWE.lat);
  const k = Math.max(0, Math.min(1, (d - DETAIL_NEAR) / (DETAIL_HALF - DETAIL_NEAR)));
  return DETAIL_TOL_NEAR + (DETAIL_TOL_EDGE - DETAIL_TOL_NEAR) * k;
};

/** Chaikin corner cutting; open lines keep their end points, closed rings stay closed. */
function chaikin(pts, passes) {
  let cur = pts;
  const q = (a, b) => [0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]];
  for (let it = 0; it < passes && cur.length > 2; it++) {
    const n = cur.length;
    const out = [];
    if (samePoint(cur[0], cur[n - 1])) {
      for (let i = 0; i < n - 1; i++) out.push(q(cur[i], cur[i + 1]), q(cur[i + 1], cur[i]));
      out.push(out[0].slice());
    } else {
      out.push(cur[0]);
      for (let i = 0; i < n - 1; i++) {
        if (i > 0) out.push(q(cur[i], cur[i + 1]));
        if (i < n - 2) out.push(q(cur[i + 1], cur[i]));
      }
      out.push(cur[n - 1]);
    }
    cur = out;
  }
  return cur;
}

function onBoxEdge([x, y], [w, s, e, n]) {
  return (x === w || x === e) && y >= s && y <= n || (y === s || y === n) && x >= w && x <= e;
}

// ---------------------------------------------------------------------------

if (!fs.existsSync(path.join(NODE_MODULES, "world-atlas", "land-50m.json"))) {
  throw new Error(`build-world: world-atlas not found in ${NODE_MODULES}`);
}

// 1. The sheet, from 1:50m, outside the detail window.
const sheet = [];
for (const ring of loadRings("land-50m.json")) {
  if (extent(ring) < SHEET_MIN_ISLAND) continue;
  if (!boxOverlaps(ring, BBOX)) continue;
  for (const inBox of clipToBox(ring, BBOX, "inside")) {
    for (const run of clipToBox(inBox, DETAIL_BOX, "outside")) sheet.push(run);
  }
}

// 2. The detail window, from 1:10m.
const detail = [];
const has10m = fs.existsSync(path.join(NODE_MODULES, "world-atlas", "land-10m.json"));
if (has10m) {
  for (const ring of loadRings("land-10m.json")) {
    if (!boxOverlaps(ring, DETAIL_BOX)) continue;
    if (extent(ring) < DETAIL_MIN_ISLAND) continue;
    for (const run of clipToBox(ring, DETAIL_BOX, "inside")) detail.push(run);
  }
  // 3. Snap 1:50m ends on the window edge onto the nearest 1:10m end.
  const detailEnds = [];
  for (const run of detail) {
    for (const p of [run[0], run[run.length - 1]]) if (onBoxEdge(p, DETAIL_BOX)) detailEnds.push(p);
  }
  let snapped = 0;
  for (const run of sheet) {
    for (const idx of [0, run.length - 1]) {
      const p = run[idx];
      if (!onBoxEdge(p, DETAIL_BOX)) continue;
      let best = null, bestD = SNAP_DISTANCE;
      for (const q of detailEnds) {
        const d = Math.hypot((p[0] - q[0]) * COS0, p[1] - q[1]);
        if (d < bestD) { bestD = d; best = q; }
      }
      if (best) { run[idx] = [best[0], best[1]]; snapped++; }
    }
  }
  console.log(`detail window: ${detail.length} runs from 1:10m, ${snapped} seam ends snapped`);
} else {
  // Fall back to 1:50m inside the window as well.
  for (const ring of loadRings("land-50m.json")) {
    if (extent(ring) < SHEET_MIN_ISLAND || !boxOverlaps(ring, DETAIL_BOX)) continue;
    for (const run of clipToBox(ring, DETAIL_BOX, "inside")) detail.push(run);
  }
  console.log("land-10m.json not found; the detail window uses 1:50m");
}

// 4. Simplify, round, drop slivers.
const lines = [];
let points = 0;
const emit = (run, tol, minExtent, smooth = 0) => {
  let simple = simplify(run, tol);
  if (smooth > 0) simple = simplify(chaikin(simple, smooth), constantTol(0.0004));
  const flat = [];
  let px = NaN, py = NaN;
  for (const [x, y] of simple) {
    const rx = Math.round(x * 1000) / 1000, ry = Math.round(y * 1000) / 1000;
    if (rx === px && ry === py) continue;
    flat.push(rx, ry);
    px = rx;
    py = ry;
  }
  if (flat.length < 4) return;
  const closed = flat.length > 4 && flat[0] === flat[flat.length - 2] && flat[1] === flat[flat.length - 1];
  if (closed && flat.length < 8) return; // a closed sliver of 3 points
  const pts = [];
  for (let i = 0; i < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
  if (closed && extent(pts) < minExtent) return;
  lines.push(flat);
  points += flat.length / 2;
};
for (const run of sheet) emit(run, constantTol(SHEET_TOLERANCE), SHEET_MIN_ISLAND);
for (const run of detail) emit(run, detailTol, DETAIL_MIN_ISLAND, has10m ? DETAIL_SMOOTH : 0);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const json = JSON.stringify({ bbox: BBOX, lines });
fs.writeFileSync(OUT, json);
console.log(`wrote ${path.relative(REPO, OUT)}: ${lines.length} lines, ${points} points, ${(json.length / 1024).toFixed(1)} KB`);
