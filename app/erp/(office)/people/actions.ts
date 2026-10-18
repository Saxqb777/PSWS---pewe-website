"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { OWNER_PHONE, makeInvite, requireUser, siteOrigin } from "@/lib/erp/auth";
import { addPerson, adminCount, getPerson, giveCommitteeAccess, setApprover, updatePerson } from "@/lib/erp/data";
import { logChange } from "@/lib/erp/db";
import { clean, normalPhone } from "@/lib/erp/labels";
import type { FormState } from "@/lib/erp/form-state";

/** Giving people access: only admins. Each person gets a link to set their own password. */

async function linkFor(userId: number, by: number, name: string, phone: string): Promise<NonNullable<FormState>["share"]> {
  const token = await makeInvite(userId, by);
  const url = `${await siteOrigin()}/erp/welcome?t=${token}`;
  const text = `Hello ${name}, this is your link to the PSWS office. Open it to set your own password. It works once, for 7 days.\n\n${url}\n\nAfter that, sign in with this mobile number and your password.`;
  return { url, text, phone };
}

export async function addPersonAction(_: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser("admin");
  const errors: Record<string, string> = {};
  const name = clean(data.get("name"), 80);
  if (!name) errors.name = "Type their name.";
  const phone = normalPhone(data.get("phone"));
  if (!phone) errors.phone = "Type their mobile number, e.g. 98123 45678.";
  const emailRaw = clean(data.get("email"), 120);
  const first_email = emailRaw ? emailRaw.toLowerCase() : null;
  if (first_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(first_email)) errors.email = "This does not look like a Gmail address.";
  if (Object.keys(errors).length) return { errors };
  // everyone in the office has full access
  const id = await addPerson(u, { name: name!, phone: phone!, role: "admin", post: clean(data.get("post"), 80), first_email });
  if (!id) return { errors: { phone: "Someone with this mobile number already has access. Find them in the list below." } };
  revalidatePath("/erp/people");
  return {
    done: first_email
      ? `${name} is added. They can sign in the first time with their mobile and this Gmail, or with this link.`
      : `${name} is added. Send them this link on WhatsApp so they can set their password.`,
    share: await linkFor(id, u.id, name!, phone!),
  };
}

export async function updatePersonAction(id: number, _: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser("admin");
  const p = await getPerson(id);
  if (!p) return { error: "This person is not in the office any more." };
  const name = clean(data.get("name"), 80);
  const active = data.get("inactive") !== "on";
  const errors: Record<string, string> = {};
  if (!name) errors.name = "Type their name.";
  if (Object.keys(errors).length) return { errors };
  // the office must always keep someone who can give access
  if (p.active && !active && (await adminCount()) <= 1)
    return { error: "This is the last person with access. Give someone else access first." };
  await updatePerson(u, id, { name: name!, role: "admin", post: clean(data.get("post"), 80), active });
  revalidatePath("/erp", "layout");
  return { done: active ? "Saved." : `${name} no longer has access, and has been signed out.` };
}

export async function newLinkAction(id: number, _: FormState): Promise<FormState> {
  const u = await requireUser("admin");
  const p = await getPerson(id);
  if (!p || !p.active) return { error: "Give them access again first." };
  await logChange(u.id, "access", "person", id, `New password link for ${p.name}`);
  return {
    done: `A new link for ${p.name}. Any older link stops working. Their password changes only when they use it.`,
    share: await linkFor(id, u.id, p.name, p.phone),
  };
}

/** Every committee member in the details form gets a login, all at once. */
export async function giveCommitteeAccessAction(_: FormState): Promise<FormState> {
  const u = await requireUser("admin");
  const n = await giveCommitteeAccess(u);
  redirect(`/erp/people?given=${n}`);
}

/** Who approves deletions and changes: set only by the website owner. */
export async function setApproverAction(id: number, _: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser();
  if (u.phone !== OWNER_PHONE) return { error: "Only the website owner sets the approvers." };
  await setApprover(u, id, data.get("approver") === "on");
  revalidatePath("/erp", "layout");
  return { done: "Saved." };
}
