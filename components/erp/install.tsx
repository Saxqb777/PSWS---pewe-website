"use client";

import { useEffect, useState } from "react";

/**
 * Keeping My PSWS on the phone's home screen. Android offers a button; an
 * iPhone needs two taps in Safari, which we explain. Once it is on the home
 * screen, or the member says not now, nothing more is said about it.
 */

type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export type InstallWay = "button" | "iphone" | null;

let saved: Prompt | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    saved = e as Prompt;
    listeners.forEach((f) => f());
  });
  window.addEventListener("appinstalled", () => {
    saved = null;
    listeners.forEach((f) => f());
  });
}

const onHomeScreen = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

export function useInstall() {
  const [way, setWay] = useState<InstallWay>(null);
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/erp/sw.js", { scope: "/erp/" }).catch(() => {});
    const check = () => setWay(onHomeScreen() ? null : saved ? "button" : isIphone() ? "iphone" : null);
    check();
    listeners.add(check);
    return () => {
      listeners.delete(check);
    };
  }, []);
  const install = async () => {
    if (!saved) return;
    await saved.prompt();
    await saved.userChoice.catch(() => null);
    saved = null;
    listeners.forEach((f) => f());
  };
  return { way, install };
}

const NOT_NOW = "psws-install-not-now";

/** A quiet card on the home page, until it is on the home screen or put away. */
export function InstallCard({ className, button }: { className: string; button: string }) {
  const { way, install } = useInstall();
  const [away, setAway] = useState(true);
  useEffect(() => {
    try {
      setAway(localStorage.getItem(NOT_NOW) === "1");
    } catch {
      setAway(false);
    }
  }, []);
  if (!way || away) return null;
  const putAway = () => {
    setAway(true);
    try {
      localStorage.setItem(NOT_NOW, "1");
    } catch {}
  };
  return (
    <aside className={className} aria-label="Keep PSWS on your phone">
      {/* eslint-disable-next-line @next/next/no-img-element -- the app's own small icon */}
      <img src="/erp/icons/icon-192.png" alt="" width={44} height={44} />
      <div>
        <b>Keep PSWS on your phone</b>
        {way === "button" ? (
          <span>Opens like an app, straight to your page.</span>
        ) : (
          <span>
            In Safari, tap <Share /> Share, then <b>Add to Home Screen</b>.
          </span>
        )}
        <span>
          {way === "button" && (
            <button type="button" className={button} onClick={install}>
              Add to home screen
            </button>
          )}
          <button type="button" onClick={putAway} data-quiet>
            Not now
          </button>
        </span>
      </div>
    </aside>
  );
}

/** The iPhone's share mark, so the member knows which button is meant. */
export function Share() {
  return (
    <svg viewBox="0 0 16 20" width="13" height="16" aria-hidden="true" style={{ verticalAlign: "-2px" }}>
      <path d="M8 1v11M4.5 4.5 8 1l3.5 3.5M5 8H2v11h12V8h-3" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
