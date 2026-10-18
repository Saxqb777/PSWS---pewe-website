"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./erp.module.css";

/** The office's menu: a rail on a computer, a sheet behind a button on a phone. */

const GROUPS: { name: string; links: { href: string; en: string; hi: string; admin?: boolean }[] }[] = [
  {
    name: "Every day",
    links: [
      { href: "/erp", en: "Home", hi: "Shuru" },
      { href: "/erp/money", en: "Money", hi: "Hisaab" },
      { href: "/erp/families", en: "Families", hi: "Parivaar" },
      { href: "/erp/stipends", en: "Monthly stipends", hi: "Maheena" },
      { href: "/erp/works", en: "Village works", hi: "Gaon ke kaam" },
    ],
  },
  {
    name: "The Society",
    links: [
      { href: "/erp/members", en: "Members", hi: "Sadasya" },
      { href: "/erp/meetings", en: "Meetings and notices", hi: "Meeting" },
    ],
  },
  {
    name: "Records",
    links: [
      { href: "/erp/reports", en: "Reports and Excel", hi: "Report" },
      { href: "/erp/history", en: "Who changed what", hi: "Kisne kya kiya" },
    ],
  },
  {
    name: "Settings",
    links: [
      { href: "/erp/people", en: "People with access", hi: "Kaun dekh sakta hai", admin: true },
      { href: "/erp/account", en: "My account", hi: "Mera password" },
    ],
  },
];

function isHere(path: string, href: string) {
  return href === "/erp" ? path === "/erp" : path === href || path.startsWith(href + "/");
}

export function Nav({ admin }: { admin: boolean }) {
  const path = usePathname();
  return (
    <nav className={styles.nav} aria-label="Office">
      {GROUPS.map((g) => (
        <div key={g.name}>
          <p className={styles.navGroup}>{g.name}</p>
          {g.links
            .filter((l) => admin || !l.admin)
            .map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`${styles.navLink} ${isHere(path, l.href) ? styles.navActive : ""}`}
                aria-current={isHere(path, l.href) ? "page" : undefined}
              >
                <span>{l.en}</span>
                <small>{l.hi}</small>
              </Link>
            ))}
        </div>
      ))}
    </nav>
  );
}

export function MobileMenu({ admin, name }: { admin: boolean; name: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return (
    <>
      <button
        type="button"
        className={styles.menuButton}
        aria-expanded={open}
        aria-controls="erp-menu"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Close" : "Menu"}
      </button>
      {open && (
        <div id="erp-menu" className={styles.menuSheet}>
          <p className={styles.navGroup}>Signed in as {name}</p>
          <Nav admin={admin} />
        </div>
      )}
    </>
  );
}

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button type="button" className={styles.btnQuiet} onClick={() => window.print()}>
      {label}
    </button>
  );
}
