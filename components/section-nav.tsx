"use client";

import { useEffect, useState } from "react";

export type NavSection = { id: string; label: string };

/**
 * The anti-lost bar. Sticks under the masthead once the hero has passed,
 * shows every section of the page and which one you are standing in.
 * On a phone it scrolls sideways and keeps the active chip in view.
 */
export function SectionNav({ sections }: { sections: NavSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const nodes = sections
      .map((s) => document.getElementById(s.id))
      .filter((n): n is HTMLElement => n !== null);
    if (nodes.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        // The section whose top is nearest the top of the viewport wins.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -55% 0px", threshold: 0 }
    );

    nodes.forEach((n) => io.observe(n));

    const onScroll = () => setStuck(window.scrollY > 200);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [sections]);

  // Keep the active chip visible on narrow screens.
  // Set scrollLeft on the strip directly — scrollIntoView would also scroll
  // the page vertically to bring the bar into view, yanking the reader
  // away from wherever they actually were.
  useEffect(() => {
    const chip = document.querySelector<HTMLElement>(`[data-navchip="${active}"]`);
    const strip = chip?.parentElement?.parentElement;
    if (!chip || !strip) return;
    const target = chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2;
    strip.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [active]);

  return (
    <nav
      aria-label="On this page"
      className={`sticky top-0 z-30 border-b-2 border-ink bg-paper/95 backdrop-blur-sm transition-shadow no-print ${
        stuck ? "border-t border-t-rule" : ""
      }`}
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-8 lg:px-12">
        <ul className="scroll-thin flex gap-1 overflow-x-auto py-1.5">
          {sections.map((s) => {
            const on = active === s.id;
            return (
              <li key={s.id} className="shrink-0">
                <a
                  href={`#${s.id}`}
                  data-navchip={s.id}
                  aria-current={on ? "true" : undefined}
                  className={`block whitespace-nowrap px-3 py-2 text-[13px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                    on
                      ? "bg-ink text-paper"
                      : "text-ink-2 hover:bg-paper-2 hover:text-maroon"
                  }`}
                >
                  {s.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
