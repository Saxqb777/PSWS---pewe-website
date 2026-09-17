/**
 * Countries and their dialling codes, for the member details form.
 *
 * Picking the country sets the code on the phone field, so every number in
 * the record is held the same way — a dial code and the national number,
 * with no +91 typed by one member and 0091 by the next.
 *
 * The village, the Gulf and the places our members actually work sit at the
 * top of the list; the rest follow alphabetically. If somebody is somewhere
 * that is not here, add it — the form cannot be filled without a match.
 */

export interface Country {
  /** ISO 3166-1 alpha-2, and the value stored against the member. */
  code: string;
  name: string;
  /** Dialling code, without the plus. */
  dial: string;
  /** Exact national number length, where it is worth enforcing. */
  digits?: number;
  /** Digits a national number may begin with, where that is well defined. */
  starts?: string;
}

/** Shown first, because this is where the committee actually is. */
export const NEAR: Country[] = [
  { code: "IN", name: "India",                dial: "91",  digits: 10, starts: "6789" },
  { code: "AE", name: "United Arab Emirates", dial: "971" },
  { code: "SA", name: "Saudi Arabia",         dial: "966" },
  { code: "OM", name: "Oman",                 dial: "968" },
  { code: "QA", name: "Qatar",                dial: "974" },
  { code: "KW", name: "Kuwait",               dial: "965" },
  { code: "BH", name: "Bahrain",              dial: "973" },
];

/** Everywhere else, alphabetically. */
export const REST_OF_WORLD: Country[] = [
  { code: "AF", name: "Afghanistan",     dial: "93" },
  { code: "DZ", name: "Algeria",         dial: "213" },
  { code: "AU", name: "Australia",       dial: "61" },
  { code: "AT", name: "Austria",         dial: "43" },
  { code: "BD", name: "Bangladesh",      dial: "880" },
  { code: "BE", name: "Belgium",         dial: "32" },
  { code: "BT", name: "Bhutan",          dial: "975" },
  { code: "BR", name: "Brazil",          dial: "55" },
  { code: "BN", name: "Brunei",          dial: "673" },
  { code: "KH", name: "Cambodia",        dial: "855" },
  { code: "CA", name: "Canada",          dial: "1" },
  { code: "CN", name: "China",           dial: "86" },
  { code: "CZ", name: "Czechia",         dial: "420" },
  { code: "DK", name: "Denmark",         dial: "45" },
  { code: "EG", name: "Egypt",           dial: "20" },
  { code: "ET", name: "Ethiopia",        dial: "251" },
  { code: "FI", name: "Finland",         dial: "358" },
  { code: "FR", name: "France",          dial: "33" },
  { code: "DE", name: "Germany",         dial: "49" },
  { code: "GH", name: "Ghana",           dial: "233" },
  { code: "GR", name: "Greece",          dial: "30" },
  { code: "HK", name: "Hong Kong",       dial: "852" },
  { code: "ID", name: "Indonesia",       dial: "62" },
  { code: "IR", name: "Iran",            dial: "98" },
  { code: "IQ", name: "Iraq",            dial: "964" },
  { code: "IE", name: "Ireland",         dial: "353" },
  { code: "IL", name: "Israel",          dial: "972" },
  { code: "IT", name: "Italy",           dial: "39" },
  { code: "JP", name: "Japan",           dial: "81" },
  { code: "JO", name: "Jordan",          dial: "962" },
  { code: "KE", name: "Kenya",           dial: "254" },
  { code: "LB", name: "Lebanon",         dial: "961" },
  { code: "LY", name: "Libya",           dial: "218" },
  { code: "MY", name: "Malaysia",        dial: "60" },
  { code: "MV", name: "Maldives",        dial: "960" },
  { code: "MU", name: "Mauritius",       dial: "230" },
  { code: "MX", name: "Mexico",          dial: "52" },
  { code: "MA", name: "Morocco",         dial: "212" },
  { code: "MM", name: "Myanmar",         dial: "95" },
  { code: "NP", name: "Nepal",           dial: "977" },
  { code: "NL", name: "Netherlands",     dial: "31" },
  { code: "NZ", name: "New Zealand",     dial: "64" },
  { code: "NG", name: "Nigeria",         dial: "234" },
  { code: "NO", name: "Norway",          dial: "47" },
  { code: "PK", name: "Pakistan",        dial: "92" },
  { code: "PH", name: "Philippines",     dial: "63" },
  { code: "PL", name: "Poland",          dial: "48" },
  { code: "PT", name: "Portugal",        dial: "351" },
  { code: "RU", name: "Russia",          dial: "7" },
  { code: "SC", name: "Seychelles",      dial: "248" },
  { code: "SG", name: "Singapore",       dial: "65" },
  { code: "ZA", name: "South Africa",    dial: "27" },
  { code: "KR", name: "South Korea",     dial: "82" },
  { code: "ES", name: "Spain",           dial: "34" },
  { code: "LK", name: "Sri Lanka",       dial: "94" },
  { code: "SD", name: "Sudan",           dial: "249" },
  { code: "SE", name: "Sweden",          dial: "46" },
  { code: "CH", name: "Switzerland",     dial: "41" },
  { code: "TW", name: "Taiwan",          dial: "886" },
  { code: "TZ", name: "Tanzania",        dial: "255" },
  { code: "TH", name: "Thailand",        dial: "66" },
  { code: "TN", name: "Tunisia",         dial: "216" },
  { code: "TR", name: "Türkiye",         dial: "90" },
  { code: "UG", name: "Uganda",          dial: "256" },
  { code: "GB", name: "United Kingdom",  dial: "44" },
  { code: "US", name: "United States",   dial: "1" },
  { code: "VN", name: "Vietnam",         dial: "84" },
  { code: "YE", name: "Yemen",           dial: "967" },
  { code: "ZM", name: "Zambia",          dial: "260" },
  { code: "ZW", name: "Zimbabwe",        dial: "263" },
];

export const COUNTRIES: Country[] = [...NEAR, ...REST_OF_WORLD];

export function countryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

/** Offered as suggestions on the city box; anything may be typed. */
export const CITY_HINTS = [
  "Pewe", "Mumbai", "Chiplun", "Khed", "Guhagar", "Ratnagiri",
  "Pune", "Dubai", "Abu Dhabi", "Sharjah", "Muscat", "Doha",
];
