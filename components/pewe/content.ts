import { COMPLETED_WORKS, ELEVEN_YEARS, STATEMENT, YEARLY_COLLECTION, type CompletedWork } from "@/lib/record";
import {
  COMMITTEES,
  COMMITTEE_WORK,
  ELECTED,
  ELECTION,
  MEETING_DATE,
  MEMBERS_WITHOUT_OFFICE,
  OFFICE_BEARERS,
  ROLL,
} from "@/lib/committee";
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
  {
    title: "Monthly stipend",
    hinglish: "Maheena",
    line: "Paid straight to the household's bank account, reviewed every year.",
  },
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

/* ------------------------------------------------------------------ */
/*  The three heads of work: what the trust was set up to do.          */
/*  Each carries one figure that the record can stand behind.          */
/* ------------------------------------------------------------------ */

const costedTotal = COSTED_WORKS.reduce((s, w) => s + (w.approxCost ?? 0), 0);

export const THREE_HEADS = [
  {
    key: "development",
    title: "Develop the village",
    hinglish: "Gaon ke kaam",
    line: "Water, roads and street lights, wells, boundary walls, and the repair of the Community Building.",
    figure: `≈ ₹${+(costedTotal / 1e5).toFixed(1)} lakh`,
    figureLabel: "on the water scheme, the roads and the Community Building since 2016 · approx., pending audit",
    href: "#work",
  },
  {
    key: "zakat",
    title: "Collect and give Zakat",
    hinglish: "Zakat aur madad",
    line: "Collected from Pewe's people at home and abroad, and given under five heads: medical, monthly stipends, education, livelihood and emergencies.",
    figure: `${STATEMENT.stipendHouseholds} households`,
    figureLabel: "on a monthly stipend, paid by NEFT to their own account · Aug–Sep 2026",
    href: "#zakat",
  },
  {
    key: "welfare",
    title: "Welfare for families",
    hinglish: "Madad ke kaam",
    line: "Standing behind any household in the village that needs help in a hurry.",
    figure: `≈ ₹${+(ELEVEN_YEARS.familySupportTenYears / 1e7).toFixed(1)} crore`,
    figureLabel:
      "direct family support over ten years: housing, livelihood, medical and education · approx., pending audit",
    href: "#accounts",
  },
];

/* ------------------------------------------------------------------ */
/*  The committee and the notices: the facts the minutes of            */
/*  13 September 2026 record (lib/committee.ts, shared with them).     */
/* ------------------------------------------------------------------ */

export const COMMITTEE = {
  electionDate: ELECTION.date,
  meetingDate: MEETING_DATE,
  registered: ELECTION.registered,
  voted: ELECTION.voted,
  turnout: ELECTION.turnout,
  elected: ELECTED.length,
  stats: [
    { v: ELECTION.registered, l: "Registered to vote" },
    { v: ELECTION.voted, l: "Voted" },
    { v: ELECTION.turnout, l: "Turnout" },
    { v: String(ELECTED.length), l: "Members elected" },
  ],
  officers: OFFICE_BEARERS,
  committees: [
    { name: "Zakat Committee", lead: COMMITTEES[0].lead, does: COMMITTEE_WORK.zakat },
    { name: "Development Committee", lead: COMMITTEES[1].lead, does: COMMITTEE_WORK.development },
    { name: "Advisory Committee", lead: COMMITTEES[2].lead, does: "" },
  ],
  members: MEMBERS_WITHOUT_OFFICE,
  present: ROLL.present,
  total: ROLL.total,
};

export const NOTICES = [
  {
    date: "13 Sep 2026",
    kind: "Meeting",
    title: "The new committee meets and appoints its office bearers",
    body: `Meeting online, ${ROLL.present} of the ${ROLL.total} elected members agreed a simpler structure: six offices, the President, General Secretary and Treasurer, and the heads of the Zakat, Development and Advisory committees. They serve two years, with a review of the work after the first.`,
    link: { href: "/minutes", label: "Read the minutes" },
  },
  {
    date: "5 Sep 2026",
    kind: "Election",
    title: "Pewe elects its committee",
    body: `${ELECTION.voted} of the ${ELECTION.registered} registered members voted, a turnout of ${ELECTION.turnout}. Seventeen members were returned.`,
    link: { href: "#committee", label: "See the committee" },
  },
];
