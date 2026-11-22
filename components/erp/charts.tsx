"use client";

import { useEffect, useRef, useState } from "react";
import { full, short } from "@/lib/erp/money-figures";
import d from "./dash.module.css";

/**
 * The office's charts. Money in stands above the line and money out hangs
 * below it, so the two are told apart by where they are, not only by colour.
 * Every value is also in the table under the chart.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** A clean step for the axis: 1, 2 or 5 times a power of ten. */
function niceStep(range: number, count: number) {
  const raw = range / Math.max(count, 1);
  const p = 10 ** Math.floor(Math.log10(raw || 1));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

/** A bar with its free end rounded and its baseline end square. */
function bar(x: number, y0: number, y1: number, w: number) {
  const up = y1 < y0;
  const h = Math.abs(y1 - y0);
  const r = Math.min(4, w / 2, h);
  if (h < 0.5) return "";
  return up
    ? `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z`
    : `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 - r}V${y0}Z`;
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export interface MonthMoney {
  month: string;
  in_paise: number;
  out_paise: number;
}

export function InOutByMonth({ months, now }: { months: MonthMoney[]; now: string }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const H = 240;
  const pad = { top: 22, bottom: 30, left: 46, right: 6 };
  const plotW = Math.max(width - pad.left - pad.right, 10);
  const plotH = H - pad.top - pad.bottom;
  const maxIn = Math.max(0, ...months.map((m) => m.in_paise));
  const maxOut = Math.max(0, ...months.map((m) => m.out_paise));
  const span = maxIn + maxOut || 1;
  const step = niceStep(span, 4);
  const topV = Math.ceil(maxIn / step) * step || (maxOut ? 0 : step);
  const botV = Math.ceil(maxOut / step) * step;
  const total = topV + botV || 1;
  const y = (v: number) => pad.top + ((topV - v) / total) * plotH;
  const zero = y(0);
  const band = plotW / months.length;
  const bw = Math.min(24, Math.max(4, band * 0.56));
  const ticks: number[] = [];
  for (let v = -botV; v <= topV + 1; v += step) ticks.push(v);
  const peakIn = months.reduce((b, m, i) => (m.in_paise > (months[b]?.in_paise ?? 0) ? i : b), 0);
  const peakOut = months.reduce((b, m, i) => (m.out_paise > (months[b]?.out_paise ?? 0) ? i : b), 0);
  const label = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1];
  const h = hover != null ? months[hover] : null;

  return (
    <div className={d.chart} ref={ref}>
      <div className={d.legend}>
        <span>
          <i className={d.keyIn} /> Came in, above the line
        </span>
        <span>
          <i className={d.keyOut} /> Went out, below it
        </span>
      </div>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label="Money in and out, month by month. The same figures are in the table below.">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} className={v === 0 ? d.base : d.grid} />
              <text x={pad.left - 6} y={y(v)} dy="0.32em" textAnchor="end" className={d.tick}>
                {v === 0 ? "₹0" : short(Math.abs(v))}
              </text>
            </g>
          ))}
          {months.map((m, i) => {
            const x = pad.left + i * band + (band - bw) / 2;
            const later = m.month > now;
            const dim = hover != null && hover !== i;
            return (
              <g
                key={m.month}
                tabIndex={later ? -1 : 0}
                role="img"
                aria-label={`${LONG[Number(m.month.slice(5, 7)) - 1]} ${m.month.slice(0, 4)}: came in ${full(m.in_paise)}, went out ${full(m.out_paise)}`}
                onPointerEnter={() => !later && setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className={d.month}
                style={{ opacity: dim ? 0.45 : 1 }}
              >
                <rect x={pad.left + i * band} y={pad.top - 12} width={band} height={plotH + 12} fill="transparent" />
                {m.in_paise > 0 && <path d={bar(x, zero - 1, y(m.in_paise), bw)} className={d.in} />}
                {m.out_paise > 0 && <path d={bar(x, zero + 1, y(-m.out_paise), bw)} className={d.out} />}
                <text x={pad.left + i * band + band / 2} y={H - 10} textAnchor="middle" className={later ? d.tickLater : d.tick}>
                  {band >= 30 ? label(m.month) : label(m.month)[0]}
                </text>
              </g>
            );
          })}
          {hover == null && maxIn > 0 && (
            <text x={pad.left + peakIn * band + band / 2} y={y(months[peakIn].in_paise) - 6} textAnchor="middle" className={d.peak}>
              {short(months[peakIn].in_paise)}
            </text>
          )}
          {hover == null && maxOut > 0 && (
            <text x={pad.left + peakOut * band + band / 2} y={y(-months[peakOut].out_paise) + 14} textAnchor="middle" className={d.peak}>
              {short(months[peakOut].out_paise)}
            </text>
          )}
        </svg>
      )}
      {h && hover != null && (
        <div
          className={d.tip}
          style={{
            left: Math.min(Math.max(pad.left + hover * band + band / 2, 80), width - 80),
          }}
          aria-hidden="true"
        >
          <span className={d.tipHead}>
            {LONG[Number(h.month.slice(5, 7)) - 1]} {h.month.slice(0, 4)}
          </span>
          <span className={d.tipRow}>
            <i className={d.lineIn} />
            <b>{full(h.in_paise)}</b> came in
          </span>
          <span className={d.tipRow}>
            <i className={d.lineOut} />
            <b>{full(h.out_paise)}</b> went out
          </span>
          <span className={d.tipNet}>
            {h.in_paise >= h.out_paise ? "Kept" : "Spent more than came in by"} {full(Math.abs(h.in_paise - h.out_paise))}
          </span>
        </div>
      )}
    </div>
  );
}
