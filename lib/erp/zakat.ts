/**
 * The Zakat Committee's medical slab, as it has worked for years: what Zakat
 * pays towards an admitted patient's (IPD) hospital bill, paid straight to the
 * hospital as per the bill. No OPD, outside tests, medicines, or paying back
 * money already spent.
 *
 * Each "at most" band keeps the share of the band before it, up to its cap:
 * 100% up to ₹30,000, then ₹30,000 until 75% of the bill passes it, and so on.
 * Above ₹2,00,000 it stays 40% of the bill, at most ₹1,00,000.
 *
 * No server code here, so forms in the browser can show the share as it is typed.
 */

interface Band {
  /** the band ends at this bill, in rupees */
  upTo: number;
  /** the share of the bill Zakat pays */
  pct: number;
  /** but never more than this, in rupees */
  cap: number | null;
}

const BANDS: Band[] = [
  { upTo: 30_000, pct: 100, cap: null },
  { upTo: 40_000, pct: 100, cap: 30_000 },
  { upTo: 60_000, pct: 75, cap: null },
  { upTo: 75_000, pct: 75, cap: 45_000 },
  { upTo: 1_00_000, pct: 60, cap: null },
  { upTo: 1_50_000, pct: 60, cap: 60_000 },
  { upTo: 2_00_000, pct: 40, cap: null },
  { upTo: Number.POSITIVE_INFINITY, pct: 40, cap: 1_00_000 },
];

/** What Zakat pays for a hospital bill, in paise, to the whole rupee. */
export function zakatMedical(billPaise: number): number {
  if (!(billPaise > 0)) return 0;
  const bill = billPaise / 100;
  const band = BANDS.find((b) => bill <= b.upTo) ?? BANDS[BANDS.length - 1];
  const share = (bill * band.pct) / 100;
  return Math.round(band.cap == null ? share : Math.min(share, band.cap)) * 100;
}

/** The slab as the committee writes it: [hospital bill, Zakat pays]. */
export const SLAB_ROWS: [string, string][] = [
  ["Up to ₹30,000", "100% of the bill"],
  ["₹30,001 to ₹40,000", "₹30,000"],
  ["₹40,001 to ₹60,000", "75% of the bill"],
  ["₹60,001 to ₹75,000", "₹45,000"],
  ["₹75,001 to ₹1,00,000", "60% of the bill"],
  ["₹1,00,001 to ₹1,50,000", "₹60,000"],
  ["₹1,50,001 to ₹2,00,000", "40% of the bill"],
  ["Above ₹2,00,000", "40% of the bill, at most ₹1,00,000"],
];

/** What is not covered, in the committee's words. */
export const NOT_COVERED = "OPD, outside tests, medicines, or paying back money already spent";
