import { COMPLETED_WORKS, ELEVEN_YEARS, YEARLY_COLLECTION, type CompletedWork } from "@/lib/record";
import type { PlaceId } from "./places";

/**
 * What the front page says below the 3D village, drawn from the Society's
 * own record (lib/record.ts). Figures there are the office's approximations,
 * pending audit, and the page always says so beside them.
 */

export { ELEVEN_YEARS, YEARLY_COLLECTION };

/** A finished or running work, as the page shows it. */
export interface Work extends CompletedWork {
  /** a place on the map to fly to, if there is one */
  place?: PlaceId;
  /** one plain line for the page; the record's own detail is longer */
  line: string;
}

const PLACE: Record<string, PlaceId> = { w1: "water", w2: "building", w3: "roads", w4: "roads" };
const LINE: Record<string, string> = {
  w1: "Storage tanks on the hill, pipelines down to the village, borewells, and old tanks rebuilt and protected.",
  w2: "Structural repair, plastering, boundary walls and year-round upkeep.",
  w3: "Internal roads and the approach stretches, laid and repaired in phases.",
  w4: "Lights along the lanes and the approach road, put up and kept working.",
  w5: "Boundary walls at several village sites, the burial ground among them.",
  w6: "Old wells brought back into use, and the ones in use cleaned every year.",
  w7: "Grass clearing, walkways and cleaning through the year, so the village stays usable in the monsoon.",
};

export const WORKS: Work[] = COMPLETED_WORKS.map((w) => ({ ...w, place: PLACE[w.id], line: LINE[w.id] ?? w.detail }));

/** The works the office has put a cost to, largest first. */
export const COSTED_WORKS = WORKS.filter((w) => w.approxCost).sort((a, b) => b.approxCost! - a.approxCost!);

export const ZAKAT_HEADS: { title: string; hinglish: string; line: string }[] = [
  { title: "Medical", hinglish: "Ilaaj", line: "Treatment, surgery, medicines and travel to hospital." },
  { title: "Monthly stipend", hinglish: "Maheena", line: "Paid straight to the household's bank account, reviewed every year." },
  { title: "Education", hinglish: "Padhai", line: "School fees, books, hostel, and courses that lead to work." },
  { title: "Livelihood", hinglish: "Rozgaar", line: "The one-time cost of earning again: nets, a cart, tools." },
  { title: "Emergency", hinglish: "Aafat", line: "Fire, a house collapse, or the sudden loss of the earning member." },
];

/** Ways to give. Every one of them is a domestic channel (FCRA). */
export const GIVE_WAYS: { head: string; hinglish: string; line: string }[] = [
  { head: "Cash", hinglish: "Nakad", line: "At the office in Pewe." },
  { head: "GPay or PhonePe", hinglish: "UPI se", line: "The office gives you the Society's UPI details." },
  { head: "Bank transfer", hinglish: "Bank se", line: "NEFT, IMPS or RTGS. The office gives you the account details." },
  { head: "Cheque", hinglish: "Cheque se", line: "Drawn in the Society's name." },
];
