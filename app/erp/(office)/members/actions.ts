"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/erp/auth";
import { askApproval } from "@/lib/erp/books";
import { db, logChange } from "@/lib/erp/db";
import { revalidatePath } from "next/cache";
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
    active: true,
  };
  if (id) {
    const was = await getMember(id);
    if (!was) return { error: "This member is not in the office any more." };
    f.active = was.active;
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

/** Removing needs the approvers; bringing back does not. */
async function askRemove(entity: "family" | "member" | "work", id: number, summary: string, data: FormData): Promise<FormState> {
  const u = await requireUser("editor");
  const reason = clean(data.get("reason"), 300);
  if (!reason) return { errors: { reason: "Say why. The approvers read this. (Kyun?)" } };
  const r = await askApproval(u, { entity, entity_id: id, entity_key: `${entity}:${id}`, action: "remove", summary, reason });
  if ("error" in r) return { error: r.error };
  redirect(`/erp/approvals/${r.id}?new=1`);
}

export async function askRemoveMember(id: number, _: FormState, data: FormData): Promise<FormState> {
  const m = await getMember(id);
  if (!m || !m.active) return { error: "This member is already removed." };
  return askRemove("member", id, `member ${m.name}${m.lives_in ? ", " + m.lives_in : ""}`, data);
}

export async function bringBackMember(id: number, _: FormState): Promise<FormState> {
  const u = await requireUser("editor");
  const rows = await db()`UPDATE erp_member SET active = true, updated_at = now(), updated_by = ${u.id} WHERE id = ${id} AND NOT active RETURNING name`;
  if (rows[0]) await logChange(u.id, "changed", "member", id, `Brought back member ${rows[0].name}`);
  revalidatePath("/erp", "layout");
  redirect(`/erp/members/${id}?back=1`);
}
