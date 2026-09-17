"use client";

import { useState } from "react";
import { NEAR, REST_OF_WORLD, countryByCode } from "@/lib/countries";
import { CITY_HINTS } from "@/lib/kyc";

/**
 * Country, mobile and city.
 *
 * Choosing the country fixes the dialling code shown against the mobile
 * field, so every member enters only their national number and the record
 * holds all seventeen the same way.
 */
export function KycFields({ country = "IN" }: { country?: string }) {
  const [code, setCode] = useState(country);
  const chosen = countryByCode(code) ?? countryByCode("IN")!;

  return (
    <>
      <label className="label" htmlFor="country">Country</label>
      <select
        id="country"
        name="country"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        required
      >
        {NEAR.map((c) => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
        <option disabled>──────────</option>
        {REST_OF_WORLD.map((c) => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </select>

      <label className="label" htmlFor="phone">Mobile number</label>
      <div className="kyc-tel">
        <span className="kyc-dial" aria-hidden>+{chosen.dial}</span>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder={chosen.digits === 10 ? "98XXXXXXXX" : "Your number"}
          aria-describedby="phone-note"
          required
        />
      </div>
      <p className="kyc-hint" id="phone-note">
        Just your number — the <strong>+{chosen.dial}</strong> is added for you.
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

      <label className="label" htmlFor="city">City</label>
      <input
        id="city"
        name="city"
        list="city-hints"
        autoComplete="address-level2"
        placeholder="Pewe"
        required
      />
      <datalist id="city-hints">
        {CITY_HINTS.map((c) => <option key={c} value={c} />)}
      </datalist>
    </>
  );
}
