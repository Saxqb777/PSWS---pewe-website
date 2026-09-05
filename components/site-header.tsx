"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SOCIETY } from "@/lib/site";
import { Seal } from "@/components/seal";
import { GiveButton } from "@/components/give-panel";

/** Four destinations. Everything else lives as a section of the home page. */
const NAV = [
  { href: "/", label: "Home", hinglish: "Mukhya" },
  { href: "/about", label: "The Society", hinglish: "Society ke baare mein" },
  { href: "/projects", label: "Projects", hinglish: "Gaon ke kaam" },
  { href: "/accounts", label: "Accounts", hinglish: "Poora hisaab" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-40 bg-paper">
      {/* Prototype strip — nobody should mistake this for the live office record. */}
      <div className="bg-ink text-paper no-print">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 sm:px-8 lg:px-12">
          <p className="text-[12.5px] leading-tight">
            <span className="font-semibold uppercase tracking-[0.12em] text-brass-light">Prototype</span>
            <span className="mx-2 opacity-40">|</span>
            Sample figures. Nothing here is a live record yet.
          </p>
          <p className="num text-[12.5px] opacity-70">{SOCIETY.website}</p>
        </div>
      </div>

      {/* Masthead */}
      <div className="border-b-2 border-ink">
        <div className="mx-auto flex max-w-[1320px] items-center gap-4 px-4 py-4 sm:px-8 lg:px-12">
          <Link href="/" className="flex min-w-0 items-center gap-3.5">
            <Seal size={46} />
            <span className="min-w-0">
              <span className="display block text-[19px] leading-tight sm:text-[22px]">
                {SOCIETY.name}
              </span>
              <span className="marathi block text-[13px] leading-tight text-ink-3">
                {SOCIETY.nameMarathi} · Reg. {SOCIETY.registrationNo}
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="ml-auto hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV.map((item) => {
                const active =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block px-4 py-2.5 text-[13px] font-semibold uppercase tracking-[0.09em] transition-colors ${
                        active ? "bg-ink text-paper" : "text-ink-2 hover:text-maroon"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-3 lg:ml-4">
            <span className="hidden sm:block">
              <GiveButton size="md" label="Sadaqah dijiye" />
            </span>
            <Link
              href="/login"
              className="hidden border border-ink px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.09em] text-ink transition-colors hover:bg-ink hover:text-paper xl:inline-block"
            >
              Members' Portal
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label="Menu"
              className="flex h-11 w-11 flex-col items-center justify-center gap-[5px] border border-ink lg:hidden cursor-pointer"
            >
              <span className={`block h-[1.5px] w-5 bg-ink transition-transform ${open ? "translate-y-[6.5px] rotate-45" : ""}`} />
              <span className={`block h-[1.5px] w-5 bg-ink transition-opacity ${open ? "opacity-0" : ""}`} />
              <span className={`block h-[1.5px] w-5 bg-ink transition-transform ${open ? "-translate-y-[6.5px] -rotate-45" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu — each item carries its Hinglish line so nobody has to guess */}
      {open && (
        <nav className="border-b-2 border-ink bg-paper-2 lg:hidden">
          <ul className="mx-auto max-w-[1320px] px-4 py-1 sm:px-8">
            {NAV.map((item) => (
              <li key={item.href} className="border-b border-rule">
                <Link href={item.href} onClick={() => setOpen(false)} className="block py-3.5">
                  <span className="block text-[15.5px] font-semibold uppercase tracking-[0.08em] text-ink">
                    {item.label}
                  </span>
                  <span className="block text-[14px] italic text-brass">{item.hinglish}</span>
                </Link>
              </li>
            ))}
            <li className="border-b border-rule">
              <Link href="/login" onClick={() => setOpen(false)} className="block py-3.5">
                <span className="block text-[15.5px] font-semibold uppercase tracking-[0.08em] text-ink">
                  Members' Portal
                </span>
                <span className="block text-[14px] italic text-brass">Office ka hissa</span>
              </Link>
            </li>
            <li className="py-4">
              <GiveButton size="lg" fullWidth label="Sadaqah dijiye · Give" />
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
