import "server-only";
import { neon } from "@neondatabase/serverless";
import { countryByCode, type Country } from "./countries";

/**
 * Member details, collected from the Management Committee.
 *
 * Action 2 of the minutes of 13 September 2026: "Create a form to collect
 * email addresses and updated contact details from all members for the
 * official record." Gmail specifically, because the committee meets on
 * Google Meet and a Gmail address is what a calendar invite needs.
 *
 * Only these seventeen can be filled in — the form offers the roll rather
 * than a free text box, so the sheet can never carry a name that was not
 * elected, and an outsider with the link has nobody to submit as.
 *
 * The connection string lives in DATABASE_URL, set in the Vercel project
 * settings. It is never committed: this repository is public, and these
 * are seventeen people's phone numbers.
 */

export interface Member { slug: string; name: string }

export const ROLL: Member[] = [
  { slug: "akhtar-khan",            name: "Akhtar Khan" },
  { slug: "irfan-anwar-khan",       name: "Irfan Anwar Khan" },
  { slug: "afzal-sarguro",          name: "Afzal Abdul Rahiman Khan Sarguro" },
  { slug: "ibrahim-usman-sarguroh", name: "Ibrahim Usman Sarguroh" },
  { slug: "khalid-razzak-sarguroh", name: "Khalid A. Razzak Khan Sarguroh" },
  { slug: "nisar-sarguroh",         name: "Nisar Sarguroh" },
  { slug: "aslam-ahmed-khan",       name: "Aslam Ahmed Khan" },
  { slug: "bilal-sarguroh",         name: "Bilal Sarguroh" },
  { slug: "sadiq-latif-khan",       name: "Sadiq Latif Khan" },
  { slug: "maqbool-pevekar",        name: "Maqbool Pevekar" },
  { slug: "smsg-khan",              name: "S. M. S. G. Khan (Shafi Saheb)" },
  { slug: "gayasali-khan",          name: "Gayasali Mahamood Khan S." },
  { slug: "mukri-hussain",          name: "Mukri Mohammed Hussain A." },
  { slug: "musaddiq-khan",          name: "Musaddiq Khan" },
  { slug: "abdul-qayyum-khan",      name: "Abdul Qayyum Khan" },
  { slug: "shakeel-abdul-samad",    name: "Shakeel Ahmed Abdul Samad" },
  { slug: "mubeen-pavekar",         name: "Mubeen Mohiuddin Pavekar" },
];

export function memberBySlug(slug: string): Member | undefined {
  return ROLL.find((m) => m.slug === slug);
}

export interface Submission {
  member_slug: string;
  member_name: string;
  phone: string;
  gmail: string;
  phone_cc: string;
  work_country: string;
  work_city: string;
  submitted_at: string;
  updated_at: string;
}


function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

/** True when the database is wired up, so pages can say so rather than break. */
export function isConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function allSubmissions(): Promise<Submission[]> {
  const sql = db();
  return (await sql`
    SELECT member_slug, member_name, phone, phone_cc, gmail,
           work_country, work_city, submitted_at, updated_at
    FROM kyc_submission
    ORDER BY updated_at DESC
  `) as Submission[];
}

/** One row per member — filling the form again corrects what is held. */
export async function saveSubmission(
  m: Member, phone: string, cc: string, gmail: string,
  country: string, city: string,
) {
  const sql = db();
  await sql`
    INSERT INTO kyc_submission
      (member_slug, member_name, phone, phone_cc, gmail, work_country, work_city)
    VALUES (${m.slug}, ${m.name}, ${phone}, ${cc}, ${gmail}, ${country}, ${city})
    ON CONFLICT (member_slug) DO UPDATE
      SET phone = EXCLUDED.phone,
          phone_cc = EXCLUDED.phone_cc,
          gmail = EXCLUDED.gmail,
          work_country = EXCLUDED.work_country,
          work_city = EXCLUDED.work_city,
          member_name = EXCLUDED.member_name,
          updated_at = now()
  `;
}

/* ---------------- what the form will accept ---------------- */

/**
 * The national number, checked against the country the member picked.
 *
 * Whatever they type is reduced to digits, then a leading zero and a
 * leading copy of the country's own dialling code are dropped — people
 * write 0982…, +91 982… and 0091 982… for the same number. Where a country
 * has one fixed length, that is enforced; otherwise six to fourteen digits.
 */
export function cleanPhone(raw: string, country: Country): string | null {
  let d = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (d.startsWith(country.dial) && d.length > country.dial.length + 5) {
    d = d.slice(country.dial.length).replace(/^0+/, "");
  }
  if (country.starts && !country.starts.includes(d[0] ?? "")) return null;
  if (country.digits) return d.length === country.digits ? d : null;
  return d.length >= 6 && d.length <= 14 ? d : null;
}

/** The country a member picked, by ISO code. */
export function pickCountry(code: string): Country | null {
  return countryByCode(code.trim().toUpperCase()) ?? null;
}

/** A Gmail address, lowercased. Returns it, or null. */
export function cleanGmail(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9._%+-]*@gmail\.com$/.test(v) ? v : null;
}

/**
 * Tidies a typed place name so the record does not carry "india", "INDIA"
 * and "India" as three different answers. Returns it, or null if empty.
 */
export function cleanPlace(raw: string): string | null {
  const v = raw.trim().replace(/\s+/g, " ");
  if (v.length < 2 || v.length > 60) return null;
  // Leave anything already carrying capitals alone — UAE, Ras Al Khaimah.
  if (/[A-Z]/.test(v)) return v;
  return v.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export function formatPhone(digits: string, cc: string): string {
  const grouped = digits.length === 10
    ? `${digits.slice(0, 5)} ${digits.slice(5)}`
    : digits;
  return cc ? `+${cc} ${grouped}` : grouped;
}
