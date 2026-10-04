/**
 * The places you can open in Pewe, and what each one says.
 *
 * Wording is a draft for the committee to check. The Community Building is
 * described only by the work the Society's own books record.
 */

import { COMPLETED_WORKS, ELEVEN_YEARS } from "@/lib/record";

export type PlaceId = "building" | "haveli" | "water" | "roads" | "school" | "fields" | "world" | "busstop";

/** The office's approximate cost of each finished work, by its record id. */
const WORK_COST: Record<string, number> = Object.fromEntries(COMPLETED_WORKS.map((w) => [w.id, w.approxCost ?? 0]));
/** ₹27.5 lakh */
export const lakh = (n: number) => `₹${+(n / 1e5).toFixed(1)} lakh`;
/** ₹2.2 crore */
export const crore = (n: number) => `₹${+(n / 1e7).toFixed(1)} crore`;

export interface PlaceView {
  /** compass bearing from the place to the camera, degrees */
  az: number;
  /** camera elevation, degrees */
  el: number;
  /** metres from the place */
  dist: number;
  /** look-at height above the ground, metres */
  lookHeight: number;
  /** look somewhere else than the anchor (x east, y north) */
  target?: [number, number];
}

export interface Place {
  id: PlaceId;
  /** short tag on the map */
  tag: string;
  title: string;
  meta: string;
  body: string;
  /** key into village.json places, or a fixed point */
  anchor: string | [number, number];
  anchorHeight: number;
  view: PlaceView;
  effect?: "water" | "roads" | "world" | "tour";
  photo?: { src: string; alt: string };
  /** a figure from the office's own record, shown large on the card */
  figure?: { value: string; label: string };
  /** where it is, for the card */
  coords: string;
}

export const PLACES: Place[] = [
  {
    id: "building",
    coords: "17.5590° N · 73.2426° E",
    tag: "Community Building",
    title: "Community Building",
    meta: "Repair & upkeep · since 2017",
    body: "Structural repair, plastering, boundary walls and year-round care, carried by PSWS since 2017.",
    figure: { value: `≈ ${lakh(WORK_COST.w2)}`, label: "spent on it so far" },
    anchor: "building",
    anchorHeight: 27,
    view: { az: 292, el: 13, dist: 105, lookHeight: 9 },
    photo: { src: "/images/hero/hero.jpg", alt: "The Community Building across the paddy in the monsoon" },
  },
  {
    id: "haveli",
    coords: "17.5606° N · 73.2427° E",
    tag: "The Haveli",
    title: "The Haveli",
    meta: "Pewe's oldest house",
    body: "Where Pewe's families once lived together under one roof. PSWS is those same families, still working together.",
    anchor: "haveli",
    anchorHeight: 15,
    view: { az: 266, el: 12, dist: 125, lookHeight: 6 },
  },
  {
    id: "water",
    coords: "17.5595° N · 73.2448° E",
    tag: "Water",
    title: "Water",
    meta: "Water supply · since 2016",
    body: "Storage tanks high on the hill, pipelines down to the lanes, borewells, and old tanks rebuilt and protected.",
    figure: { value: `≈ ${lakh(WORK_COST.w1)}`, label: "spent on it so far" },
    anchor: "tanks",
    anchorHeight: 10,
    view: { az: 302, el: 27, dist: 420, lookHeight: 4, target: [110, 120] },
    effect: "water",
  },
  {
    id: "roads",
    coords: "17.5628° N · 73.2436° E",
    tag: "Roads & lights",
    title: "Roads & lights",
    meta: "Roads 2018–2024 · lights since 2019",
    body: "Village roads and the approach stretches laid and mended in phases, with street lights along the lanes.",
    figure: { value: `≈ ${lakh(WORK_COST.w3)}`, label: "spent on the roads" },
    anchor: [96, 420],
    anchorHeight: 6,
    view: { az: 312, el: 52, dist: 1550, lookHeight: 0, target: [60, 170] },
    effect: "roads",
  },
  {
    id: "school",
    coords: "17.5585° N · 73.2428° E",
    tag: "School",
    title: "School",
    meta: "Beside the Community Building",
    body: "The village school. PSWS helps keep it in good repair.",
    anchor: "school",
    anchorHeight: 11,
    view: { az: 238, el: 17, dist: 95, lookHeight: 5 },
  },
  {
    id: "fields",
    coords: "17.5602° N · 73.2417° E",
    tag: "Zakat & help",
    title: "Zakat & help",
    meta: "Every rupee audited",
    body: "Zakat collected from Pewe's people and given to the families who need it: medical, monthly stipends, education, livelihood and emergencies.",
    figure: { value: `≈ ${crore(ELEVEN_YEARS.familySupportTenYears)}`, label: "direct family support in ten years" },
    anchor: "paddy",
    anchorHeight: 4,
    view: { az: 206, el: 11, dist: 240, lookHeight: 3 },
  },
  {
    id: "world",
    coords: "17.5696° N · 73.2404° E",
    tag: "Pewe's people",
    title: "Pewe's people",
    meta: "Mumbai · Dubai · Riyadh · Kigali",
    body: "From this creek to the world. Pewe's people live and work far from home, and still build it.",
    figure: { value: `≈ ${crore(ELEVEN_YEARS.collected)}`, label: "given by Pewe's people since 2015" },
    anchor: [-240, 1180],
    anchorHeight: 5,
    view: { az: 172, el: 26, dist: 1150, lookHeight: 0, target: [-200, 1000] },
    effect: "world",
  },
  {
    id: "busstop",
    coords: "17.5606° N · 73.2423° E",
    tag: "ST bus stop",
    title: "Take me through Pewe",
    meta: "The ST bus stop",
    body: "",
    anchor: "busstop",
    anchorHeight: 6,
    view: { az: 232, el: 12, dist: 60, lookHeight: 3 },
    effect: "tour",
  },
];

