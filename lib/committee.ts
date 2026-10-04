/**
 * The committee, as the village elected it on 5 September 2026 and as it
 * appointed its office bearers on 13 September 2026.
 *
 * Shared by the minutes (app/mom/content.ts) and the front page, so the
 * names and figures live in one place. Only plain facts are kept here; the
 * minutes keep their own wording.
 */

export interface Elected {
  n: number;
  name: string;
  votes: number;
  pct: number;
  isNew?: boolean;
}

export const ELECTED: Elected[] = [
  { n: 1, name: "Akhtar Khan", votes: 92, pct: 84 },
  { n: 2, name: "Irfan Anwar Khan", votes: 79, pct: 72 },
  { n: 3, name: "Afzal Abdul Rahiman Khan Sarguro", votes: 76, pct: 70 },
  { n: 4, name: "Ibrahim Usman Sarguroh", votes: 76, pct: 70 },
  { n: 5, name: "Khalid A. Razzak Khan Sarguroh", votes: 74, pct: 68 },
  { n: 6, name: "Nisar Sarguroh", votes: 73, pct: 67 },
  { n: 7, name: "Aslam Ahmed Khan", votes: 69, pct: 63 },
  { n: 8, name: "Bilal Sarguroh", votes: 69, pct: 63 },
  { n: 9, name: "Sadiq Latif Khan", votes: 66, pct: 61 },
  { n: 10, name: "Maqbool Pevekar", votes: 58, pct: 53 },
  { n: 11, name: "S. M. S. G. Khan", votes: 53, pct: 49 },
  { n: 12, name: "Gayasali Mahamood Khan S.", votes: 49, pct: 45 },
  { n: 13, name: "Mukri Mohammed Hussain A.", votes: 45, pct: 41, isNew: true },
  { n: 14, name: "Musaddiq Khan", votes: 44, pct: 40, isNew: true },
  { n: 15, name: "Abdul Qayyum Khan", votes: 41, pct: 38, isNew: true },
  { n: 16, name: "Shakeel Ahmed Abdul Samad", votes: 38, pct: 35 },
  { n: 17, name: "Mubeen Mohiuddin Pavekar", votes: 36, pct: 33, isNew: true },
];

/** The eleven who hold no office — they make up the Development Committee. */
export const MEMBERS_WITHOUT_OFFICE = [
  "Ibrahim Usman Sarguroh",
  "Khalid A. Razzak Khan Sarguroh",
  "Nisar Sarguroh",
  "Bilal Sarguroh",
  "Sadiq Latif Khan",
  "Maqbool Pevekar",
  "S. M. S. G. Khan (Shafi Saheb)",
  "Gayasali Mahamood Khan S.",
  "Mukri Mohammed Hussain A.",
  "Musaddiq Khan",
  "Shakeel Ahmed Abdul Samad",
];

/** Appointed unanimously on 13 September 2026, for two years. */
export const OFFICE_BEARERS: { post: string; name: string }[] = [
  { post: "President", name: "Akhtar Khan" },
  { post: "General Secretary", name: "Irfan Anwar Khan" },
  { post: "Treasurer", name: "Abdul Qayyum Khan" },
  { post: "Head, Zakat Committee", name: "Afzal Abdul Rahiman Khan Sarguro" },
  { post: "Head, Development Committee", name: "Mubeen Mohiuddin Pavekar" },
  { post: "Head, Advisory Committee", name: "Aslam Ahmed Khan" },
];

export const COMMITTEES: { head: string; lead: string; members: string[] }[] = [
  { head: "Zakat Committee", lead: "Afzal Abdul Rahiman Khan Sarguro", members: [] },
  { head: "Development Committee", lead: "Mubeen Mohiuddin Pavekar", members: [] },
  { head: "Advisory Committee", lead: "Aslam Ahmed Khan", members: [] },
];

/** What the Zakat and Development committees do, in the minutes' own English. */
export const COMMITTEE_WORK = {
  zakat:
    "Runs the collection and distribution of Zakat through the collection months, with dedicated support from the management team.",
  development: "Carries the village development works.",
};

/** The meeting of 13 September 2026: seventeen on the committee, thirteen present. */
export const ROLL = { total: 17, present: 13, absent: 4 };

export const ELECTION = {
  date: "5 September 2026",
  registered: "110",
  voted: "109",
  turnout: "99.1%",
  counted: "1,853",
};

export const MEETING_DATE = "13 September 2026";
