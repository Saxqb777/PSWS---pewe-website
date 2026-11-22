"use client";

import { useEffect, useRef, useState } from "react";
import { Share, useInstall } from "./install";
import p from "./portal.module.css";

/**
 * The first time a member opens My PSWS on a phone: a short walk along the
 * tab bar, each step lighting up the real tab it is about. Seen once per
 * phone; "Skip" ends it at once.
 */

const SEEN = "psws-tour-seen";

const STEPS: { tab: string | null; title: string; body: string }[] = [
  {
    tab: "/erp/me",
    title: "Home",
    body: "Your PSWS card, the appeals open now, and what is happening in the village as it happens. Tap Give to tell the office what you sent.",
  },
  {
    tab: "/erp/me/asks",
    title: "Donate",
    body: "When a family needs help or the village needs work done, it goes up here once two approvers agree. Watch it fill, and see photos of what the money did.",
  },
  {
    tab: "/erp/me/passbook",
    title: "Passbook",
    body: "Every rupee you gave and received, each with its receipt. Choose any two dates and print a statement.",
  },
  {
    tab: "/erp/me/notices",
    title: "Notices",
    body: "Meetings and news from the office. Tap “I'm coming” so they know how many to expect.",
  },
  {
    tab: "/erp/me/card",
    title: "Me",
    body: "Your PSWS number and details, a line to the office when you need something, and your password. Your passbook is seen only by you and the office.",
  },
];

export function WelcomeTour({ name, off }: { name: string; off: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(-1);
  const { way, install } = useInstall();
  const next = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (off) return;
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN) === "1";
    } catch {}
    if (!seen) setOpen(true);
  }, [off]);

  const steps = way ? [...STEPS, { tab: null, title: "Keep it on your phone", body: "" }] : STEPS;
  const s = step >= 0 ? steps[step] : null;

  useEffect(() => {
    const html = document.documentElement;
    if (open) html.dataset.tour = s?.tab ?? "";
    else delete html.dataset.tour;
    next.current?.focus();
    return () => {
      delete html.dataset.tour;
    };
  }, [open, s?.tab]);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(SEEN, "1");
    } catch {}
  };

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  });

  if (!open) return null;
  const last = step === steps.length - 1;

  return (
    <div className={p.tour} role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className={p.tourSheet} key={step}>
        {step < 0 ? (
          <>
            <p className={p.tourStep}>My PSWS</p>
            <h2 id="tour-title" className={p.tourTitle}>
              Welcome, {name.split(" ")[0]}
            </h2>
            <p className={p.tourBody}>
              This is My PSWS, your own page in the Pewe Social Welfare Society. The five tabs along the bottom are all there is.
              A quick look at each?
            </p>
          </>
        ) : (
          <>
            <p className={p.tourStep}>
              {step + 1} of {steps.length}
            </p>
            <h2 id="tour-title" className={p.tourTitle}>
              {s!.title}
            </h2>
            {s!.body ? (
              <p className={p.tourBody}>{s!.body}</p>
            ) : way === "button" ? (
              <p className={p.tourBody}>Put PSWS on your home screen. It opens like an app, straight to your page.</p>
            ) : (
              <p className={p.tourBody}>
                In Safari, tap <Share /> <b>Share</b> at the bottom of the screen, then <b>Add to Home Screen</b>. PSWS then opens like
                an app, straight to your page.
              </p>
            )}
          </>
        )}
        <div className={p.tourBar}>
          {last ? (
            <span />
          ) : (
            <button type="button" className={p.tourSkip} onClick={close}>
              {step < 0 ? "Not now" : "Skip"}
            </button>
          )}
          {step >= 0 && (
            <span className={p.tourDots} aria-hidden="true">
              {steps.map((_, i) => (
                <i key={i} data-on={i === step || undefined} />
              ))}
            </span>
          )}
          {last && way === "button" ? (
            <button
              ref={next}
              type="button"
              className={p.tourNext}
              onClick={async () => {
                await install();
                close();
              }}
            >
              Add to home screen
            </button>
          ) : (
            <button ref={next} type="button" className={p.tourNext} onClick={() => (last ? close() : setStep(step + 1))}>
              {step < 0 ? "Show me" : last ? "Start" : "Next"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
