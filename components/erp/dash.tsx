import Link from "next/link";
import { full } from "@/lib/erp/money-figures";
import d from "./dash.module.css";

/** The dashboard's figures: a number with its label, a filled track, and bars ranked biggest first. */

export function Stat({ label, value, note, href }: { label: string; value: string; note?: string; href?: string }) {
  const body = (
    <>
      <span className={d.statLabel}>{label}</span>
      <span className={d.statValue}>{value}</span>
      {note && <span className={d.statNote}>{note}</span>}
    </>
  );
  return href ? (
    <Link href={href} className={`${d.stat} ${d.statLink}`}>
      {body}
    </Link>
  ) : (
    <div className={d.stat}>{body}</div>
  );
}

/** One ratio against its limit: the track is a paler step of the fill's own colour. */
export function Meter({
  name,
  href,
  part,
  whole,
  figure,
  tone = "in",
}: {
  name: string;
  href?: string;
  part: number;
  whole: number;
  figure: string;
  tone?: "in" | "out";
}) {
  const share = whole > 0 ? Math.min(1, part / whole) : 0;
  return (
    <li className={d.meter}>
      <span className={d.meterName}>{href ? <Link href={href}>{name}</Link> : name}</span>
      <span
        className={`${d.track} ${tone === "out" ? d.trackOut : ""}`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(share * 100)}
        aria-label={`${name}: ${figure}`}
      >
        <span style={{ width: `${share * 100}%` }} />
      </span>
      <span className={d.meterFigure}>{figure}</span>
    </li>
  );
}

/** Parts of one whole, biggest first, each with its amount and share. Parts at nothing are left out. */
export function Ranked({ rows, tone }: { rows: { name: string; paise: number }[]; tone: "in" | "out" }) {
  const shown = rows.filter((r) => r.paise > 0).sort((a, b) => b.paise - a.paise);
  const all = shown.reduce((s, r) => s + r.paise, 0);
  const top = shown[0]?.paise ?? 1;
  if (!shown.length) return <p className={d.empty}>Nothing in this year yet.</p>;
  return (
    <ul className={d.ranked}>
      {shown.map((r) => (
        <li key={r.name}>
          <span className={d.rankName}>{r.name}</span>
          <span className={d.rankFigure}>
            {full(r.paise)} <small>{Math.round((r.paise / all) * 100)}%</small>
          </span>
          <span className={d.rankBar} aria-hidden="true">
            <span className={tone === "in" ? d.in : d.out} style={{ width: `${(r.paise / top) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
