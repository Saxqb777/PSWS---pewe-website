import type { PlaceId } from "./places";

/**
 * The Society's work and Zakat heads, as the office describes them.
 * Short on purpose; the committee checks the wording before launch.
 */

export interface Work {
  title: string;
  period: string;
  line: string;
  /** a place on the map to fly to, if there is one */
  place?: PlaceId;
}

export const WORKS: Work[] = [
  {
    title: "Water",
    period: "2016 – now",
    line: "Storage tanks on the hill, pipelines down to the village, borewells, and old tanks rebuilt and protected. The largest part of the work.",
    place: "water",
  },
  {
    title: "Community Building",
    period: "2017 – now",
    line: "Structural repair, plastering, boundary walls and year-round upkeep.",
    place: "building",
  },
  {
    title: "Village roads",
    period: "2018 – 2024",
    line: "Internal roads and the approach stretches, laid and repaired in phases.",
    place: "roads",
  },
  {
    title: "Street lights",
    period: "2019 – now",
    line: "Lights along the lanes and the approach road, put up and kept working.",
    place: "roads",
  },
  {
    title: "Wells",
    period: "2017 – now",
    line: "Old wells brought back into use, and the ones in use cleaned every year.",
  },
  {
    title: "Boundary walls",
    period: "2020 – now",
    line: "Walls at several village sites.",
  },
  {
    title: "Village upkeep",
    period: "2015 – now",
    line: "Grass clearing, walkways and cleaning through the year, so the village stays usable in the monsoon.",
  },
];

export const ZAKAT_HEADS: { title: string; line: string }[] = [
  { title: "Medical", line: "Treatment, surgery, medicines and travel to hospital." },
  { title: "Monthly stipend", line: "Paid straight to the household's bank account, reviewed every year." },
  { title: "Education", line: "School fees, books, hostel, and courses that lead to work." },
  { title: "Livelihood", line: "The one-time cost of earning again: nets, a cart, tools." },
  { title: "Emergency", line: "Fire, a house collapse, or the sudden loss of the earning member." },
];
