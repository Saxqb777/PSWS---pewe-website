"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SOCIETY } from "@/lib/site";
import type { PeweEngine, ClockInfo } from "./engine/engine";
import { CARD_ORDER, PLACES, PLACE_BY_ID, crore, lakh, type PlaceId } from "./places";
import { COMMITTEE, COSTED_WORKS, ELEVEN_YEARS, GIVE_WAYS, NOTICES, THREE_HEADS, WORKS, ZAKAT_HEADS } from "./content";
import { ToFill } from "./to-fill";
import { YearsChart } from "./years-chart";
import { Statement } from "./statement";
import { STATEMENT } from "@/lib/record";
import { Seal } from "@/components/seal";
import { rupees } from "@/lib/format";
import styles from "./pewe.module.css";

type Phase = "loading" | "lite" | "intro" | "explore" | "tour" | "fallback";

/** Data Saver on, or a 2G connection: show the picture first and let the visitor ask for the 3D. */
function onSlowData() {
  const c = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  return !!c && (!!c.saveData || /(^|-)2g$/.test(c.effectiveType ?? ""));
}

const SECTIONS = [
  { id: "about", label: "Who we are" },
  { id: "committee", label: "Committee" },
  { id: "accounts", label: "Accounts" },
  { id: "work", label: "Our work" },
  { id: "zakat", label: "Zakat & help" },
  { id: "notices", label: "Notices" },
  { id: "contact", label: "Contact" },
] as const;

const isPlace = (s: string | null | undefined): s is PlaceId => !!s && s in PLACE_BY_ID;

function safeGet(k: string) {
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
}
function safeSet(k: string, v: string) {
  try {
    window.localStorage.setItem(k, v);
  } catch {
    /* private mode: nothing to remember */
  }
}

