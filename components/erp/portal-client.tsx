"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./erp.module.css";
import p from "./portal.module.css";

/** The portal's tabs, along the bottom where a thumb reaches. */
const TABS = [
  { href: "/erp/me", label: "Home", hi: "Ghar" },
  { href: "/erp/me/asks", label: "Asks", hi: "Chanda" },
  { href: "/erp/me/passbook", label: "Passbook", hi: "Hisaab" },
  { href: "/erp/me/notices", label: "Notices", hi: "Khabar" },
  { href: "/erp/me/card", label: "Me", hi: "Main" },
];

export function TabBar({ waiting = 0 }: { waiting?: number }) {
  const path = usePathname();
  const here = (href: string) => (href === "/erp/me" ? path === href : path === href || path.startsWith(href + "/"));
  return (
    <nav className={p.tabs} aria-label="My PSWS">
      <div className={p.tabsInner}>
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`${p.tab} ${here(t.href) ? p.tabHere : ""}`}
            aria-current={here(t.href) ? "page" : undefined}
          >
            {t.label}
            <small>{t.hi}</small>
            {t.href === "/erp/me/card" && waiting > 0 && <span className={p.tabBadge}>{waiting}</span>}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/**
 * Keeps a page live: every few seconds, while it is on screen, the page is
 * fetched again and only what changed moves (a bar grows, a line appears).
 */
export function AutoRefresh({ every = 5000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const t = window.setInterval(tick, every);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, every]);
  return null;
}

/** Send an ask to the family WhatsApp group, or copy its link. */
export function ShareAsk({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState(path);
  useEffect(() => setUrl(window.location.origin + path), [path]);
  const text = `${title}\n\nPSWS members can see it and give on their portal:\n${url}`;
  return (
    <div className={styles.actions}>
      <a
        className={styles.btnQuiet}
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Share on WhatsApp
      </a>
      <button
        type="button"
        className={styles.btnQuiet}
        onClick={() =>
          navigator.clipboard?.writeText(url).then(
            () => setCopied(true),
            () => setCopied(false),
          )
        }
      >
        {copied ? "Copied" : "Copy the link"}
      </button>
    </div>
  );
}
