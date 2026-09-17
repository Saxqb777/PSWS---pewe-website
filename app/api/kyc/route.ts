import { NextResponse } from "next/server";
import {
  memberBySlug, saveSubmission, pickCountry, cleanPhone, cleanGmail,
  cleanPlace, isConfigured,
} from "@/lib/kyc";

/** Takes one member's details from the form and holds them for the office. */
export async function POST(req: Request) {
  const back = (error: string, member?: string) => {
    const url = new URL("/kyc", req.url);
    url.searchParams.set("error", error);
    if (member) url.searchParams.set("member", member);
    return NextResponse.redirect(url, { status: 303 });
  };

  const form = await req.formData();
  const slug = String(form.get("member") ?? "");
  const member = memberBySlug(slug);
  if (!member) return back("member");

  const country = pickCountry(String(form.get("country") ?? ""));
  if (!country) return back("country", slug);

  // The number is checked against the country, so the record holds a
  // dialling code and a national number rather than seventeen formats.
  const phone = cleanPhone(String(form.get("phone") ?? ""), country);
  if (!phone) return back(country.digits ? "phone" : "phonecc", slug);

  const gmail = cleanGmail(String(form.get("gmail") ?? ""));
  if (!gmail) return back("gmail", slug);

  const city = cleanPlace(String(form.get("city") ?? ""));
  if (!city) return back("city", slug);

  if (!isConfigured()) return back("server", slug);

  try {
    await saveSubmission(member, phone, country.dial, gmail, country.name, city);
  } catch {
    return back("server", slug);
  }

  const done = new URL("/kyc", req.url);
  done.searchParams.set("done", slug);
  return NextResponse.redirect(done, { status: 303 });
}
