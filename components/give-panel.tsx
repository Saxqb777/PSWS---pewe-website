"use client";

import { useEffect, useState } from "react";
import { SOCIETY } from "@/lib/site";
import { rupeesShort } from "@/lib/format";
import { RECEIPTS_BY_METHOD } from "@/lib/mock-data";

const METHODS = [
  {
    key: "CASH" as const,
    head: "Cash",
    hinglish: "Nakad",
    where: "At the office, or to the Treasurer",
    detail:
      "A numbered receipt is written out on the spot from the counterfoil book, and the counterfoil is entered the same evening.",
  },
  {
    key: "UPI_GPAY" as const,
    head: "GPay",
    hinglish: "GPay se",
    where: SOCIETY.phone,
    detail:
      "Send to the Society number with your member ID in the note. The Treasurer matches it against the statement and raises the receipt.",
  },
  {
    key: "UPI_PHONEPE" as const,
    head: "PhonePe",
    hinglish: "PhonePe se",
    where: SOCIETY.phone,
    detail:
      "Same number as GPay. Put your member ID and the campaign name in the note if it is for a particular appeal.",
  },
  {
    key: "BANK_TRANSFER" as const,
    head: "Bank Transfer",
    hinglish: "Bank se",
    where: "NEFT, IMPS or RTGS to the Society's current account",
    detail:
      "Account particulars are given on request to any member. Quote your member ID in the remitter's narration.",
  },
  {
    key: "CHEQUE" as const,
    head: "Cheque",
    hinglish: "Cheque se",
    where: "Drawn in favour of the Society",
    detail:
      "Handed to the Treasurer or posted to the registered office. The receipt is raised on realisation, not on receipt of the instrument.",
  },
];

/**
 * The give panel. Reachable from anywhere on the site rather than being a
 * page you have to navigate away to — a donor who is ready should not be
 * made to lose their place first.
 */
export function GiveButton({
  label = "Zakat & Donation",
  variant = "primary",
  size = "md",
  fullWidth = false,
  purpose,
}: {
  label?: string;
  variant?: "primary" | "secondary" | "onDark";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  /** Pre-selects what the gift is for, e.g. a campaign title. */
  purpose?: string;
}) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const variants = {
    primary: "bg-maroon text-paper border border-maroon hover:bg-maroon-dark hover:border-maroon-dark",
    secondary: "bg-transparent text-ink border border-ink hover:bg-ink hover:text-paper",
    onDark: "bg-brass-light text-ink border border-brass-light hover:bg-brass hover:border-brass",
  };
  const sizes = {
    sm: "px-4 py-2 text-[12px] tracking-[0.08em]",
    md: "px-6 py-3 text-[13px] tracking-[0.1em]",
    lg: "px-7 py-3.5 text-[13px] tracking-[0.1em]",
  };

  const byMethod = Object.fromEntries(RECEIPTS_BY_METHOD.map((r) => [r.method, r]));

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setChosen(null); }}
        className={`inline-flex items-center justify-center font-semibold uppercase leading-none transition-colors cursor-pointer ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""}`}
      >
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label="Give">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/55 cursor-default"
          />

          <div className="relative flex h-full w-full max-w-md flex-col border-l border-ink bg-paper">
            <div className="jali-band shrink-0" />

            <div className="flex items-start justify-between gap-4 border-b border-rule px-6 py-5">
              <div>
                <div className="label label-brass">Zakat &amp; Donation</div>
                <h2 className="display mt-1 text-[24px] leading-tight">Five ways to give</h2>
                {purpose && (
                  <p className="mt-2 text-[14px] leading-snug text-ink-2">
                    For <span className="font-semibold text-ink">{purpose}</span>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="shrink-0 border border-ink px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink hover:bg-ink hover:text-paper transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
              <ul className="space-y-px bg-rule">
                {METHODS.map((m) => {
                  const isOpen = chosen === m.key;
                  const stats = byMethod[m.key];
                  return (
                    <li key={m.key} className="bg-paper">
                      <button
                        type="button"
                        onClick={() => setChosen(isOpen ? null : m.key)}
                        aria-expanded={isOpen}
                        className={`flex w-full items-start justify-between gap-4 px-6 py-4 text-left transition-colors cursor-pointer ${isOpen ? "bg-brass-tint" : "hover:bg-paper-2"}`}
                      >
                        <span className="min-w-0">
                          <span className="block text-[16.5px] font-semibold text-ink">{m.head}</span>
                          <span className="block text-[13.5px] text-ink-3">{m.hinglish}</span>
                          <span className="mt-1 block text-[13.5px] leading-snug text-ink-2">{m.where}</span>
                        </span>
                        <span aria-hidden className="num shrink-0 pt-1 text-[19px] leading-none text-brass">
                          {isOpen ? "−" : "+"}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="border-t border-rule px-6 py-5">
                          <p className="text-[15px] leading-[1.68] text-ink-2">{m.detail}</p>
                          {stats && (
                            <p className="num mt-3 text-[13px] text-ink-3">
                              {rupeesShort(stats.amount)} received this way this year, over {stats.count} entries.
                            </p>
                          )}

                          <div className="mt-5 border-l-2 border-maroon bg-maroon-tint px-4 py-3">
                            <div className="label label-maroon">Prototype — not connected</div>
                            <p className="mt-1.5 text-[14px] leading-[1.6] text-ink-2">
                              In the live system this opens the {m.head.toLowerCase()} sheet,
                              writes a Donation row and raises a numbered receipt in one
                              transaction — so the book can never hold a receipt without an
                              entry, or an entry without a receipt.
                            </p>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="px-6 py-6">
                <div className="label label-brass">Har rupaye ka hisaab</div>
                <p className="mt-2 text-[15px] leading-[1.7] text-ink-2">
                  However it arrives, it ends in the same numbered receipt, against
                  the same head, in the same statement filed with the Charity
                  Commissioner at Ratnagiri each July.
                </p>

                <div className="mt-5 border border-rule-strong bg-paper-2 px-4 py-3.5">
                  <div className="label">Members working outside India</div>
                  <p className="mt-1.5 text-[15px] leading-[1.65] text-ink-2">
                    The Society accepts domestic contributions only. Please give
                    through your own Indian bank account, or through family at
                    home — the Society does not receive funds from abroad.
                  </p>
                </div>
              </div>
            </div>

            <div className="arcade-band shrink-0" />
          </div>
        </div>
      )}
    </>
  );
}
