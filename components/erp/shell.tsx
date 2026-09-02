"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Seal } from "@/components/seal";
import { SOCIETY, FISCAL_YEAR } from "@/lib/site";
import { ROLE_LABEL, type Role } from "@/lib/mock-data";

const SECTIONS: { title: string; items: { href: string; label: string; note?: string }[] }[] = [
  {
    title: "Overview",
    items: [{ href: "/erp", label: "Dashboard" }],
  },
  {
    title: "Money",
    items: [
      { href: "/erp/donations", label: "Donations ledger" },
      { href: "/erp/campaigns", label: "Campaigns" },
      { href: "/erp/reports", label: "Reports & audit" },
    ],
  },
  {
    title: "Welfare",
    items: [{ href: "/erp/zakat", label: "Zakat requests", note: "3" }],
  },
  {
    title: "Works",
    items: [{ href: "/erp/projects", label: "Projects & quotations" }],
  },
  {
    title: "People",
    items: [
      { href: "/erp/members", label: "Members" },
      { href: "/erp/scorecards", label: "Scorecards" },
    ],
  },
  {
    title: "Publish",
    items: [
      { href: "/erp/notices", label: "Notices" },
      { href: "/erp/sponsors", label: "Sponsors" },
    ],
  },
];

const WHO: Record<Role, string> = {
  ADMIN: "Abdul Rafiq Kazi",
  COMMITTEE: "Mushtaq Ali Dalvi",
  AUDITOR: "Shakeel Ahmed Bhatkar",
  MEMBER: "Zubair Ahmed Bagwan",
};

const WHO_ID: Record<Role, string> = {
  ADMIN: "PSWS-001",
  COMMITTEE: "PSWS-006",
  AUDITOR: "PSWS-005",
  MEMBER: "PSWS-011",
};

export function ErpShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("COMMITTEE");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("psws-proto-role") as Role | null;
      if (stored && stored in ROLE_LABEL) setRole(stored);
    } catch {
      /* fall back to Committee */
    }
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      {/* ---------------- SIDEBAR ---------------- */}
      <aside
        className={`bg-ink text-paper lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto ${
          open ? "block" : "hidden lg:block"
        }`}
      >
        <div className="border-b border-paper/15 px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="bg-paper p-1">
              <Seal size={30} />
            </span>
            <span className="min-w-0">
              <span className="display block text-[15px] leading-tight text-paper">
                {SOCIETY.shortName} Office
              </span>
              <span className="num block text-[10.5px] text-paper/55">
                {FISCAL_YEAR}
              </span>
            </span>
          </Link>
        </div>

        <nav className="px-3 py-4">
          {SECTIONS.map((sec) => (
            <div key={sec.title} className="mb-5">
              <div className="label px-2 pb-1.5" style={{ color: "var(--color-brass-light)" }}>
                {sec.title}
              </div>
              <ul>
                {sec.items.map((item) => {
                  const active =
                    item.href === "/erp"
                      ? pathname === "/erp"
                      : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center justify-between gap-2 px-2 py-2 text-[13px] transition-colors ${
                          active
                            ? "bg-paper text-ink font-semibold"
                            : "text-paper/75 hover:bg-paper/10 hover:text-paper"
                        }`}
                      >
                        <span>{item.label}</span>
                        {item.note && (
                          <span
                            className={`num border px-1.5 text-[10px] leading-tight ${
                              active ? "border-maroon text-maroon" : "border-brass-light text-brass-light"
                            }`}
                          >
                            {item.note}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-paper/15 px-5 py-4">
          <div className="label" style={{ color: "var(--color-brass-light)" }}>
            Signed in as
          </div>
          <div className="mt-1.5 text-[13.5px] font-semibold text-paper">{WHO[role]}</div>
          <div className="num text-[11px] text-paper/55">
            {WHO_ID[role]} · {ROLE_LABEL[role]}
          </div>
          <Link
            href="/login"
            className="mt-3 inline-block border border-paper/35 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-paper/85 transition-colors hover:bg-paper hover:text-ink"
          >
            Switch role
          </Link>
        </div>
      </aside>

      {/* ---------------- MAIN ---------------- */}
      <div className="min-w-0">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b-2 border-ink bg-paper px-4 py-2.5 sm:px-6">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="flex h-9 w-9 flex-col items-center justify-center gap-[5px] border border-ink lg:hidden cursor-pointer"
          >
            <span className="block h-[1.5px] w-4 bg-ink" />
            <span className="block h-[1.5px] w-4 bg-ink" />
            <span className="block h-[1.5px] w-4 bg-ink" />
          </button>

          <p className="flex-1 text-[11.5px] leading-tight text-ink-2">
            <span className="font-semibold uppercase tracking-[0.12em] text-maroon">
              Prototype
            </span>
            <span className="mx-2 text-rule-strong">|</span>
            <span className="hidden sm:inline">
              Sample data. Buttons explain what they will do; nothing is saved.
            </span>
            <span className="sm:hidden">Sample data — nothing is saved.</span>
          </p>

          <Link
            href="/"
            className="shrink-0 border border-ink px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            Public site
          </Link>
        </div>

        <main className="px-4 py-8 sm:px-6 sm:py-10 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
