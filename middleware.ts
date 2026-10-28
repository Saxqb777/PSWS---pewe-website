import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, expectedDigest, digestsMatch, isOpenPath } from "@/lib/gate";

/**
 * Holds everything but the front page behind the committee's shared
 * password while the rest of the site is being built.
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // A site set up for one vote (VOTE_ONLY=water) shows that vote and nothing else.
  const only = process.env.VOTE_ONLY;
  if (only && !pathname.startsWith("/vote/")) {
    const to = req.nextUrl.clone();
    to.pathname = `/vote/${only}`;
    to.search = "";
    return NextResponse.redirect(to);
  }

  if (isOpenPath(pathname)) return NextResponse.next();

  const cookie = req.cookies.get(GATE_COOKIE)?.value ?? "";
  if (cookie && digestsMatch(cookie, await expectedDigest())) {
    return NextResponse.next();
  }

  const gate = req.nextUrl.clone();
  gate.pathname = "/enter";
  gate.search = "";
  // Remember where they were headed, so the password takes them there.
  gate.searchParams.set("next", pathname + search);
  return NextResponse.redirect(gate);
}

export const config = {
  // Everything except Next's own assets, the image and map-data folders, the site icons and the share picture.
  matcher: [
    "/((?!_next/static|_next/image|images/|map/|favicon|icon|apple-icon|og.jpg|robots.txt|sitemap.xml).*)",
  ],
};
