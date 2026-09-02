"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SOCIETY } from "@/lib/site";
import { Seal } from "@/components/seal";

const NAV = [
  { href: "/about", label: "The Society" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/projects", label: "Projects" },
  { href: "/zakat", label: "Zakat & Welfare" },
  { href: "/notices", label: "Notices" },
  { href: "/sponsors", label: "Sponsors" },
  { href: "/reports", label: "Accounts" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-40 bg-paper">
      {/* Prototype strip — nobody should mistake this for the live office record. */}
      <div className="bg-ink text-paper no-print">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-2 sm:px-8 lg:px-12">
          <p className="text-[11px] leading-tight tracking-[0.03em]">
            <span className="font-semibold uppercase tracking-[0.12em] text-brass-light">
              Prototype
            </span>
            <span className="mx-2 opacity-40">|</span>
            Sample figures. Nothing on this site is a live record yet.
          </p>
          <p className="num text-[11px] opacity-70">{SOCIETY.website}</p>
        </div>
      </div>

      {/* Masthead */}
      <div className="border-b border-rule">
        <div className="mx-auto flex max-w-[1320px] items-center gap-4 px-5 py-4 sm:px-8 lg:px-12">
          <Link href="/" className="flex min-w-0 items-center gap-3.5">
            <Seal size={46} />
            <span className="min-w-0">
              <span className="display block truncate text-[19px] leading-tight sm:text-[21px]">
                {SOCIETY.name}
              </span>
              <span className="marathi block truncate text-[12.5px] leading-tight text-ink-3">
                {SOCIETY.nameMarathi} · Reg. {SOCIETY.registrationNo}
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/donate"
              className="hidden border border-maroon bg-maroon px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-paper transition-colors hover:bg-maroon-dark sm:inline-block"
            >
              Donate
            </Link>
            <Link
              href="/login"
              className="hidden border border-ink px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-ink hover:text-paper lg:inline-block"
            >
              Members' Portal
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label="Menu"
              className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] border border-ink lg:hidden cursor-pointer"
            >
              <span className={`block h-[1.5px] w-5 bg-ink transition-transform ${open ? "translate-y-[6.5px] rotate-45" : ""}`} />
              <span className={`block h-[1.5px] w-5 bg-ink transition-opacity ${open ? "opacity-0" : ""}`} />
              <span className={`block h-[1.5px] w-5 bg-ink transition-transform ${open ? "-translate-y-[6.5px] -rotate-45" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop navigation */}
      <nav className="hidden border-b-2 border-ink lg:block">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <ul className="-mx-3 flex flex-wrap">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block px-3 py-3 text-[11.5px] font-semibold uppercase tracking-[0.11em] transition-colors ${
                      active
                        ? "text-maroon border-b-2 border-maroon -mb-[2px]"
                        : "text-ink-2 hover:text-maroon"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Mobile navigation */}
      {open && (
        <nav className="border-b-2 border-ink bg-paper-2 lg:hidden">
          <ul className="mx-auto max-w-[1320px] px-5 py-2 sm:px-8">
            {[...NAV, { href: "/donate", label: "Donate" }, { href: "/login", label: "Members' Portal" }].map((item) => (
              <li key={item.href} className="border-b border-rule last:border-0">
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
