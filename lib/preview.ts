import { sha256 } from "./gate";

/**
 * The private preview of the new front page.
 *
 * Until the committee says "go public", the 3D Pewe is shown only to people
 * who have opened the private link (/preview?key=…). That sets a cookie, so
 * they see it on every later visit. Everyone else sees a short holding page.
 *
 * THE KEY IS NEVER STORED IN THIS REPOSITORY, which is public. Only its
 * SHA-256 digest is kept, as a fallback. Set PREVIEW_KEY in Vercel to
 * replace it without a commit (and to cut off old links).
 *
 * Going public: set PEWE_PUBLIC=1 in Vercel and redeploy. Everyone then
 * sees the 3D Pewe at /, and the preview link simply stops mattering.
 */

const FALLBACK_PREVIEW_DIGEST = "ee2d098c7b169f2d7aa1f6e81a75f0e2137a6e8ee47819652ab8b20fed0a74ad";

export const PREVIEW_COOKIE = "pewe_preview";

export async function expectedPreviewDigest(): Promise<string> {
  const fromEnv = process.env.PREVIEW_KEY;
  return fromEnv ? sha256(fromEnv) : FALLBACK_PREVIEW_DIGEST;
}

export function isPublicLaunch(): boolean {
  return process.env.PEWE_PUBLIC === "1";
}
