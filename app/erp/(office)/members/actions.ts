"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { addMeeting, addMember, getMeeting, getMember, updateMeeting, updateMember } from "@/lib/erp/data";
import { clean, cleanLong, isDate, normalPhone } from "@/lib/erp/labels";
import type { FormState } from "@/lib/erp/form-state";

/** Members of the Society, and the meetings and notices of its committee. */

export async function saveMember(id: number | null, _: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser("editor");
  const errors: Record<string, string> = {};
  const name = clean(data.get("name"), 120);
  if (!name) errors.name = "Type the member's name.";
  const phoneRaw = clean(data.get("phone"), 30);
  const phone = phoneRaw ? normalPhone(phoneRaw) : null;
  if (phoneRaw && !phone) errors.phone = "This does not look like a phone number.";
  if (Object.keys(errors).length) return { errors };
  const f = {
    name: name!,
    phone,
    lives_in: clean(data.get("lives_in"), 80),
    post: clean(data.get("post"), 80),
    notes: clean(data.get("notes"), 300),
    active: data.get("inactive") !== "on",
  };
  if (id) {
    if (!(await getMember(id))) return { error: "This member is not in the office any more." };
    await updateMember(u, id, f);
    redirect("/erp/members?saved=1");
  }
  await addMember(u, f);
  redirect("/erp/members?added=1");
}

export async function saveMeeting(id: number | null, _: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser("editor");
  const errors: Record<string, string> = {};
  const raw = data.get("kind");
  const kind: "meeting" | "notice" | null = raw === "notice" || raw === "meeting" ? raw : null;
  if (!kind) errors.kind = "Is it a meeting or a notice?";
  const on_date = String(data.get("on_date") ?? "");
  if (!isDate(on_date)) errors.on_date = "Pick the date.";
  const title = clean(data.get("title"), 200);
  if (!title) errors.title = "Give it a short title.";
  if (Object.keys(errors).length) return { errors };
  const f = { kind: kind!, on_date, title: title!, body: cleanLong(data.get("body"), 20000), for_website: false };
  if (id) {
    if (!(await getMeeting(id))) return { error: "This entry is not in the office any more." };
    await updateMeeting(u, id, f);
    redirect(`/erp/meetings/${id}?saved=1`);
  }
  const newId = await addMeeting(u, f);
  redirect(`/erp/meetings/${newId}?new=1`);
}
