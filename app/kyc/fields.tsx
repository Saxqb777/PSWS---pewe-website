"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NEAR, REST_OF_WORLD, countryByCode } from "@/lib/countries";
import { statesOf, citiesOf, hasStates } from "@/lib/places";
import type { Member } from "@/lib/kyc-types";

/**
 * The body of the details form.
 *
 * The name is a list you can type into: typing narrows it, but nothing is
 * accepted that is not on it, and a member who has already given their
 * details is not on it at all.
 *
 * Country, then state, then city. Choosing the country sets the dialling
 * code against the mobile field and refills the states; choosing the state
 * refills the cities. Countries with no state list skip that step.
 */
export function KycForm({
  available,
  error,
}: {
  available: Member[];
  error?: string;
}) {
  // --- the name
  const [slug, setSlug] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter((m) => m.name.toLowerCase().includes(q));
  }, [available, query]);

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  function choose(m: Member) {
    setSlug(m.slug);
    setQuery(m.name);
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setCursor((c) => {
        const next = e.key === "ArrowDown" ? c + 1 : c - 1;
        return Math.max(0, Math.min(matches.length - 1, next));
      });
    } else if (e.key === "Enter" && open && matches[cursor]) {
      e.preventDefault();
      choose(matches[cursor]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // --- where they are
  const [code, setCode] = useState("IN");
  const country = countryByCode(code) ?? countryByCode("IN")!;
  const states = statesOf(code);
  const [state, setState] = useState(states[0]?.name ?? "");
  const cities = citiesOf(code, state);

  function onCountry(next: string) {
    setCode(next);
    setState(statesOf(next)[0]?.name ?? "");
    const city = document.getElementById("city") as HTMLInputElement | null;
    if (city) city.value = "";
  }

  function onState(next: string) {
    setState(next);
    const city = document.getElementById("city") as HTMLInputElement | null;
    if (city) city.value = "";
  }

  const nothingLeft = available.length === 0;

  return (
    <form method="POST" action="/api/kyc" className="kyc-form">
      {/* ---------------- name ---------------- */}
      <label className="label" htmlFor="member-search">Your name</label>
      <div className="kyc-combo" ref={box}>
        <input
          id="member-search"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="member-list"
          aria-autocomplete="list"
          autoComplete="off"
          disabled={nothingLeft}
          placeholder={nothingLeft ? "Everyone has filled it" : "Start typing your name…"}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSlug(""); setOpen(true); setCursor(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          required
        />
        {open && !nothingLeft && (
          <ul className="kyc-options" id="member-list" role="listbox">
            {matches.length === 0 ? (
              <li className="kyc-none">No name matches. Check the spelling.</li>
            ) : (
              matches.map((m, i) => (
                <li key={m.slug}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={m.slug === slug}
                    className={i === cursor ? "is-on" : ""}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => choose(m)}
                  >
                    {m.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      <input type="hidden" name="member" value={slug} />

      {/* ---------------- country ---------------- */}
      <label className="label" htmlFor="country">Country of work</label>
      <select
        id="country"
        name="country"
        value={code}
        onChange={(e) => onCountry(e.target.value)}
        required
      >
        {NEAR.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        <option disabled>──────────</option>
        {REST_OF_WORLD.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
      </select>

      {/* ---------------- state, where the country has them ---------------- */}
      {hasStates(code) && (
        <>
          <label className="label" htmlFor="state">
            {code === "AE" ? "Emirate" : "State"}
          </label>
          <select
            id="state"
            name="state"
            value={state}
            onChange={(e) => onState(e.target.value)}
            required
          >
            {states.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
          </select>
        </>
      )}

      {/* ---------------- city ---------------- */}
      <label className="label" htmlFor="city">City</label>
      <input
        id="city"
        name="city"
        list="city-options"
        autoComplete="address-level2"
        placeholder={cities[0] ?? "Your city"}
        required
      />
      <datalist id="city-options">
        {cities.map((c) => <option key={c} value={c} />)}
      </datalist>

      {/* ---------------- mobile ---------------- */}
      <label className="label" htmlFor="phone">Mobile number</label>
      <div className="kyc-tel">
        <span className="kyc-dial" aria-hidden>+{country.dial}</span>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder={country.digits === 10 ? "98XXXXXXXX" : "Your number"}
          aria-describedby="phone-note"
          required
        />
      </div>
      <p className="kyc-hint" id="phone-note">
        Just your number — the <strong>+{country.dial}</strong> is added for you.
      </p>

      {/* ---------------- gmail ---------------- */}
      <label className="label" htmlFor="gmail">Gmail address</label>
      <input
        id="gmail"
        name="gmail"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="yourname@gmail.com"
        required
      />
      <p className="kyc-hint">Gmail, so meeting invitations reach you.</p>

      <button type="submit" className="kyc-btn" disabled={nothingLeft}>
        Send my details
      </button>
      {error === "member" && (
        <p className="kyc-bad" style={{ marginTop: 14 }}>
          Please select your name from the drop-down list.
        </p>
      )}
    </form>
  );
}
