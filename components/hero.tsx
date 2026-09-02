"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SOCIETY } from "@/lib/site";
import { Seal } from "@/components/seal";
import {
  LayerSky, LayerRidge, LayerHill, LayerPalms, LayerMasjid, LayerField,
} from "@/components/konkan-engraving";

/**
 * Depth rig. Each layer moves at its own rate as the page scrolls, so
 * the view reads as a place you are looking across rather than a flat
 * picture. The same rig drives photographs — see SOCIETY.heroMode.
 */
const LAYERS = [
  { key: "sky",    rate: 0.04, node: <LayerSky />,    shift: 0 },
  { key: "ridge",  rate: 0.09, node: <LayerRidge />,  shift: 0 },
  { key: "hill",   rate: 0.16, node: <LayerHill />,   shift: 0 },
  { key: "masjid", rate: 0.22, node: <LayerMasjid />, shift: 140 },
  { key: "palms",  rate: 0.30, node: <LayerPalms />,  shift: 0 },
  { key: "field",  rate: 0.40, node: <LayerField />,  shift: 0 },
];

function useParallax() {
  const [y, setY] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const onScroll = () => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        // Only the first screenful matters; past that the hero is gone.
        setY(Math.min(window.scrollY, 900));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  return y;
}

function Plate() {
  const y = useParallax();

  if (SOCIETY.heroMode === "photo-flat") {
    return (
      <div className="absolute inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero/hero.jpg" alt=""
          className="hero-drift h-full w-full object-cover" />
      </div>
    );
  }

  if (SOCIETY.heroMode === "photo") {
    const files = ["sky", "ridge", "ridge", "masjid", "fore", "fore"];
    return (
      <div className="absolute inset-0 overflow-hidden">
        {LAYERS.map((l, i) => (
          <div key={l.key} className="parallax absolute inset-0"
            style={{ transform: `translate3d(0, ${y * l.rate}px, 0)`, willChange: "transform" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/images/hero/${files[i]}.png`} alt=""
              className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
    );
  }

  // Default: the engraved plate.
  return (
    <div className="absolute inset-0 overflow-hidden bg-paper-2">
      {LAYERS.map((l) => (
        <div
          key={l.key}
          className="parallax absolute inset-0"
          style={{ transform: `translate3d(0, ${y * l.rate}px, 0)`, willChange: "transform" }}
        >
          <svg viewBox="0 0 1600 1150" preserveAspectRatio="xMidYMax slice"
            className="h-full w-full" aria-hidden="true">
            {l.shift ? <g transform={`translate(${l.shift} 0)`}>{l.node}</g> : l.node}
          </svg>
        </div>
      ))}
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative isolate min-h-[80vh] sm:min-h-[84vh] flex items-end overflow-hidden border-b-2 border-ink">
      <Plate />

      {/* Veil: lifts the plate back so the text plate reads first. */}
      <div aria-hidden className="absolute inset-0 bg-paper/25" />
      <div aria-hidden
        className="absolute inset-x-0 bottom-0 h-40"
        style={{ background: "linear-gradient(to top, var(--color-paper), transparent)" }} />

      {/* The bookplate — text never floats on the picture, it sits on paper. */}
      <div className="relative z-10 w-full px-5 sm:px-8 lg:px-12 pb-10 sm:pb-14">
        <div className="mx-auto max-w-[1320px]">
          <div className="max-w-2xl border border-ink bg-paper">
            <div className="jali-band" />

            <div className="px-6 py-7 sm:px-9 sm:py-9">
              <div className="flex items-center gap-4">
                <Seal size={54} />
                <div className="min-w-0">
                  <div className="label label-brass">
                    Reg. {SOCIETY.registrationNo} · Est. {SOCIETY.foundedYear}
                  </div>
                  <div className="label mt-1">
                    {SOCIETY.address.line1}, {SOCIETY.address.line2}
                  </div>
                </div>
              </div>

              <h1 className="display mt-6 text-[34px] leading-[1.05] sm:text-[46px]">
                {SOCIETY.name}
              </h1>
              <p className="marathi mt-2 text-[18px] text-ink-2 sm:text-[20px]">
                {SOCIETY.nameMarathi}
              </p>

              <p className="mt-5 max-w-xl text-[15.5px] leading-[1.72] text-ink-2">
                A registered welfare society of the village of Pewe in Guhagar
                taluka — running the water scheme, the school works and the
                masjid repair, and standing behind any household in the village
                that needs help in a hurry.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/campaigns"
                  className="inline-flex items-center justify-center border border-maroon bg-maroon px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-paper transition-colors hover:bg-maroon-dark hover:border-maroon-dark"
                >
                  What we are raising for
                </Link>
                <Link
                  href="/reports"
                  className="inline-flex items-center justify-center border border-ink px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-ink hover:text-paper"
                >
                  Where the money went
                </Link>
              </div>
            </div>

            <div className="arcade-band" />
          </div>
        </div>
      </div>
    </section>
  );
}
