"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { demoAs } from "@/app/erp/actions";
import t from "./demo-tour.module.css";

/**
 * The demo tour's floating card. Each step says who to be and what to do;
 * it ticks itself off when that happens, in order, and the points add up.
 * Progress is kept on this phone only, so the tour carries on as you switch
 * from one sample person to the next.
 */

interface Step {
  key: string;
  as: string;
  title: string;
  how: string;
  /** where "Go" takes you */
  go: (ids: Ids) => string;
  goLabel: string;
  done: (here: Here, ids: Ids) => boolean;
}
interface Ids {
  hospital: number;
  tank: number;
}
interface Here {
  me: string | null;
  path: string;
  q: URLSearchParams;
}

const STEPS: Step[] = [
  {
    key: "card",
    as: "Ayaan",
    title: "Meet your member card",
    how: "Every member has a PSWS number of their own. It is on the green card at the top of Home.",
    go: () => "/erp/me",
    goLabel: "Open Home",
    done: (h) => h.me === "Ayaan" && h.path === "/erp/me",
  },
  {
    key: "open",
    as: "Ayaan",
    title: "Open an appeal",
    how: "Open “Hospital costs for a family in Pewe”. The bar shows how much is in, and how much is being checked.",
    go: (i) => `/erp/me/asks/${i.hospital}`,
    goLabel: "Open the appeal",
    done: (h, i) => h.me === "Ayaan" && h.path === `/erp/me/asks/${i.hospital}`,
  },
  {
    key: "give",
    as: "Ayaan",
    title: "Give ₹1,000",
    how: "Scroll to “Give to this”. Type 1000 and any 12-digit UPI number, then tap “I have sent it”.",
    go: (i) => `/erp/me/asks/${i.hospital}`,
    goLabel: "Go to the form",
    done: (h, i) => h.me === "Ayaan" && h.path === `/erp/me/asks/${i.hospital}` && h.q.get("gave") === "1",
  },
  {
    key: "live",
    as: "",
    title: "Put up the live screen",
    how: "This is the TV view. Open it on a laptop or TV now, and leave it open: it updates by itself.",
    go: () => "/erp/live",
    goLabel: "Open the live screen",
    done: (h) => h.path === "/erp/live",
  },
  {
    key: "office",
    as: "Imran",
    title: "Be the Treasurer",
    how: "Imran checks the bank. His “Members' portal” page lists every payment members said they sent.",
    go: () => "/erp/portal",
    goLabel: "Open Members' portal",
    done: (h) => h.me === "Imran" && h.path === "/erp/portal",
  },
  {
    key: "found",
    as: "Imran",
    title: "Find it in the bank",
    how: "On Ayaan's ₹1,000, tap “Found it: make the receipt”. Watch the live screen: the bar moves by itself.",
    go: () => "/erp/portal",
    goLabel: "Open Members' portal",
    done: (h) => h.me === "Imran" && h.path === "/erp/portal" && h.q.has("found"),
  },
  {
    key: "approve",
    as: "Nadeem",
    title: "Approve an ask",
    how: "Junaid asked for a water tank. One approver said yes; tap “Yes, approve” to be the second. Then every member sees it.",
    go: (i) => `/erp/portal/asks/${i.tank}`,
    goLabel: "Open the water tank ask",
    done: (h) => h.me === "Nadeem" && h.path.startsWith("/erp/portal/asks/") && h.q.get("voted") === "1",
  },
  {
    key: "collect",
    as: "Sana",
    title: "Collect from others",
    how: "Tick “I collected this from others”, 4 people, ₹8,000, any UPI number, then “I have sent it”. It counts as Sana's collection, not her gift.",
    go: (i) => `/erp/me/asks/${i.hospital}`,
    goLabel: "Go to the form",
    done: (h) => h.me === "Sana" && h.q.get("collected") === "1",
  },
  {
    key: "help",
    as: "Huda",
    title: "Help received stays private",
    how: "Huda's Passbook shows the ₹6,000 her family received. Only she and the office can see it.",
    go: () => "/erp/me/passbook",
    goLabel: "Open her Passbook",
    done: (h) => h.me === "Huda" && h.path === "/erp/me/passbook",
  },
  {
    key: "big",
    as: "Rashid",
    title: "A big giver's year",
    how: "Rashid gives lakhs a year. His Passbook lists every receipt and his total, the way Irfan asked.",
    go: () => "/erp/me/passbook",
    goLabel: "Open his Passbook",
    done: (h) => h.me === "Rashid" && h.path === "/erp/me/passbook",
  },
];

const POINTS = 10;
const LEVELS = ["New member", "Giver", "Treasurer's helper", "Committee pro", "PSWS champion"];
const levelFor = (n: number) => LEVELS[Math.min(LEVELS.length - 1, Math.floor((n / STEPS.length) * (LEVELS.length - 1)))];
const KEY = "psws-demo-tour";