export const PLACE_BY_ID = Object.fromEntries(PLACES.map((p) => [p.id, p])) as Record<PlaceId, Place>;

/** Places that open a card, in "next place" order. */
export const CARD_ORDER: PlaceId[] = ["building", "haveli", "water", "roads", "school", "fields", "world"];

/** Names on the map that are not buttons. */
export const MINOR_LABELS: { text: string; anchor: string | [number, number]; height: number; far?: number }[] = [
  { text: "Amshet Bhoiwadi", anchor: "peve", height: 6 },
  { text: "Rab Bhoiwadi", anchor: "rab", height: 6 },
  { text: "Pere", anchor: "pere", height: 6 },
  { text: "Pardalewadi", anchor: "pardalewadi", height: 6, far: 3200 },
  { text: "Vashishti creek", anchor: [-520, 1290], height: 2, far: 4200 },
  { text: "Bridge", anchor: "bridge", height: 7, far: 900 },
];

export const HOME_VIEW: PlaceView = { az: 318, el: 37, dist: 1650, lookHeight: 0, target: [-10, 250] };

/** What the guided tour says at each stop. */
export const TOUR_LINES = {
  arrive: "Pewe, on the Vashishti creek.",
  building: `The Community Building. Repaired and kept up since 2017: about ${lakh(WORK_COST.w2)}.`,
  bus: "The red ST bus, into Pewe.",
  haveli: "The Haveli, Pewe's oldest house.",
  water: `Water from the hill tanks, piped down to the lanes: about ${lakh(WORK_COST.w1)} since 2016.`,
  roads: `Roads laid and mended, 2018 to 2024: about ${lakh(WORK_COST.w3)}.`,
  school: "The village school.",
  fields: `Zakat and help for families: about ${crore(ELEVEN_YEARS.familySupportTenYears)} in ten years.`,
  world: `From Mumbai, Dubai, Riyadh and Kigali, Pewe's people gave about ${crore(ELEVEN_YEARS.collected)} in eleven years.`,
  end: "This is Pewe. Explore it.",
};
