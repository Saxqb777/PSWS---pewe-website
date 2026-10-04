"use client";

import { useEffect, useRef, useState } from "react";
import { rupees } from "@/lib/format";
import { YEARLY_COLLECTION } from "./content";
import { crore, lakh } from "./places";
import styles from "./pewe.module.css";

/**
 * Eleven years of collection, one bar a year. Point at (or tap) a year to
 * read it, with the change on the year before and the running total.
 */
export function YearsChart() {
  const years = YEARLY_COLLECTION;
  const max = Math.max(...years.map((y) => y.amount));
  const [sel, setSel] = useState(years.length - 1);
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // the bars rise once, when the chart first comes into view
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const y = years[sel];
  const prev = sel > 0 ? years[sel - 1] : null;
  const change = prev ? Math.round(((y.amount - prev.amount) / prev.amount) * 100) : null;
  const toDate = years.slice(0, sel + 1).reduce((s, v) => s + v.amount, 0);

  return (
    <figure className={styles.chart} ref={ref}>
      <div className={styles.chartReadout} aria-live="polite">
        <p className={styles.chartYear}>{y.year}</p>
        <p className={styles.chartValue}>{rupees(y.amount)}</p>
        <p className={styles.chartNote}>
          {change === null
            ? "The first year of the Society"
            : `${change >= 0 ? "+" : "−"}${Math.abs(change)}% on ${prev!.year}`}
          {" · "}
          {toDate >= 1e7 ? crore(toDate) : lakh(toDate)} collected since 2015
        </p>
      </div>
      <ol className={`${styles.chartBars} ${shown ? styles.chartShown : ""}`}>
        {years.map((v, i) => (
          <li key={v.year}>
            <button
              type="button"
              className={`${styles.chartBar} ${i === sel ? styles.chartBarOn : ""}`}
              style={{ "--h": `${(v.amount / max) * 100}%`, "--i": i } as React.CSSProperties}
              onMouseEnter={() => setSel(i)}
              onFocus={() => setSel(i)}
              onClick={() => setSel(i)}
              aria-pressed={i === sel}
              aria-label={`${v.year}: ${rupees(v.amount)}`}
            >
              <span className={styles.chartFill} />
            </button>
            <span className={styles.chartTick} aria-hidden="true">
              ’{v.year.slice(2, 4)}
            </span>
          </li>
        ))}
      </ol>
      <figcaption className={styles.chartCaption}>
        Collected each year, April to March · approximate, from the office · pending audit
      </figcaption>
    </figure>
  );
}