function webglAvailable() {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

/** A Date for today in Pewe at the given minute of the day. */
function peweToday(minutes: number) {
  const ist = new Date(Date.now() + 330 * 60000);
  const midnight = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - 330 * 60000;
  return new Date(midnight + minutes * 60000);
}

function peweMinutesNow() {
  const ist = new Date(Date.now() + 330 * 60000);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
}

const fmt = (m: number) => {
  const h = Math.floor(m / 60);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};

/**
 * The front page. `draft` is true on the private preview: the boxes that
 * list what the office still has to fill in show there, and nowhere else.
 */
export function PeweExperience({
  initialPlace = null,
  draft = false,
}: {
  initialPlace?: PlaceId | null;
  draft?: boolean;
}) {
  const heroRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PeweEngine | null>(null);
  const activeRef = useRef<PlaceId | null>(null);

  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(0.05);
  const [introGone, setIntroGone] = useState(false);
  const [active, setActive] = useState<PlaceId | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const [tourP, setTourP] = useState(0);
  const [clock, setClock] = useState<ClockInfo | null>(null);
  const [timeOpen, setTimeOpen] = useState(false);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [coarse, setCoarse] = useState(false);

  // the open place lives in the address, so a copied link opens it again
  const setHash = (id: PlaceId | null) => {
    const url = new URL(window.location.href);
    url.searchParams.delete("p");
    if (!id && !isPlace(url.hash.slice(1))) return;
    window.history.replaceState(null, "", url.pathname + url.search + (id ? `#${id}` : ""));
  };

  // bring the map up the screen; on a phone the text sits above it, so go to the map itself
  const revealMap = () => {
    const phone = window.innerWidth <= 760;
    const el = phone ? stageRef.current : heroRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (Math.abs(top) > 80) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const startTour = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    activeRef.current = null;
    setActive(null);
    setHash(null);
    setPlacesOpen(false);
    setTimeOpen(false);
    setPhase("tour");
    setTourP(0);
    safeSet("pewe:seen", "1");
    await engine.tour((line, p) => {
      setCaption(line);
      setTourP(p);
    });
    setCaption(null);
    setPhase("explore");
  }, []);

  const select = useCallback(
    (id: PlaceId) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (id === "busstop") {
        void startTour();
        return;
      }
      if (phase === "tour") engine.cancelTour();
      activeRef.current = id;
      setActive(id);
      setHash(id);
      // after the places list has folded away, so the scroll lands where it should
      if (window.innerWidth <= 760) requestAnimationFrame(() => requestAnimationFrame(revealMap));
      setPlacesOpen(false);
      setCaption(null);
      setPhase("explore");
      engine.focus(id);
      void engine.flyTo(id);
    },
    [phase, startTour],
  );

  const close = useCallback(() => {
    const engine = engineRef.current;
    const was = activeRef.current;
    activeRef.current = null;
    setActive(null);
    setHash(null);
    engine?.focus(null);
    if (was === "world") void engine?.flyTo("home");
  }, []);

  const next = useCallback(() => {
    const cur = activeRef.current;
    const i = cur ? CARD_ORDER.indexOf(cur) : -1;
    select(CARD_ORDER[(i + 1) % CARD_ORDER.length]);
  }, [select]);

  const skipTour = useCallback(() => {
    engineRef.current?.cancelTour();
    setCaption(null);
    setPhase("explore");
  }, []);

  /** From the sections below: go up to the map and open a place there. */
  const showOnMap = (id: PlaceId) => {
    setMenuOpen(false);
    revealMap();
    window.setTimeout(() => select(id), 450);
  };

  const selectRef = useRef(select);
  selectRef.current = select;

  // 0 until the 3D is wanted: straight away, unless the visitor is on slow or metered data
  const [go, setGo] = useState(0);

  useEffect(() => {
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
    if (!webglAvailable()) {
      setPhase("fallback");
      return;
    }
    const q = new URLSearchParams(window.location.search);
    if (go === 0 && (q.get("lite") === "1" || onSlowData())) {
      setPhase("lite");
      return;
    }
    let disposed = false;
    let engine: PeweEngine | null = null;
    const lowPower =
      q.get("low") === "1" ||
      window.matchMedia("(pointer: coarse)").matches ||
      Math.min(window.innerWidth, window.innerHeight) < 700 ||
      (navigator.hardwareConcurrency ?? 8) <= 4;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeQ = q.get("time");
    const monthQ = Number(q.get("month"));

    (async () => {
      try {
        const { createEngine } = await import("./engine/engine");
        if (disposed || !canvasRef.current || !labelsRef.current) return;
        engine = await createEngine(canvasRef.current, {
          lowPower,
          reducedMotion: reduced,
          portrait: window.innerHeight > window.innerWidth,
          labelRoot: labelsRef.current,
          labelClasses: {
            root: styles.labels,
            major: styles.major,
            minor: styles.minor,
            city: styles.city,
            active: styles.active,
            tag: styles.tag,
            stem: styles.stem,
          },
          timeOverride:
            timeQ && /^\d{1,2}:\d{2}$/.test(timeQ)
              ? peweToday(Number(timeQ.split(":")[0]) * 60 + Number(timeQ.split(":")[1]))
              : null,
          monthOverride: monthQ >= 1 && monthQ <= 12 ? monthQ : null,
          weatherOverride: q.get("weather"),
          onSelect: (id) => selectRef.current(id),
          onClock: (c) => setClock(c),
          onProgress: (p) => setProgress(p),
        });
        if (disposed) {
          engine.dispose();
          return;
        }
        engineRef.current = engine;
        const hash = window.location.hash.slice(1);
        const deep = initialPlace ?? (isPlace(hash) ? hash : null);
        const seen = safeGet("pewe:seen");
        setIntroGone(true);
        // if the visitor starts the tour or picks a place mid-intro, the intro gives way
        if (deep === "busstop") {
          const whole = await engine.playIntro(reduced ? "none" : "short");
          if (!disposed && whole) await startTour();
        } else if (deep) {
          setPhase("explore");
          const whole = await engine.playIntro(reduced ? "none" : "short");
          if (!disposed && whole) selectRef.current(deep);
        } else {
          setPhase("intro");
          await engine.playIntro(reduced ? "none" : seen ? "short" : "full");
          safeSet("pewe:seen", "1");
          if (!disposed) setPhase((p) => (p === "intro" ? "explore" : p));
        }
      } catch (e) {
        console.error(e);
        if (!disposed) setPhase("fallback");
      }
    })();

    const onResize = () => engine?.resize();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (activeRef.current) close();
      else skipTour();
      setPlacesOpen(false);
      setTimeOpen(false);
      setMenuOpen(false);
    };
    // stop drawing the map while it is scrolled out of view
    const io = new IntersectionObserver(([entry]) => engine?.setPaused(!entry.isIntersecting), { threshold: 0.02 });
    if (heroRef.current) io.observe(heroRef.current);
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    return () => {
      disposed = true;
      io.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      engine?.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go]);

  // keep the open place in view beside (or above) its card, and the village clear of the welcome text
  useEffect(() => {
    const engine = engineRef.current;
    const stage = stageRef.current;
    if (!engine || !stage) return;
    const place = () => {
      const s = stage.getBoundingClientRect();
      const phone = window.innerWidth <= 760;
      const card = stage.querySelector<HTMLElement>("[data-card]");
      if (card) {
        const r = card.getBoundingClientRect();
        engine.setInset(phone ? 0 : s.right - r.left, phone ? s.bottom - r.top : 0);
        return;
      }
      const copy = copyRef.current;
      if (copy && !phone && phase !== "tour") {
        const r = copy.getBoundingClientRect();
        // only when the text sits over the left of the village, not above or below it
        if (r.top < s.bottom && r.bottom > s.top && r.left - s.left < 80 && r.right < s.left + s.width * 0.6) {
          engine.setInset(-(r.right - s.left) * 0.7, 0);
          return;
        }
      }
      engine.setInset(0, 0);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [active, phase]);

  const share = async (id: PlaceId) => {
    const p = PLACE_BY_ID[id];
    const url = `${window.location.origin}/#${id}`;
    const text = `${p.title}, Pewe`;
    try {
      if (navigator.share) {
        await navigator.share({ title: text, url });
        return;
      }
    } catch {
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}: ${url}`)}`, "_blank", "noopener");
  };

  const setTime = (m: number | null) => {
    setMinutes(m);
    engineRef.current?.setTime(m === null ? null : peweToday(m));
  };

  const touring = phase === "tour";
  const place = active ? PLACE_BY_ID[active] : null;
  const lite = phase === "lite";
  // the still picture stands in for the 3D: no WebGL, or the visitor has not asked for it yet
  const fallback = phase === "fallback" || lite;

  return (
    <div className={styles.site}>
      <header className={styles.bar}>
        <a className={styles.barBrand} href="#top" onClick={() => setMenuOpen(false)}>
          <span className={styles.barName}>Pewe</span>
          <span className={styles.barSub}>{SOCIETY.name}</span>
        </a>
        <nav className={styles.nav} aria-label="Sections">
          {SECTIONS.map((s) => (
            <a key={s.id} className={styles.navItem} href={`#${s.id}`}>
              {s.label}
            </a>
          ))}
          <a className={styles.navGive} href="#give">
            Zakat &amp; Donation
          </a>
          <a className={styles.navMembers} href="/erp">
            Members
          </a>
        </nav>
        <button
          type="button"
          className={styles.menuButton}
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </header>

      {menuOpen && (
        <nav className={styles.menu} aria-label="Sections">
          {SECTIONS.map((s) => (
            <a key={s.id} className={styles.menuItem} href={`#${s.id}`} onClick={() => setMenuOpen(false)}>
              {s.label}
            </a>
          ))}
          <a className={styles.menuItem} href="#give" onClick={() => setMenuOpen(false)}>
            Zakat &amp; Donation
          </a>
          <a className={styles.menuItem} href="/erp">
            Members
          </a>
          <a className={`${styles.menuItem} ${styles.menuCall}`} href={SOCIETY.phoneHref}>
            Call the office · {SOCIETY.phone}
          </a>
        </nav>
      )}

      <main id="top">
        {/* ------------------------------------------------ the village */}
        <section ref={heroRef} className={styles.hero} aria-label="Pewe in 3D">
          <div ref={stageRef} className={styles.stage}>
            {fallback ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={styles.stageFallback}
                src="/images/hero/hero.jpg"
                alt="Pewe in the monsoon: the Community Building across the paddy"
              />
            ) : (
              <>
                <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
                <div ref={labelsRef} className={styles.labels} />
              </>
            )}

            {!fallback && (
              <button
                type="button"
                className={`${styles.plate} ${styles.clock}`}
                onClick={() => setTimeOpen((o) => !o)}
                aria-expanded={timeOpen}
                aria-label="Pewe's time and weather. Open to see Pewe at another hour."
              >
                <span className={styles.clockLabel}>{clock?.live === false ? "Pewe at" : "Pewe now"}</span>
                <span className={styles.clockTime}>{clock?.time ?? "—"}</span>
                <span className={styles.clockLine}>
                  {[clock?.tempC != null ? `${clock.tempC}°` : null, clock?.label || null]
                    .filter(Boolean)
                    .join(" · ") || "Konkan coast"}
                </span>
                <span className={styles.clockHint}>Change the hour</span>
              </button>
            )}

            {timeOpen && (
              <div className={`${styles.plate} ${styles.timePanel}`}>
                <p className={styles.timeTitle}>See Pewe at {fmt(minutes ?? peweMinutesNow())}</p>
                <input
                  className={styles.range}
                  type="range"
                  min={0}
                  max={1439}
                  step={5}
                  value={minutes ?? peweMinutesNow()}
                  onChange={(e) => setTime(Number(e.target.value))}
                  aria-label="Hour of the day in Pewe"
                />
                <div className={styles.rangeScale}>
                  <span>Midnight</span>
                  <span>Noon</span>
                  <span>Midnight</span>
                </div>
                <button
                  type="button"
                  className={`${styles.secondary} ${styles.liveButton}`}
                  onClick={() => setTime(null)}
                >
                  Back to Pewe now
                </button>
              </div>
            )}

            {place && (
              <aside data-card className={`${styles.plate} ${styles.card}`} key={place.id} aria-label={place.title}>
                <button type="button" className={styles.cardClose} onClick={close} aria-label="Close">
                  ×
                </button>
                <div className={styles.cardScroll}>
                  <p className={styles.coords}>{place.coords}</p>
                  <p className={styles.cardMeta}>{place.meta}</p>
                  <h2 className={styles.cardTitle}>{place.title}</h2>
                  <p className={styles.cardBody}>{place.body}</p>
                  {place.figure && (
                    <div className={styles.cardFigure}>
                      <p className={styles.cardFigureValue}>{place.figure.value}</p>
                      <p className={styles.cardFigureLabel}>
                        {place.figure.label} <span>· approx., pending audit</span>
                      </p>
                    </div>
                  )}
                  {place.photo && (
                    <figure className={styles.cardPhoto}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={place.photo.src} alt={place.photo.alt} loading="lazy" />
                      <figcaption>{place.photo.alt}</figcaption>
                    </figure>
                  )}
                </div>
                <div className={styles.cardActions}>
                  <button type="button" className={styles.cardAction} onClick={() => void share(place.id)}>
                    Share
                  </button>
                  <button type="button" className={`${styles.cardAction} ${styles.cardActionMain}`} onClick={next}>
                    Next place →
                  </button>
                </div>
              </aside>
            )}

            {touring && (
              <>
                <button type="button" className={`${styles.secondary} ${styles.skip}`} onClick={skipTour}>
                  Skip tour
                </button>
                {caption && (
                  <div className={`${styles.plate} ${styles.caption}`} role="status" aria-live="polite">
                    <div className={styles.progress}>
                      <div className={styles.progressFill} style={{ width: `${Math.round(tourP * 100)}%` }} />
                    </div>
                    <p className={styles.captionText} key={caption}>
                      {caption}
                    </p>
                  </div>
                )}
              </>
            )}

            {!fallback && (
              <div className={`${styles.intro} ${introGone ? styles.introGone : ""}`} aria-hidden={introGone}>
                <div className={styles.introInner}>
                  <p className={styles.introWord}>Pewe</p>
                  <p className={styles.introCoords}>17.5605° N · 73.2422° E</p>
                  <p className={styles.introPlace}>Guhagar · Ratnagiri · Konkan coast</p>
                  <div className={styles.introBar}>
                    <div className={styles.introBarFill} style={{ width: `${Math.round(progress * 100)}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div
            ref={copyRef}
            className={`${styles.plate} ${styles.heroCopy} ${touring || active ? styles.heroCopyAway : ""}`}
          >
            <div className={styles.heroSeal}>
              <Seal size={46} />
              <p className={styles.eyebrow}>
                Reg. {SOCIETY.registrationNo} · Est. {SOCIETY.foundedYear}
                <br />
                Pewe · Guhagar · Ratnagiri
              </p>
            </div>
            <h1 className={styles.headline}>{SOCIETY.name}</h1>
            <p className={styles.heroAlt}>{SOCIETY.nameMarathi}</p>
            <p className={styles.lede}>
              Pewe gaon ki apni welfare society. Water, roads, the building repairs, and help for any household that
              needs it in a hurry, with every rupee accounted for and audited.
            </p>
            {lite && (
              <div className={styles.heroActions}>
                <button
                  type="button"
                  className={styles.primary}
                  onClick={() => {
                    setPhase("loading");
                    setGo(1);
                  }}
                >
                  <span className={styles.play} aria-hidden="true" />
                  Show the 3D village
                </button>
              </div>
            )}
            {lite && (
              <p className={styles.hint}>
                You seem to be on slow or saved data, so the 3D waits until you ask. It is about 1 MB.
              </p>
            )}
            {!fallback && (
              <div className={styles.heroActions}>
                <button
                  type="button"
                  className={styles.primary}
                  onClick={() => void startTour()}
                  disabled={phase === "loading"}
                >
                  <span className={styles.play} aria-hidden="true" />
                  Take me through Pewe
                </button>
                <button
                  type="button"
                  className={`${styles.secondary} ${placesOpen ? styles.secondaryOn : ""}`}
                  onClick={() => setPlacesOpen((o) => !o)}
                  aria-expanded={placesOpen}
                >
                  Places
                </button>
              </div>
            )}
            <p className={styles.heroLinks}>
              <a href="#accounts">Where the money went ↓</a>
              <a href="#give">Zakat &amp; Donation ↓</a>
            </p>
            {!fallback && (
              <p className={styles.hint}>
                {coarse
                  ? "Swipe sideways to turn the village · two fingers to zoom · tap a name"
                  : "Drag to look around · Ctrl + scroll to zoom · click a name"}
              </p>
            )}
            {placesOpen && (
              <ul className={styles.placesList}>
                {CARD_ORDER.map((id) => (
                  <li key={id}>
                    <button type="button" className={styles.placesItem} onClick={() => select(id)}>
                      <span>{PLACE_BY_ID[id].title}</span>
                      <span className={styles.placesMeta}>{PLACE_BY_ID[id].meta.split(" · ")[0]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <a className={styles.scrollCue} href="#what">
            Read about PSWS <span aria-hidden="true">↓</span>
          </a>

          <nav className={styles.srOnly} aria-label="Places in Pewe">
            <ul>
              {PLACES.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => select(p.id)}>
                    {p.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </section>

        {/* ------------------------------------------------ what we do */}
        <section id="what" className={styles.section}>
          <div>
            <p className={styles.eyebrow}>What the Society does · Hum kya karte hain</p>
            <h2 className={styles.sectionTitle}>Three heads of work, one account book.</h2>
            <p className={styles.text}>
              The trust was set up for three things: to develop the village, to collect and distribute Zakat, and to
              carry out welfare projects. Everything the Society does falls under one of them.
            </p>
            <ul className={styles.threeHeads}>
              {THREE_HEADS.map((h) => (
                <li key={h.key}>
                  <a className={styles.threeHead} href={h.href}>
                    <p className={styles.threeHeadHinglish}>{h.hinglish}</p>
                    <h3 className={styles.threeHeadTitle}>{h.title}</h3>
                    <p className={styles.threeHeadLine}>{h.line}</p>
                    <p className={styles.threeHeadFigure}>{h.figure}</p>
                    <p className={styles.threeHeadLabel}>{h.figureLabel}</p>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------ who we are */}
        <section id="about" className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.split}>
            <div>
              <p className={styles.eyebrow}>Who we are · Society ke baare mein</p>
              <h2 className={styles.sectionTitle}>Pewe gaon ki apni welfare society.</h2>
              <p className={styles.text}>
                A public trust of Village Pewe, Taluka Guhagar, District Ratnagiri, registered under the Maharashtra
                Public Trusts Act, 1950. It was established to develop the village, to collect and distribute Zakat, and
                to carry out welfare projects, with every single rupee accounted for and audited.
              </p>
              <p className={styles.text}>
                We run the water scheme, the school works and the building repairs, and we stand behind any household in
                the village that needs help in a hurry.
              </p>
              <p className={styles.text}>
                Pewe&rsquo;s people work in Mumbai, Dubai, Riyadh, Kigali and beyond, and they still give at home.
                {!fallback && (
                  <>
                    {" "}
                    <button type="button" className={styles.inlineLink} onClick={() => showOnMap("world")}>
                      See it on the map ↑
                    </button>
                  </>
                )}
              </p>
              {draft && (
                <ToFill
                  title="How the Society began"
                  asks={[
                    "Who started it, and in which year the work began",
                    "Why the village needed it",
                    "Two or three moments since then that the village remembers",
                  ]}
                />
              )}
            </div>
            <div>
              <figure className={`${styles.figure} ${styles.aboutPhoto}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/hero/hero.jpg"
                  alt="The Community Building across the paddy, with the forested hill behind, in the monsoon"
                  loading="lazy"
                />
                <figcaption>Pewe in the monsoon: the Community Building across the paddy.</figcaption>
              </figure>
              <div className={`${styles.plate} ${styles.register}`}>
                <div className={styles.registerHead}>
                  <Seal size={58} />
                  <div>
                    <p className={styles.registerName}>{SOCIETY.name}</p>
                    <p className={styles.registerAlt}>{SOCIETY.nameMarathi}</p>
                    <p className={styles.registerAlt} dir="rtl" lang="ur">
                      {SOCIETY.nameUrdu}
                    </p>
                  </div>
                </div>
                <dl className={styles.facts}>
                  <div>
                    <dt>Public Trust Reg.</dt>
                    <dd>{SOCIETY.registrationNo}</dd>
                  </div>
                  <div>
                    <dt>Society Reg.</dt>
                    <dd>{SOCIETY.societyRegNo}</dd>
                  </div>
                  <div>
                    <dt>Established</dt>
                    <dd>{SOCIETY.foundedYear}</dd>
                  </div>
                  <div>
                    <dt>Registered office</dt>
                    <dd>
                      {SOCIETY.address.line1}, {SOCIETY.address.line2}, {SOCIETY.address.line3}
                    </dd>
                  </div>
                  <div>
                    <dt>Committee</dt>
                    <dd>
                      <a href="#committee">{COMMITTEE.elected} elected, Sep 2026</a>
                    </dd>
                  </div>
                  <div>
                    <dt>Contributions</dt>
                    <dd>Domestic only</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ the committee */}
        <section id="committee" className={styles.section}>
          <div>
            <p className={styles.eyebrow}>The committee · Society kaun chalata hai</p>
            <h2 className={styles.sectionTitle}>Elected by the village.</h2>
            <p className={styles.text}>
              The general election for Pewe was held on {COMMITTEE.electionDate}. {COMMITTEE.voted} of the{" "}
              {COMMITTEE.registered} registered members voted, and {COMMITTEE.elected} were returned. On{" "}
              {COMMITTEE.meetingDate} they appointed six office bearers, for two years.
            </p>
            <dl className={styles.electionStats}>
              {COMMITTEE.stats.map((s) => (
                <div key={s.l}>
                  <dd>{s.v}</dd>
                  <dt>{s.l}</dt>
                </div>
              ))}
            </dl>
            <h3 className={styles.subTitle}>Office bearers</h3>
            <ul className={styles.officers}>
              {COMMITTEE.officers.map((o) => (
                <li key={o.post}>
                  <p className={styles.officerPost}>{o.post}</p>
                  <p className={styles.officerName}>{o.name}</p>
                </li>
              ))}
            </ul>
            <h3 className={styles.subTitle}>The three committees</h3>
            <ul className={styles.committees}>
              {COMMITTEE.committees.map((c) => (
                <li key={c.name}>
                  <p className={styles.committeeName}>{c.name}</p>
                  <p className={styles.committeeLead}>Led by {c.lead}</p>
                  {c.does && <p className={styles.committeeDoes}>{c.does}</p>}
                </li>
              ))}
            </ul>
            <div className={styles.members}>
              <p className={styles.officerPost}>Members of the committee</p>
              <p className={styles.membersNames}>{COMMITTEE.members.join(" · ")}</p>
            </div>
            <p className={styles.committeeNote}>
              Every committee head and member reports to the President. Office bearers serve two years, with a review of
              the work after the first. From the minutes of the meeting of {COMMITTEE.meetingDate}.{" "}
              <a href="/minutes">Read the minutes →</a>
            </p>
            {draft && (
              <ToFill
                title="Before the committee goes public"
                asks={[
                  "Confirm that these names may be shown on the public website",
                  "What the Advisory Committee does, in a line",
                  "Photographs of the office bearers, if they want them shown",
                ]}
              />
            )}
          </div>
        </section>

        {/* ------------------------------------------------ the accounts */}
        <section id="accounts" className={`${styles.section} ${styles.sectionAlt}`}>
          <div>
            <p className={styles.eyebrow}>Accounts · Paisa kahan gaya, poora hisaab</p>
            <h2 className={styles.sectionTitle}>Where the money went.</h2>
            <p className={styles.text}>
              First, the last two months straight from the Society&rsquo;s bank statement. Then the eleven years before,
              from the office&rsquo;s own record.
            </p>
            <Statement />
            <h3 className={styles.subTitle}>Eleven years, year by year.</h3>
            <p className={styles.text}>
              What the village put in, each year since the Society was registered. Everything collected in a year was
              spent inside that year. Nothing is carried forward.
            </p>
            <div className={styles.accounts}>
              <YearsChart />
              <dl className={styles.stats}>
                <div>
                  <dt>Collected, eleven years</dt>
                  <dd>{rupees(ELEVEN_YEARS.collected)}</dd>
                  <p>The sum of the years shown</p>
                </div>
                <div>
                  <dt>Direct family support</dt>
                  <dd>{rupees(ELEVEN_YEARS.familySupportTenYears)}</dd>
                  <p>Housing, livelihood, medical and education, over ten years</p>
                </div>
                <div>
                  <dt>Carried forward</dt>
                  <dd>Nil</dd>
                  <p>Each year&rsquo;s collection is spent that year</p>
                </div>
              </dl>
            </div>
            <p className={styles.provisional}>
              All figures are the office&rsquo;s own, approximate, and pending audit. The office has also put the
              eleven-year total nearer ₹3 crore; that does not yet match the yearly figures, so this page shows only the
              years until the audited statements settle it.
            </p>
            {draft && (
              <ToFill
                title="Audited statements"
                asks={[
                  "Which years' audited statements are filed, and with whom",
                  "The latest audited statement, to put up for anyone to download",
                  "Which eleven-year total is right: the yearly figures (₹2.18 crore) or ₹3 crore",
                ]}
              />
            )}
          </div>
        </section>

        {/* ------------------------------------------------ our work */}
        <section id="work" className={styles.section}>
          <div>
            <p className={styles.eyebrow}>Our work · Gaon ke kaam, ab tak kya bana</p>
            <h2 className={styles.sectionTitle}>What eleven years has built.</h2>
            <p className={styles.text}>
              Works finished or still running since 2015. Where the office has put a cost to a work, it is shown,
              approximate until the audited statements are in.
            </p>
            <div className={styles.spend}>
              {COSTED_WORKS.map((w) => (
                <div key={w.id} className={styles.spendRow}>
                  <p className={styles.spendName}>{w.title.split(" — ")[0]}</p>
                  <div className={styles.spendTrack}>
                    <div
                      className={styles.spendFill}
                      style={{
                        width: `${(w.approxCost! / COSTED_WORKS[0].approxCost!) * 100}%`,
                      }}
                    />
                  </div>
                  <p className={styles.spendValue}>≈ {lakh(w.approxCost!)}</p>
                  {w.place && !fallback && (
                    <button type="button" className={styles.mapLink} onClick={() => showOnMap(w.place!)}>
                      On the map ↑
                    </button>
                  )}
                </div>
              ))}
            </div>
            <ul className={styles.works}>
              {WORKS.map((w) => (
                <li key={w.id} className={styles.work}>
                  <p className={styles.workPeriod}>
                    {w.period}
                    {w.ongoing && <span className={styles.workOngoing}>Ongoing</span>}
                  </p>
                  <h3 className={styles.workTitle}>{w.title.split(" — ")[0]}</h3>
                  <p className={styles.workHinglish}>{w.hinglish}</p>
                  <p className={styles.workLine}>{w.line}</p>
                  {w.place && !fallback && (
                    <button type="button" className={styles.mapLink} onClick={() => showOnMap(w.place!)}>
                      See it on the map ↑
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {draft && (
              <ToFill
                title="Photographs we still need"
                asks={[
                  "The Haveli, the hill tanks and pipelines, the roads and street lights, the wells, the paddy and the creek",
                  "Taken by the Society or its members, with their permission to put them on the website",
                  "No photographs of the families who are helped",
                ]}
              />
            )}
            {draft && (
              <ToFill
                title="Works running now · Abhi ke kaam"
                asks={[
                  "Each work running now: what it is, and where in the village",
                  "Its budget, and what has been spent so far",
                  "The quotations received, if the committee wants them public",
                  "What is planned next",
                ]}
              />
            )}
          </div>
        </section>

        {/* ------------------------------------------------ zakat */}
        <section id="zakat" className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.split}>
            <div>
              <p className={styles.eyebrow}>Zakat &amp; help · Zakat aur madad</p>
              <h2 className={styles.sectionTitle}>Help for any household that needs it.</h2>
              <p className={styles.text}>
                Zakat is collected from Pewe&rsquo;s people at home and abroad, and given out under five heads. In ten
                years, about {crore(ELEVEN_YEARS.familySupportTenYears)} has gone straight to families.
              </p>
              <p className={styles.text}>
                In August and September 2026, {STATEMENT.stipendHouseholds} households received a monthly stipend, paid
                by NEFT into their own bank account, and the Society paid fees directly to 11 schools, colleges and
                institutes.
              </p>
              <p className={styles.text}>
                The totals are public. The names of the families helped, and their circumstances, never are.
              </p>
              <a className={styles.primary} href={SOCIETY.phoneHref}>
                Ask the office for help
              </a>
              {draft && (
                <ToFill
                  title="How to ask for help"
                  asks={[
                    "Who a family should speak to first",
                    "How a request is decided, and by whom",
                    "How long it usually takes",
                    "When Zakat is collected each year",
                  ]}
                />
              )}
            </div>
            <ul className={styles.heads}>
              {ZAKAT_HEADS.map((z) => (
                <li key={z.title}>
                  <h3 className={styles.headTitle}>
                    {z.title} <span>{z.hinglish}</span>
                  </h3>
                  <p className={styles.headLine}>{z.line}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------ notices */}
        <section id="notices" className={styles.section}>
          <div>
            <p className={styles.eyebrow}>Notice board · Suchna</p>
            <h2 className={styles.sectionTitle}>What the office has put up.</h2>
            <p className={styles.text}>
              Meeting notices and reports. A member working abroad sees the same notice on the same day as a member in
              the village.
            </p>
            <ol className={styles.notices}>
              {NOTICES.map((n) => (
                <li key={n.title} className={styles.notice}>
                  <p className={styles.noticeMeta}>
                    <span>{n.date}</span>
                    <span className={styles.noticeKind}>{n.kind}</span>
                  </p>
                  <h3 className={styles.noticeTitle}>{n.title}</h3>
                  <p className={styles.noticeBody}>{n.body}</p>
                  <a className={styles.noticeLink} href={n.link.href}>
                    {n.link.label} →
                  </a>
                </li>
              ))}
            </ol>
            {draft && (
              <ToFill
                title="More notices"
                asks={[
                  "The next General Body meeting: date, place and agenda",
                  "Any other notice the office wants every member to see",
                ]}
              />
            )}
          </div>
        </section>

        {/* ------------------------------------------------ give */}
        <section id="give" className={`${styles.section} ${styles.sectionInk}`}>
          <div className={styles.split}>
            <div>
              <p className={styles.eyebrow}>Zakat &amp; Donation · Dene ke tareeke</p>
              <h2 className={styles.sectionTitle}>Four ways to give, one account book.</h2>
              <p className={styles.text}>
                However it arrives, every rupee is entered against its head and audited with the rest. Call the office
                and they will give you the details.
              </p>
              <p className={styles.text}>
                Read the accounts first. We would rather you gave having seen where last year&rsquo;s money went.{" "}
                <a className={styles.inkLink} href="#accounts">
                  Where the money went ↑
                </a>
              </p>
              <a className={styles.primaryOnInk} href={SOCIETY.phoneHref}>
                Call the office · {SOCIETY.phone}
              </a>
            </div>
            <div>
              <ul className={styles.ways}>
                {GIVE_WAYS.map((g) => (
                  <li key={g.head}>
                    <p className={styles.wayHead}>
                      {g.head} <span>{g.hinglish}</span>
                    </p>
                    <p className={styles.wayLine}>{g.line}</p>
                  </li>
                ))}
              </ul>
              <div className={styles.fcra}>
                <p className={styles.fcraHead}>Members working outside India</p>
                <p>
                  The Society takes domestic contributions only. Please give through your own Indian bank account, or
                  through family at home.
                </p>
              </div>
              {draft && (
                <ToFill
                  onInk
                  title="For donors · and sponsors (Hamare saath)"
                  asks={[
                    "Bank account and UPI details, only if the office wants them public",
                    "Whether every donor gets a receipt, and how",
                    "Any appeal open right now: what it is for, the target, and how much has come in",
                    "Businesses that support the Society's running costs, if any, and whether they want to be named",
                  ]}
                />
              )}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ contact */}
        <section id="contact" className={styles.section}>
          <div className={styles.split}>
            <div>
              <p className={styles.eyebrow}>Contact · Sampark</p>
              <h2 className={styles.sectionTitle}>Where to find us.</h2>
              <a className={styles.bigPhone} href={SOCIETY.phoneHref}>
                {SOCIETY.phone}
              </a>
              <dl className={styles.facts}>
                <div>
                  <dt>Address</dt>
                  <dd>
                    {SOCIETY.address.line1}, {SOCIETY.address.line2}, {SOCIETY.address.line3}, {SOCIETY.address.state}
                  </dd>
                </div>
                <div>
                  <dt>Members</dt>
                  <dd>
                    <a href="/erp">Members&rsquo; area →</a>
                  </dd>
                </div>
              </dl>
              {draft && (
                <ToFill
                  title="Office details"
                  asks={[
                    "Office timings",
                    "An email address, if the office has one",
                    "The right PIN code: the old records say 415703, the bank statement says 415724",
                  ]}
                />
              )}
            </div>
            <figure className={styles.figure}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/hero/hero-right.jpg"
                alt="The side of the Community Building, with the forested hills of Pewe behind it"
                loading="lazy"
              />
              <figcaption>The Community Building, with Pewe&rsquo;s hills behind it.</figcaption>
            </figure>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <div className={styles.footerId}>
              <Seal size={56} />
              <div>
                <p className={styles.footerName}>{SOCIETY.name}</p>
                <p className={styles.footerAlt}>{SOCIETY.nameMarathi}</p>
                <p className={styles.footerAlt} dir="rtl" lang="ur">
                  {SOCIETY.nameUrdu}
                </p>
              </div>
            </div>
            <p className={styles.footerSmall}>
              {SOCIETY.address.line1}, {SOCIETY.address.line2}, {SOCIETY.address.line3}, {SOCIETY.address.state}
              <br />
              <a href={SOCIETY.phoneHref}>{SOCIETY.phone}</a>
            </p>
            <p className={styles.footerSmall}>
              Public Trust Reg. {SOCIETY.registrationNo} · Society Reg. {SOCIETY.societyRegNo} · Est.{" "}
              {SOCIETY.foundedYear}
            </p>
          </div>
          <nav className={styles.footerCols} aria-label="More">
            <div>
              <p className={styles.footerHead}>
                The Society <span>Society</span>
              </p>
              <a href="#about">Who we are</a>
              <a href="#committee">The committee</a>
              <a href="#accounts">Accounts</a>
              <a href="#work">Our work</a>
            </div>
            <div>
              <p className={styles.footerHead}>
                Take part <span>Saath dijiye</span>
              </p>
              <a href="#zakat">Ask for help</a>
              <a href="#give">Zakat &amp; Donation</a>
              <a href="#notices">Notices</a>
              <a href="#contact">Contact</a>
            </div>
            <div>
              <p className={styles.footerHead}>
                Members <span>Members</span>
              </p>
              <a href="/erp">Members&rsquo; area</a>
              <a href="/minutes">Minutes</a>
            </div>
          </nav>
        </div>
        <p className={styles.footerCredits}>
          The land in the 3D village is drawn from the Copernicus DEM GLO-30, © DLR e.V. 2010–2014 and © Airbus Defence
          and Space GmbH 2014–2018, provided under COPERNICUS by the European Union and ESA. Coastlines from Natural
          Earth. Weather from Open-Meteo.
        </p>
      </footer>
    </div>
  );
}
