/**
 * The Society's own record, as the office has given it.
 *
 * These figures are PROVISIONAL: given by the office and not yet checked
 * against the audited statements. They are shown in public, always with
 * "approximate · pending audit" beside them, and replaced when the audited
 * statements are in. Nothing here is invented — the invented sample data
 * for the members' area lives in mock-data.ts, which re-exports this file.
 */

/* ---------------------------------------------------------- */
/*  ELEVEN YEARS  — PROVISIONAL, from the office               */
/* ---------------------------------------------------------- */

export const YEARLY_COLLECTION: { year: string; amount: number }[] = [
  { year: "2015–16", amount: 1350000 },
  { year: "2016–17", amount: 1400000 },
  { year: "2017–18", amount: 1600000 },
  { year: "2018–19", amount: 1800000 },
  { year: "2019–20", amount: 1900000 },
  { year: "2020–21", amount: 2000000 },
  { year: "2021–22", amount: 2100000 },
  { year: "2022–23", amount: 2150000 },
  { year: "2023–24", amount: 2300000 },
  { year: "2024–25", amount: 2500000 },
  { year: "2025–26", amount: 2750000 },
];

export const ELEVEN_YEARS = {
  provisional: true,
  /** Sum of the yearly series above. */
  get collected() {
    return YEARLY_COLLECTION.reduce((s, y) => s + y.amount, 0);
  },
  /**
   * The office also stated a total nearer ₹3 crore for the same period.
   * That does not reconcile with the yearly figures above, which come to
   * about ₹2.2 crore. Both are recorded until the audited statements
   * settle it — the site shows the series, never a single unsourced total.
   */
  officeStatedTotal: 30000000,
  /** Everything collected in a year is disbursed inside that year. */
  carriedForward: 0,
  years: 11,
  familySupportTenYears: 20000000,
};

/* ---------------------------------------------------------- */
/*  WORKS ALREADY DONE  — PROVISIONAL costs from the office    */
/*  The real eleven-year record. Costs are approximate and     */
/*  carry the "pending audit" rule wherever they are shown.    */
/* ---------------------------------------------------------- */

export interface CompletedWork {
  id: string;
  title: string;
  hinglish: string;
  detail: string;
  approxCost?: number;
  period: string;
  ongoing?: boolean;
}

export const COMPLETED_WORKS: CompletedWork[] = [
  {
    id: "w1",
    title: "Water Supply Works",
    hinglish: "Paani ka kaam",
    detail:
      "Multiple storage tanks at mountain level, pipelines down to the village, borewells, and the reconstruction and safeguarding of tanks already standing. The single largest head of development spending.",
    approxCost: 2000000,
    period: "2016 – present",
    ongoing: true,
  },
  {
    id: "w2",
    title: "Community Building — Repair & Maintenance",
    hinglish: "Imarat ki marammat",
    detail:
      "Structural repair, plastering, boundary walls and ongoing maintenance of the village's community structure.",
    approxCost: 2750000,
    period: "2017 – present",
    ongoing: true,
  },
  {
    id: "w3",
    title: "Village Road Works",
    hinglish: "Sadak ka kaam",
    detail:
      "Internal village roads and the approach stretches, laid and repaired in phases.",
    approxCost: 2250000,
    period: "2018 – 2024",
  },
  {
    id: "w4",
    title: "Electrical Street Lighting",
    hinglish: "Street light",
    detail:
      "Street lights along the village lanes and the approach road, put up and maintained by the Society.",
    period: "2019 – present",
    ongoing: true,
  },
  {
    id: "w5",
    title: "Boundary Walls",
    hinglish: "Compound wall",
    detail:
      "Boundary walls at several village sites, including the burial ground on the north and west faces.",
    period: "2020 – present",
    ongoing: true,
  },
  {
    id: "w6",
    title: "Wells — Reviving & Cleaning",
    hinglish: "Kuan safai",
    detail:
      "Reviving old wells that had gone out of use, and periodic cleaning of those still drawn from.",
    period: "2017 – present",
    ongoing: true,
  },
  {
    id: "w7",
    title: "Village Upkeep",
    hinglish: "Gaon ki safai",
    detail:
      "Grass clearing, walkway upkeep and general cleaning through the year — the unglamorous work that keeps the village usable in the monsoon.",
    period: "2015 – present",
    ongoing: true,
  },
];


/* ---------------------------------------------------------- */
/*  LATEST BANK STATEMENT — REAL, totals only                  */
/*  The Society's current-account statement, 1 Aug – 30 Sep   */
/*  2026, added up by head. No names, account numbers or other */
/*  personal details are kept here or shown on the site.       */
/* ---------------------------------------------------------- */

export const STATEMENT = {
  from: "1 Aug 2026",
  to: "30 Sep 2026",
  /** money that left the account, less the two cheques that came back */
  paidOut: 536242,
  heads: [
    { key: "stipend", label: "Monthly stipends", amount: 198800, note: "43 households, paid by NEFT straight to their own account, twice in the period" },
    { key: "education", label: "School and college fees", amount: 235000, note: "12 payments, made direct to 11 schools, colleges and institutes" },
    { key: "bulk", label: "Bulk transfers on stipend days", amount: 56600, note: "Two transfers of ₹28,300, made with the stipends" },
    { key: "medical", label: "Medical", amount: 26134, note: "One hospital bill, paid direct" },
    { key: "other", label: "Other transfer", amount: 19000, note: "One transfer" },
    { key: "charges", label: "Bank charges", amount: 708, note: "Charged on two cheques that came back" },
  ],
  stipendHouseholds: 43,
  stipendRange: [1400, 3200] as [number, number],
  /** two cheques of ₹20,000 were returned unpaid by the payee's bank and are not counted */
  returnedCheques: 2,
};
