"use client";

import { useEffect, useState, type ReactNode } from "react";

export type ProtoVariant = "primary" | "secondary" | "quiet" | "danger";

const VARIANTS: Record<ProtoVariant, string> = {
  primary:
    "bg-maroon text-paper border border-maroon hover:bg-maroon-dark hover:border-maroon-dark",
  secondary:
    "bg-transparent text-ink border border-ink hover:bg-ink hover:text-paper",
  quiet:
    "bg-transparent text-ink-2 border border-rule-strong hover:border-ink hover:text-ink",
  danger:
    "bg-transparent text-maroon border border-maroon hover:bg-maroon hover:text-paper",
};

const SIZES = {
  sm: "px-3 py-1.5 text-[12px] tracking-[0.08em]",
  md: "px-5 py-2.5 text-[13px] tracking-[0.1em]",
  lg: "px-7 py-3.5 text-[14.5px] tracking-[0.1em]",
};

/**
 * A control that looks and feels real but is not wired to anything.
 * Clicking it explains exactly what the finished system will do —
 * so the feature list stays legible while the back end doesn't exist.
 */
export function ProtoAction({
  label,
  title,
  does,
  detail,
  variant = "secondary",
  size = "md",
  fullWidth = false,
  icon,
}: {
  label: string;
  /** Heading inside the panel. Defaults to the button label. */
  title?: string;
  /** One line: what this button will do once connected. */
  does: string;
  /** Optional extra paragraphs — rules, who may do it, what it touches. */
  detail?: string[];
  variant?: ProtoVariant;
  size?: keyof typeof SIZES;
  fullWidth?: boolean;
  icon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-2 font-semibold uppercase leading-none transition-colors duration-150 cursor-pointer ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? "w-full" : ""}`}
      >
        {icon}
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={title ?? label}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/55 cursor-default"
          />

          <div className="relative w-full sm:max-w-lg border border-ink bg-paper rise">
            <div className="jali-band" />

            <div className="px-6 pt-5 pb-6 sm:px-8 sm:pt-6 sm:pb-7">
              <div className="label label-maroon">Prototype — not connected</div>

              <h3 className="display mt-2 text-[22px] leading-tight">
                {title ?? label}
              </h3>

              <p className="mt-4 border-l-2 border-brass pl-4 text-[16.5px] leading-[1.65] text-ink">
                {does}
              </p>

              {detail && detail.length > 0 && (
                <div className="mt-5 space-y-3 border-t border-rule pt-4">
                  {detail.map((d, i) => (
                    <p key={i} className="text-[15px] leading-[1.6] text-ink-2">
                      {d}
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between gap-4 border-t border-rule pt-4">
                <p className="text-[12.5px] leading-snug text-ink-3">
                  Nothing was saved. This screen reads from sample data.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="shrink-0 border border-ink px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink hover:bg-ink hover:text-paper transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
