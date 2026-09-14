"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SOCIETY } from "@/lib/site";
import { Seal } from "@/components/seal";
import { GiveButton } from "@/components/give-panel";
import {
  LayerSky, LayerRidge, LayerHill, LayerPalms, LayerBuilding, LayerField,
} from "@/components/konkan-engraving";

/**
 * Depth rig. Each layer moves at its own rate as the page scrolls, so the
 * view reads as a place you are looking across rather than a flat picture.
 *
 * Parallax runs on wide screens only. On a phone the plate sits in the
 * document flow as its own band, and translating the layers there would
 * just tear gaps at the edges.
 */
const LAYERS = [
  { key: "sky",    rate: 0.04, node: <LayerSky />,    shift: 0 },
  { key: "ridge",  rate: 0.09, node: <LayerRidge />,  shift: 0 },
  { key: "hill",   rate: 0.16, node: <LayerHill />,   shift: 0 },
  { key: "building", rate: 0.22, node: <LayerBuilding />, shift: 140 },
  { key: "palms",  rate: 0.30, node: <LayerPalms />,  shift: 0 },
  { key: "field",  rate: 0.40, node: <LayerField />,  shift: 0 },
];

function useParallax() {
  const [y, setY] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!wide.matches || still.matches) return;

    const onScroll = () => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => setY(Math.min(window.scrollY, 900)));
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

  if (SOCIETY.heroMode === "band") {
    // One photograph, running the full width of its own band.
    return (
      <div className="relative h-full w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero/hero-left.jpg"
          alt="The building at Pewe, seen from the lane"
          className="hero-drift h-full w-full object-cover"
          style={{ objectPosition: "center 38%" }}
        />
      </div>
    );
  }

  if (SOCIETY.heroMode === "photo-flat") {
    return (
      <div className="absolute inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero/hero.jpg"
          alt="Pewe seen across the paddy, with the Sahyadri behind"
          className="hero-drift h-full w-full object-cover"
        />
      </div>
    );
  }

  if (SOCIETY.heroMode === "photo") {
    const files = ["sky", "ridge", "ridge", "building", "fore", "fore"];
    return (
      <div className="absolute inset-0 overflow-hidden">
        {LAYERS.map((l, i) => (
          <div key={l.key} className="parallax absolute inset-0"
            style={{ transform: `translate3d(0, ${y * l.rate}px, 0)`, willChange: "transform" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/images/hero/${files[i]}.png`} alt="" className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
    );
  }

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
  // In band mode the photograph runs the full width, so nothing can sit on
  // top of it — the bookplate sits under it on paper instead. The other
  // modes keep the older overlapping composition.
  const band = SOCIETY.heroMode === "band";

  if (band) {
    return (
      <section id="top" className="relative isolate border-b-2 border-ink">
        <div className="relative h-[34dvh] min-h-[230px] w-full overflow-hidden sm:h-[42dvh] lg:h-[56dvh]">
          <Plate />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
            style={{ background: "linear-gradient(to top, var(--color-paper), transparent)" }}
          />
        </div>

        <div className="w-full px-4 pb-12 pt-8 sm:px-8 lg:px-12">
          <div className="mx-auto w-full max-w-[1320px]">
            <div className="max-w-2xl border border-ink bg-paper">
              <div className="jali-band" />

              <div className="px-5 py-7 sm:px-9 sm:py-9">
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
                <p className="marathi mt-2 text-[19px] text-ink-2 sm:text-[21px]">
                  {SOCIETY.nameMarathi}
                </p>

                <p className="mt-5 max-w-xl text-[17px] leading-[1.72] text-ink-2">
                  Pewe gaon ki apni welfare society — a public trust of Village
                  Pewe, Taluka Guhagar, District Ratnagiri, registered under the
                  Maharashtra Public Trusts Act, 1950. It was established to
                  develop the village, to collect and distribute Zakat, and to
                  carry out welfare projects, with every single rupee accounted
                  for and audited.
                </p>
                <p className="mt-4 max-w-xl text-[17px] leading-[1.72] text-ink-2">
                  We run the water scheme, the school works and the building
                  repairs, and we stand behind any household in the village that
                  needs help in a hurry.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <GiveButton size="lg" label="Zakat & Donation" />
                  <Link
                    href="/accounts"
                    className="inline-flex items-center justify-center border border-ink px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-ink hover:text-paper"
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

  return (
    <section
      id="top"
      className="relative isolate flex flex-col border-b-2 border-ink lg:block lg:min-h-[84dvh]"
    >
      {/* ------------------------------------------------------------------
          The plate.
          Phone  — its own band at the top, nothing covering it.
          Desktop — full bleed behind the bookplate.
         ------------------------------------------------------------------ */}
      <div className="relative h-[42dvh] min-h-[270px] w-full lg:absolute lg:inset-0 lg:h-auto lg:min-h-0">
        <Plate />
        {/* Desktop only: lift the plate back so the bookplate reads first */}
        <div aria-hidden className="absolute inset-0 hidden bg-paper/25 lg:block" />
        <div aria-hidden
          className="absolute inset-x-0 bottom-0 h-24 lg:h-40"
          style={{ background: "linear-gradient(to top, var(--color-paper), transparent)" }} />
      </div>

      {/* ------------------------------------------------------------------
          The bookplate. Text always sits on paper — never on the picture.
         ------------------------------------------------------------------ */}
      <div className="relative z-10 w-full px-4 pb-10 sm:px-8 lg:flex lg:min-h-[84dvh] lg:items-end lg:px-12 lg:pb-14">
        <div className="mx-auto w-full max-w-[1320px]">
          <div className="max-w-2xl border border-ink bg-paper">
            <div className="jali-band" />

            <div className="px-5 py-7 sm:px-9 sm:py-9">
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
              <p className="marathi mt-2 text-[19px] text-ink-2 sm:text-[21px]">
                {SOCIETY.nameMarathi}
              </p>

              <p className="mt-5 max-w-xl text-[17px] leading-[1.72] text-ink-2">
                Pewe gaon ki apni welfare society — a public trust of Village
                Pewe, Taluka Guhagar, District Ratnagiri, registered under the
                Maharashtra Public Trusts Act, 1950. It was established to
                develop the village, to collect and distribute Zakat, and to
                carry out welfare projects, with every single rupee accounted
                for and audited.
              </p>
              <p className="mt-4 max-w-xl text-[17px] leading-[1.72] text-ink-2">
                We run the water scheme, the school works and the building
                repairs, and we stand behind any household in the village that
                needs help in a hurry.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <GiveButton size="lg" label="Zakat & Donation" />
                <Link
                  href="/accounts"
                  className="inline-flex items-center justify-center border border-ink px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-ink hover:text-paper"
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
