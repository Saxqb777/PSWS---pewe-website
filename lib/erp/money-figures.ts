/** Money as charts and tiles show it. Used on the server and in the browser alike. */

/** Rupees as the axis says them: ₹800, ₹24.5K, ₹1.2L, ₹2Cr. */
export function short(paise: number): string {
  const r = Math.abs(paise) / 100;
  const s =
    r >= 1e7 ? `${+(r / 1e7).toFixed(1)}Cr` : r >= 1e5 ? `${+(r / 1e5).toFixed(1)}L` : r >= 1e3 ? `${+(r / 1e3).toFixed(1)}K` : `${Math.round(r)}`;
  return `${paise < 0 ? "−" : ""}₹${s}`;
}

/** Rupees in full, with Indian commas. */
export function full(paise: number): string {
  const r = Math.round(Math.abs(paise) / 100);
  const w = String(r);
  const g = w.length <= 3 ? w : w.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + w.slice(-3);
  return `${paise < 0 ? "−" : ""}₹${g}`;
}
