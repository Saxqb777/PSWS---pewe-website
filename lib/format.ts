/**
 * Indian-convention formatting. Money is grouped 2,2,3 (lakh/crore),
 * not 3,3,3 — a committee member reading ₹12,50,000 must not have to
 * translate it in their head.
 */

export function rupees(n: number, opts: { paise?: boolean } = {}): string {
  const negative = n < 0;
  const abs = Math.abs(n);
  const fixed = opts.paise ? abs.toFixed(2) : Math.round(abs).toString();
  const [whole, frac] = fixed.split(".");

  // Indian grouping: last 3 digits, then pairs.
  let grouped: string;
  if (whole.length <= 3) {
    grouped = whole;
  } else {
    const last3 = whole.slice(-3);
    const rest = whole.slice(0, -3);
    grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
  }

  return `${negative ? "−" : ""}₹${grouped}${frac ? "." + frac : ""}`;
}

/** Compact form for dashboard tiles: ₹12.5 L, ₹1.8 Cr */
export function rupeesShort(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)} Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(1)} L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(0)}K`;
  return `${sign}₹${abs}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 14 Aug 2026 */
export function longDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** 14.08.26 — for dense ledger columns */
export function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const p = (x: number) => x.toString().padStart(2, "0");
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear() % 100}`;
}

/** "18 days left" / "closed" — for flash funds */
export function daysUntil(iso: string, from = "2026-09-02"): number {
  const a = new Date(from + "T00:00:00Z").getTime();
  const b = new Date(iso + "T00:00:00Z").getTime();
  return Math.ceil((b - a) / 86_400_000);
}

export function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.round((part / whole) * 100));
}
