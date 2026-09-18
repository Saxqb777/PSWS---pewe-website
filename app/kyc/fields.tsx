"use client";

import { useState } from "react";
import { NEAR, REST_OF_WORLD, countryByCode } from "@/lib/countries";
import { statesOf, citiesOf, hasStates } from "@/lib/places";
import type { Member } from "@/lib/kyc-types";

/**
 * The body of the details form.
 *
 * The name is a plain dropdown rather than a box you type into. A text box
 * beside a telephone and an email is exactly what the browser's own address
 * autofill pounces on — it drops its list of saved contacts over the top,
 * which is confusing and offers names that are not on the committee. A
 * dropdown it leaves alone, opens as a proper picker on a phone, and still
 * jumps to a name when the first letters are typed.
 *
 * Members who have already given their details are not in it at all.
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
  const [code, setCode] = useState("IN");
  const country = countryByCode(code) ?? countryByCode("IN")!;
  const states = statesOf(code);
  const [state, setState] = useState(states[0]?.name ?? "");
  const cities = citiesOf(code, state);

  function clearCity() {
    const city = document.getElementById("city") as HTMLInputElement | null;
    if (city) city.value = "";
  }

  function onCountry(next: string) {
    setCode(next);
    setState(statesOf(next)[0]?.name ?? "");
    clearCity();
  }

  const nothingLeft = available.length === 0;

  return (
    <form method="POST" action="/api/kyc" className="kyc-form">
      <label className="label" htmlFor="member">Your name</label>
      <select id="member" name="member" defaultValue="" required disabled={nothingLeft}>
        <option value="" disabled>Choose your name…</option>
        {available.map((m) => (
          <option key={m.slug} value={m.slug}>{m.name}</option>
        ))}
      </select>

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

      {hasStates(code) && (
        <>
          <label className="label" htmlFor="state">
            {code === "AE" ? "Emirate" : "State"}
          </label>
          <select
            id="state"
            name="state"
            value={state}
            onChange={(e) => { setState(e.target.value); clearCity(); }}
            required
          >
            {states.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
          </select>
        </>
      )}

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
