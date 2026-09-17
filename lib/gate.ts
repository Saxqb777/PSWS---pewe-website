/**
 * The members' gate.
 *
 * The site's front page is open to anyone. Everything behind it is still
 * being built, so it is held behind one shared password that the committee
 * passes around.
 *
 * THE PASSWORD IS NEVER STORED IN THIS REPOSITORY. This repository is
 * public, so a password written here would be readable by anyone and the
 * gate would protect nothing. Only a SHA-256 digest is kept, and even that
 * is a fallback so the gate works the moment it is deployed.
 *
 * To make the gate genuinely strong, set SITE_PASSWORD in the Vercel
 * project settings. When it is set, nothing about the password can be
 * worked out from this repository at all, and it can be changed at any
 * time without a commit.
 */

/** SHA-256 of the committee's current shared password. Fallback only. */
const FALLBACK_DIGEST =
  "0a828cee5fa99490a1173efbce4f32cf70cf781dc22dcd563ba44f57dae262a9";

export const GATE_COOKIE = "psws_gate";

/** Hex SHA-256. Web Crypto, so this runs in middleware and in a route alike. */
export async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** What a valid cookie must equal. From the environment when it is set. */
export async function expectedDigest(): Promise<string> {
  const fromEnv = process.env.SITE_PASSWORD;
  return fromEnv ? sha256(fromEnv) : FALLBACK_DIGEST;
}

/** Length-independent, constant-time-ish comparison of two hex digests. */
export function digestsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Paths anyone may open without the password: the front page, the gate
 * itself, and the minutes, which the committee shares by link on purpose.
 */
export function isOpenPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/enter" || pathname === "/api/enter") return true;
  if (pathname === "/minutes") return true;
  // The details form is opened from a WhatsApp link, so members are not sent
  // hunting for a password to fill it. Its report is held, like everything else.
  if (pathname === "/kyc" || pathname === "/api/kyc") return true;
  return false;
}
