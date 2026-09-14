import { NextResponse } from "next/server";
import { GATE_COOKIE, sha256, expectedDigest, digestsMatch } from "@/lib/gate";

/** Checks the shared password and, if it is right, opens the site for 30 days. */
export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/erp");

  const digest = await sha256(password);
  if (!digestsMatch(digest, await expectedDigest())) {
    const url = new URL("/enter", req.url);
    url.searchParams.set("next", next);
    url.searchParams.set("wrong", "1");
    return NextResponse.redirect(url, { status: 303 });
  }

  // Send them where they were going, unless that is off-site.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/erp";
  const res = NextResponse.redirect(new URL(safeNext, req.url), { status: 303 });
  res.cookies.set(GATE_COOKIE, digest, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

/** Signing out, for a shared phone. */
export async function DELETE(req: Request) {
  const res = NextResponse.redirect(new URL("/", req.url), { status: 303 });
  res.cookies.delete(GATE_COOKIE);
  return res;
}