function load(): { done: string[]; open: boolean } {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { done: [], open: true, ...JSON.parse(raw) };
  } catch {}
  return { done: [], open: true };
}
function save(s: { done: string[]; open: boolean }) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export function TourFloat({
  me,
  people,
  hospital,
  tank,
  bottom,
}: {
  me: string | null;
  people: Record<string, number>;
  hospital: number;
  tank: number;
  bottom: number;
}) {
  const path = usePathname();
  const q = useSearchParams();
  const ids = { hospital, tank };
  const [done, setDone] = useState<string[]>([]);
  const [open, setOpen] = useState(true);
  const [ready, setReady] = useState(false);
  const [bump, setBump] = useState(0);
  const [all, setAll] = useState(false);
  const finished = ready && done.length >= STEPS.length;

  useEffect(() => {
    const s = load();
    setDone(s.done);
    setOpen(s.open);
    setReady(true);
  }, []);

  const step = STEPS.find((s) => !done.includes(s.key)) ?? null;
  const n = done.length;

  // the current step ticks itself off once it has happened
  useEffect(() => {
    if (!ready || !step) return;
    if (step.done({ me, path, q: new URLSearchParams(q.toString()) }, ids)) {
      const next = [...done, step.key];
      setDone(next);
      setBump((b) => b + 1);
      setOpen(true);
      save({ done: next, open: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, path, q, me, step?.key]);

  if (!ready) return null;
  const toggle = () => {
    setOpen(!open);
    save({ done, open: !open });
  };
  // going to do the step: fold away so the page is free to use; it opens again once the step is done
  const fold = () => {
    setOpen(false);
    save({ done, open: false });
  };
  const restart = () => {
    setDone([]);
    setOpen(true);
    save({ done: [], open: true });
  };
  const skip = () => {
    if (!step) return;
    const next = [...done, step.key];
    setDone(next);
    save({ done: next, open: true });
  };

  const style = { bottom: `calc(${bottom}px + env(safe-area-inset-bottom, 0px))` };
  const pct = Math.round((n / STEPS.length) * 100);

  if (!open)
    return (
      <button type="button" className={t.pill} style={style} onClick={toggle} aria-label="Open the demo tour">
        <span className={t.pillStar} aria-hidden="true">
          ★
        </span>
        <span className={t.pillStep}>
          {step ? `${n + 1}/${STEPS.length} ${step.title}` : "Tour complete"}
        </span>
        <span className={t.pillPts}>{n * POINTS} pts</span>
      </button>
    );

  const needSwitch = step && step.as && step.as !== me;
  return (
    <section className={t.card} style={style} aria-label="Demo tour">
      <header className={t.head}>
        <span className={t.level}>{step ? levelFor(n) : "PSWS champion"}</span>
        <span key={bump} className={`${t.pts} ${bump ? t.ptsBump : ""}`}>
          {n * POINTS} pts
        </span>
        <button type="button" className={t.close} onClick={toggle} aria-label="Hide the tour">
          –
        </button>
      </header>
      <div className={t.bar} role="progressbar" aria-valuenow={n} aria-valuemin={0} aria-valuemax={STEPS.length}>
        <span style={{ width: `${pct}%` }} />
      </div>

      {step ? (
        <>
          <p className={t.stepNo}>
            Step {n + 1} of {STEPS.length}
            {step.as ? ` · as ${step.as}` : ""}
          </p>
          <h2 className={t.title}>{step.title}</h2>
          <p className={t.how}>{step.how}</p>
          <div className={t.acts}>
            {needSwitch ? (
              <form action={demoAs} onSubmit={fold}>
                <input type="hidden" name="id" value={people[step.as] ?? ""} />
                <input type="hidden" name="next" value={step.go(ids)} />
                <button type="submit" className={t.go}>
                  Be {step.as}
                </button>
              </form>
            ) : (
              <Link href={step.go(ids)} className={t.go} onClick={fold}>
                {step.goLabel}
              </Link>
            )}
            <button type="button" className={t.skip} onClick={skip}>
              Skip
            </button>
          </div>
          {needSwitch && <p className={t.note}>You are {me ?? "not signed in"}. This step is done as {step.as}.</p>}
        </>
      ) : (
        <div className={t.won}>
          <div className={t.confetti} aria-hidden="true">
            {Array.from({ length: 14 }, (_, i) => (
              <i key={i} style={{ left: `${(i * 7 + 4) % 100}%`, animationDelay: `${(i % 7) * 90}ms` }} />
            ))}
          </div>
          <h2 className={t.title}>Tour complete</h2>
          <p className={t.how}>
            {STEPS.length * POINTS} points. You have seen every part: giving, the Treasurer&apos;s check, approvals, collecting
            from others, private help and a big giver&apos;s year.
          </p>
        </div>
      )}

      {!finished && (
      <button type="button" className={t.more} onClick={() => setAll(!all)} aria-expanded={all}>
        {all ? "Hide the steps" : `See all ${STEPS.length} steps`}
      </button>
      )}
      {(all || finished) && (
        <>
          <ol className={t.list}>
            {STEPS.map((s, i) => (
              <li key={s.key} className={done.includes(s.key) ? t.ok : step?.key === s.key ? t.now : ""}>
                <span aria-hidden="true">{done.includes(s.key) ? "✓" : i + 1}</span>
                {s.title}
              </li>
            ))}
          </ol>
          <button type="button" className={t.restart} onClick={restart}>
            Start again
          </button>
        </>
      )}
    </section>
  );
}
