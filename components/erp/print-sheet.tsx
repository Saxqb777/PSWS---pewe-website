"use client";

/** The minutes viewer's print button: the bar and title drop away, the A4 sheet prints on its own. */
export function PrintSheet() {
  return (
    <button type="button" className="min-print" onClick={() => window.print()}>
      Print / Save PDF
    </button>
  );
}
