"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./erp.module.css";

/** The office's menu: a rail on a computer, a sheet behind a button on a phone. */

const GROUPS: { href: string; label: string; admin?: boolean; portal?: boolean }[][] = [
  [
    { href: "/erp", label: "Home" },
    { href: "/erp/money", label: "Money" },
    { href: "/erp/accounts", label: "Accounts" },
    { href: "/erp/families", label: "Families" },
    { href: "/erp/stipends", label: "Monthly help" },
    { href: "/erp/works", label: "Village works" },
  ],
  [
    { href: "/erp/members", label: "Members" },
    { href: "/erp/meetings", label: "Meetings and notices" },
  ],
  [
    { href: "/erp/portal", label: "Members' portal", portal: true },
    { href: "/erp/approvals", label: "Approvals" },
    { href: "/erp/reports", label: "Reports and Excel" },
    { href: "/erp/history", label: "Who changed what" },
  ],
  [
    { href: "/erp/people", label: "People with access", admin: true },
    { href: "/erp/account", label: "My account" },
  ],
];

function isHere(path: string, href: string) {
  return href === "/erp" ? path === "/erp" : path === href || path.startsWith(href + "/");
}

export function Nav({
  admin,
  needsMe = 0,
  portal = null,
}: {
  admin: boolean;
  needsMe?: number;
  /** with the members' portal on: how much there is for the office to do there */
  portal?: number | null;
}) {
  const path = usePathname();
  return (
    <nav className={styles.nav} aria-label="Office">
      {GROUPS.map((g, i) => (
        <div key={i}>
          {i > 0 && <div className={styles.navGroup} />}
          {g
            .filter((l) => (admin || !l.admin) && (portal !== null || !l.portal))
            .map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`${styles.navLink} ${isHere(path, l.href) ? styles.navActive : ""}`}
                aria-current={isHere(path, l.href) ? "page" : undefined}
              >
                {l.label}
                {l.href === "/erp/approvals" && needsMe > 0 && (
                  <span className={styles.badge} aria-label={`${needsMe} waiting for you`}>
                    {needsMe}
                  </span>
                )}
                {l.href === "/erp/portal" && !!portal && (
                  <span className={styles.badge} aria-label={`${portal} waiting for the office`}>
                    {portal}
                  </span>
                )}
              </Link>
            ))}
        </div>
      ))}
    </nav>
  );
}

export function MobileMenu({
  admin,
  name,
  needsMe = 0,
  portal = null,
}: {
  admin: boolean;
  name: string;
  needsMe?: number;
  portal?: number | null;
}) {
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
        {!open && needsMe + (portal ?? 0) > 0 && <span className={styles.badge}>{needsMe + (portal ?? 0)}</span>}
      </button>
      {open && (
        <div id="erp-menu" className={styles.menuSheet}>
          <p className={styles.menuWho}>Signed in as {name}</p>
          <Nav admin={admin} needsMe={needsMe} portal={portal} />
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
