"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SOCIETY } from "@/lib/site";
import type { PeweEngine, ClockInfo } from "./engine/engine";
import { CARD_ORDER, PLACES, PLACE_BY_ID, type PlaceId } from "./places";
import styles from "./pewe.module.css";

type Phase = "loading" | "intro" | "explore" | "tour" | "fallback";

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
    /* private mode: the tour just plays again next time */
  }
}

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2");
  } catch {
    return false;
  }
}

/** A Date for today in Pewe at the given minute of the day. */
function peweToday(minutes: number) {
  const now = new Date();
  const ist = new Date(now.getTime() + 330 * 60000);
  const midnight = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - 330 * 60000;
  return new Date(midnight + minutes * 60000);
}

function peweMinutesNow() {
  const ist = new Date(Date.now() + 330 * 60000);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
}

const fmt = (m: number) => {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};

export function PeweExperience({ initialPlace = null }: { initialPlace?: PlaceId | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PeweEngine | null>(null);
  const activeRef = useRef<PlaceId | null>(null);

  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(0.05);
  const [introGone, setIntroGone] = useState(false);
  const [active, setActive] = useState<PlaceId | null>(null);
  const [about, setAbout] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const [tourP, setTourP] = useState(0);
  const [clock, setClock] = useState<ClockInfo | null>(null);
  const [timeOpen, setTimeOpen] = useState(false);
  const [minutes, setMinutes] = useState<number | null>(null);

  const setHash = (id: PlaceId | null) => {
    const url = new URL(window.location.href);
    url.hash = id ? id : "";
    url.searchParams.delete("p");
    window.history.replaceState(null, "", url.pathname + url.search + (id ? `#${id}` : ""));
  };

  const startTour = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    activeRef.current = null;
    setActive(null);
    setAbout(false);
    setPlacesOpen(false);
    setTimeOpen(false);
    setHash(null);
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
      setAbout(false);
      setPlacesOpen(false);
      setCaption(null);
      setPhase("explore");
      setHash(id);
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

  // keep select() fresh for the engine's label clicks
  const selectRef = useRef(select);
  selectRef.current = select;

  useEffect(() => {
    if (!webglAvailable()) {
      setPhase("fallback");
      return;
    }
    let disposed = false;
    let engine: PeweEngine | null = null;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const q = new URLSearchParams(window.location.search);
    const lowPower =
      q.get("low") === "1" ||
      coarse ||
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
          timeOverride: timeQ && /^\d{1,2}:\d{2}$/.test(timeQ) ? peweToday(Number(timeQ.split(":")[0]) * 60 + Number(timeQ.split(":")[1])) : null,
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
        if (deep && deep !== "busstop") {
          setPhase("explore");
          await engine.playIntro(reduced ? "none" : "short");
          if (!disposed) selectRef.current(deep);
        } else if ((!seen || deep === "busstop") && !reduced) {
          setPhase("intro");
          await engine.playIntro("full");
          if (!disposed) await startTour();
        } else {
          setPhase("explore");
          await engine.playIntro(reduced ? "none" : "short");
        }
      } catch (e) {
        console.error(e);
        if (!disposed) setPhase("fallback");
      }
    })();

    const onResize = () => engine?.resize();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (engineRef.current && activeRef.current) close();
      else skipTour();
      setPlacesOpen(false);
      setAbout(false);
      setTimeOpen(false);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      engine?.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const touring = phase === "tour" || phase === "intro";
  const place = active ? PLACE_BY_ID[active] : null;

  if (phase === "fallback") {
    return (
      <main className={styles.root}>
        <div className={styles.fallback}>
          <div className={styles.fallbackInner}>
            <p className={styles.introCoords}>17.5605° N · 73.2422° E</p>
            <h1 className={styles.introWord}>Pewe</h1>
            <p className={styles.brandSub}>{SOCIETY.name}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/hero/hero.jpg" alt="The Community Building across the paddy in the monsoon" />
            {CARD_ORDER.map((id) => (
              <section key={id} className={styles.fallbackPlace}>
                <h2>{PLACE_BY_ID[id].title}</h2>
                <p>{PLACE_BY_ID[id].body}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.root}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div ref={labelsRef} className={styles.labels} />

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

      <header className={`${styles.plate} ${styles.brand}`}>
        <h1 className={styles.brandName}>Pewe</h1>
        <p className={styles.brandSub}>{SOCIETY.name}</p>
      </header>

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
          {[clock?.tempC != null ? `${clock.tempC}°` : null, clock?.label || null].filter(Boolean).join(" · ") || "Konkan coast"}
        </span>
        <span className={styles.clockHint}>Change the hour</span>
      </button>

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
          <button type="button" className={`${styles.secondary} ${styles.liveButton}`} onClick={() => setTime(null)}>
            Back to Pewe now
          </button>
        </div>
      )}

      <div className={`${styles.dock} ${touring || active || about ? styles.dockHidden : ""}`}>
        <button type="button" className={styles.primary} onClick={() => void startTour()}>
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
        <button type="button" className={styles.secondary} onClick={() => setAbout(true)}>
          About
        </button>
      </div>

      {!touring && !active && !about && (
        <div className={styles.corner}>
          <a className={styles.cornerLink} href={SOCIETY.phoneHref}>
            Call the office
          </a>
          <a className={styles.cornerLink} href="/erp">
            Members
          </a>
        </div>
      )}

      {placesOpen && !touring && !active && (
        <ul className={`${styles.plate} ${styles.placesList}`}>
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

      {place && (
        <aside className={`${styles.plate} ${styles.card}`} key={place.id} aria-label={place.title}>
          <button type="button" className={styles.cardClose} onClick={close} aria-label="Close">
            ×
          </button>
          <div className={styles.cardScroll}>
            <p className={styles.coords}>{place.coords}</p>
            <p className={styles.cardMeta}>{place.meta}</p>
            <h2 className={styles.cardTitle}>{place.title}</h2>
            <p className={styles.cardBody}>{place.body}</p>
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

      {about && (
        <aside className={`${styles.plate} ${styles.card}`} aria-label="About PSWS">
          <button type="button" className={styles.cardClose} onClick={() => setAbout(false)} aria-label="Close">
            ×
          </button>
          <div className={`${styles.cardScroll} ${styles.about}`}>
            <p className={styles.coords}>Est. {SOCIETY.foundedYear}</p>
            <p className={styles.cardMeta}>About</p>
            <h2 className={styles.cardTitle}>{SOCIETY.name}</h2>
            <p className={styles.aboutNames}>
              {SOCIETY.nameMarathi}
              <br />
              <span dir="rtl">{SOCIETY.nameUrdu}</span>
            </p>
            <p>
              A public trust registered under the Maharashtra Public Trusts Act, 1950, of the village of Pewe, Taluka
              Guhagar, District Ratnagiri. Established for the development of the village, the collection and
              distribution of Zakat, and welfare projects, with transparency and an audit of every single rupee.
            </p>
            <dl className={styles.aboutRows}>
              <div>
                <dt>Trust reg.</dt>
                <dd>{SOCIETY.registrationNo}</dd>
              </div>
              <div>
                <dt>Society reg.</dt>
                <dd>{SOCIETY.societyRegNo}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>
                  {SOCIETY.address.line1}, {SOCIETY.address.line2}, {SOCIETY.address.line3}
                </dd>
              </div>
              <div>
                <dt>Office</dt>
                <dd>
                  <a href={SOCIETY.phoneHref}>{SOCIETY.phone}</a>
                </dd>
              </div>
            </dl>
            <p className={styles.credits}>
              The land is drawn from the Copernicus DEM GLO-30, © DLR e.V. 2010–2014 and © Airbus Defence and Space
              GmbH 2014–2018, provided under COPERNICUS by the European Union and ESA. Coastlines from Natural Earth.
              Weather from Open-Meteo.
            </p>
          </div>
          <div className={styles.cardActions}>
            <a className={`${styles.cardAction} ${styles.cardActionMain}`} href={SOCIETY.phoneHref} style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>
              Call the office
            </a>
          </div>
        </aside>
      )}

      {phase === "tour" && (
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
    </main>
  );
}
