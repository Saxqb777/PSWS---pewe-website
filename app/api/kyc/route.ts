import { NextResponse } from "next/server";
import { memberBySlug, saveSubmission, cleanPhone, cleanGmail, isConfigured } from "@/lib/kyc";

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

  const phone = cleanPhone(String(form.get("phone") ?? ""));
  if (!phone) return back("phone", slug);

  const gmail = cleanGmail(String(form.get("gmail") ?? ""));
  if (!gmail) return back("gmail", slug);

  if (!isConfigured()) return back("server", slug);

  try {
    await saveSubmission(member, phone, gmail);
  } catch {
    return back("server", slug);
  }

  const done = new URL("/kyc", req.url);
  done.searchParams.set("done", slug);
  return NextResponse.redirect(done, { status: 303 });
}
