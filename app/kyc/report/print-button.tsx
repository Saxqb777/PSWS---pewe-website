"use client";

export function PrintButton() {
  return (
    <button type="button" className="rep-print" onClick={() => window.print()}>
      Print / Save PDF
    </button>
  );
}
