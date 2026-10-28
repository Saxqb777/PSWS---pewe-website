"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { VOTER_COOKIE, cast } from "@/lib/vote";

/** Tapping an option: this phone's vote, then the thank-you. */
export async function vote(slug: string, data: FormData) {
  const choice = String(data.get("choice") ?? "");
  const jar = await cookies();
  let token = jar.get(VOTER_COOKIE)?.value;
  if (!token) {
    token = randomBytes(24).toString("base64url");
    jar.set(VOTER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/vote",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  const ok = await cast(slug, token, choice);
  redirect(`/vote/${slug}${ok ? "?thanks=1" : ""}`);
}
