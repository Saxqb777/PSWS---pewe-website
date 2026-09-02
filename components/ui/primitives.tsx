import type { ReactNode } from "react";

/* ---------- Rules & bands ---------- */

/** The jali lattice from the masjid's corner pillar, as a horizontal rule. */
export function JaliRule({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`jali-band ${className}`} />;
}

/** The arcade of small arches from under the masjid roofline. */
export function ArcadeRule({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`arcade-band ${className}`} />;
}

/* ---------- Section heading ---------- */

export function SectionHead({
  overline,
  title,
  lede,
  align = "left",
  children,
}: {
  overline?: string;
  title: string;
  lede?: string;
  align?: "left" | "center";
  children?: ReactNode;
}) {
  const isCenter = align === "center";
  return (
    <div className={isCenter ? "text-center max-w-2xl mx-auto" : "max-w-2xl"}>
      {overline && (
        <div className={`label label-brass mb-3 ${isCenter ? "" : ""}`}>{overline}</div>
      )}
      <h2 className="display text-[28px] sm:text-[34px] leading-[1.12]">{title}</h2>
      {lede && (
        <p className="mt-4 text-[16px] leading-[1.7] text-ink-2">{lede}</p>
      )}
      {children}
    </div>
  );
}

/* ---------- Panel: a sheet of paper, squared off ---------- */

export function Panel({
  children,
  className = "",
  tone = "paper",
}: {
  children: ReactNode;
  className?: string;
  tone?: "paper" | "sunk" | "ink";
}) {
  const tones = {
    paper: "bg-paper border-rule",
    sunk: "bg-paper-2 border-rule",
    ink: "bg-ink border-ink text-paper",
  };
  return <div className={`border ${tones[tone]} ${className}`}>{children}</div>;
}

/* ---------- Statistic: the ledger figure ---------- */

export function Stat({
  label,
  value,
  sub,
  tone = "ink",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ink" | "maroon" | "pine" | "brass";
}) {
  const tones = {
    ink: "text-ink",
    maroon: "text-maroon",
    pine: "text-pine",
    brass: "text-brass",
  };
  return (
    <div className="border-t-2 border-ink pt-3">
      <div className="label">{label}</div>
      <div className={`num mt-2 text-[26px] leading-none font-medium ${tones[tone]}`}>
        {value}
      </div>
      {sub && <div className="mt-2 text-[13px] text-ink-3 leading-snug">{sub}</div>}
    </div>
  );
}

/* ---------- Badge: square, bordered, never a pill ---------- */

const BADGE_TONES: Record<string, string> = {
  pending:   "border-rust text-rust bg-rust-tint",
  approved:  "border-brass text-brass bg-brass-tint",
  disbursed: "border-pine text-pine bg-pine-tint",
  rejected:  "border-rule-strong text-ink-3 bg-paper-2",
  active:    "border-pine text-pine bg-pine-tint",
  completed: "border-rule-strong text-ink-3 bg-paper-2",
  expired:   "border-rule-strong text-ink-3 bg-paper-2",
  flash:     "border-maroon text-maroon bg-maroon-tint",
  planned:   "border-rule-strong text-ink-3 bg-paper-2",
  tendering: "border-brass text-brass bg-brass-tint",
  in_progress: "border-pine text-pine bg-pine-tint",
  neutral:   "border-rule-strong text-ink-2 bg-paper-2",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof BADGE_TONES | string;
}) {
  const cls = BADGE_TONES[String(tone).toLowerCase()] ?? BADGE_TONES.neutral;
  return (
    <span
      className={`inline-block border px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.1em] leading-none whitespace-nowrap ${cls}`}
    >
      {children}
    </span>
  );
}

/* ---------- Progress: a filled bar, no rounding, no gradient ---------- */

export function Progress({
  value,
  tone = "maroon",
  showLabel = true,
}: {
  value: number;
  tone?: "maroon" | "pine" | "brass";
  showLabel?: boolean;
}) {
  const tones = { maroon: "bg-maroon", pine: "bg-pine", brass: "bg-brass" };
  return (
    <div>
      <div className="h-[6px] w-full bg-paper-3 border border-rule">
        <div
          className={`h-full ${tones[tone]}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {showLabel && (
        <div className="num mt-1.5 text-[11px] text-ink-3">{value}% funded</div>
      )}
    </div>
  );
}

/* ---------- Ledger table ---------- */

export function Ledger({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`scroll-thin overflow-x-auto border border-rule bg-paper ${className}`}>
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  );
}

/** Static map — Tailwind only compiles class names it can see literally. */
const ALIGN: Record<"left" | "right" | "center", string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function Th({
  children,
  align = "left",
  className = "",
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <th
      className={`border-b-2 border-ink bg-paper-2 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-2 ${ALIGN[align]} whitespace-nowrap ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className = "",
  mono = false,
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  mono?: boolean;
}) {
  return (
    <td
      className={`border-b border-rule px-3 py-2.5 align-top ${ALIGN[align]} ${mono ? "num" : ""} ${className}`}
    >
      {children}
    </td>
  );
}

/* ---------- Definition row (used on detail pages) ---------- */

export function DefRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-rule py-2.5">
      <dt className="label w-44 shrink-0 pt-[3px]">{term}</dt>
      <dd className="flex-1 min-w-[12rem] text-[14px] text-ink">{children}</dd>
    </div>
  );
}

/* ---------- Page furniture ---------- */

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1320px] px-5 sm:px-8 lg:px-12 ${className}`}>
      {children}
    </div>
  );
}

export function Section({
  children,
  className = "",
  tone = "paper",
}: {
  children: ReactNode;
  className?: string;
  tone?: "paper" | "sunk";
}) {
  return (
    <section className={`${tone === "sunk" ? "bg-paper-2" : ""} py-16 sm:py-20 ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}

/** The masthead strip used at the top of every inner page. */
export function PageHead({
  overline,
  title,
  lede,
}: {
  overline: string;
  title: string;
  lede?: string;
}) {
  return (
    <div className="border-b-2 border-ink bg-paper-2">
      <Container className="py-12 sm:py-16">
        <div className="label label-brass">{overline}</div>
        <h1 className="display mt-3 text-[34px] leading-[1.06] sm:text-[46px]">{title}</h1>
        {lede && (
          <p className="mt-5 max-w-2xl text-[16px] leading-[1.72] text-ink-2">{lede}</p>
        )}
      </Container>
      <div className="arcade-band" />
    </div>
  );
}
