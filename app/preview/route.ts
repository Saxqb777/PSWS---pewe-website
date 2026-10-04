import { NextResponse, type NextRequest } from "next/server";
import { digestsMatch, sha256 } from "@/lib/gate";
import { PREVIEW_COOKIE, expectedPreviewDigest } from "@/lib/preview";

/**
 * Opening /preview?key=… with the right key lets this browser see the new
 * front page from then on. /preview?off=1 forgets it again.
 */
export async function GET(req: NextRequest) {
  const home = req.nextUrl.clone();
  home.pathname = "/";
  home.search = "";

  if (req.nextUrl.searchParams.get("off") === "1") {
    const res = NextResponse.redirect(home);
    res.cookies.delete(PREVIEW_COOKIE);
    return res;
  }

  const key = req.nextUrl.searchParams.get("key") ?? "";
  const digest = key ? await sha256(key) : "";
  const res = NextResponse.redirect(home);
  if (digest && digestsMatch(digest, await expectedPreviewDigest())) {
    res.cookies.set(PREVIEW_COOKIE, digest, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  return res;
}
