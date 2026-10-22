"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assignMemberNo, requireUser, siteOrigin } from "@/lib/erp/auth";
import { portalOn } from "@/lib/erp/flags";
import { addPortalMember, closeAsk, confirmPledge, messageDone, pledgeNotFound, voteAsk } from "@/lib/erp/portal";
import { clean, cleanLong, normalPhone } from "@/lib/erp/labels";
import type { FormState } from "@/lib/erp/form-state";

/** The office's side of the members' portal. */

async function officeUser() {
  const u = await requireUser("editor");
  if (!portalOn()) redirect("/erp");
  return u;
}

export async function voteOnAsk(id: number, _: FormState, data: FormData): Promise<FormState> {
  const u = await officeUser();
  const yes = data.get("vote") === "yes";
  const note = clean(data.get("note"), 300);
  if (!yes && !note) return { errors: { note: "Say why not, so the member knows. (Kyun nahi?)" } };
  const err = await voteAsk(u, id, yes, note);
  if (err) return { error: err };
  redirect(`/erp/portal/asks/${id}?voted=1`);
}

export async function foundPayment(id: number, _: FormState): Promise<FormState> {
  const u = await officeUser();
  const r = await confirmPledge(u, id);
  if ("error" in r) return { error: r.error };
  // the payment leaves the list, so the message goes on the page itself
  redirect(`/erp/portal?found=${encodeURIComponent(r.receipt_no)}`);
}

export async function paymentNotFound(id: number, _: FormState, data: FormData): Promise<FormState> {
  const u = await officeUser();
  const note = clean(data.get("note"), 300);
  if (!note) return { errors: { note: "Tell them what to check, e.g. the UPI number does not match." } };
  const err = await pledgeNotFound(u, id, note);
  if (err) return { error: err };
  redirect("/erp/portal?notfound=1");
}

export async function closeTheAsk(id: number, _: FormState, data: FormData): Promise<FormState> {
  const u = await officeUser();
  const note = cleanLong(data.get("note"), 1000);
  if (!note) return { errors: { note: "Say how the money was spent. Every member reads this." } };
  const err = await closeAsk(u, id, note);
  if (err) return { error: err };
  redirect(`/erp/portal/asks/${id}?closed=1`);
}

export async function messageIsDone(id: number) {
  const u = await officeUser();
  await messageDone(u, id);
  revalidatePath("/erp/portal");
}

/** A member with only a portal. They choose their password the first time, with their mobile and Gmail. */
export async function addMember(_: FormState, data: FormData): Promise<FormState> {
  const u = await officeUser();
  const errors: Record<string, string> = {};
  const name = clean(data.get("name"), 80);
  if (!name) errors.name = "Type their name.";
  const phone = normalPhone(data.get("phone"));
  if (!phone) errors.phone = "Type their mobile number. From abroad, start with + and the country code.";
  const email = String(data.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = "Type their Gmail: they need it to sign in the first time.";
  if (Object.keys(errors).length) return { errors };
  const id = await addPortalMember(u, { name: name!, phone: phone!, first_email: email, lives_in: clean(data.get("lives_in"), 80) });
  if (!id) return { errors: { phone: "Someone already has this mobile number." } };
  const no = await assignMemberNo(id);
  const url = `${await siteOrigin()}/erp/login?first=1`;
  revalidatePath("/erp/portal/members");
  return {
    done: `${name} is a member. Their PSWS number is ${no}.`,
    share: {
      url,
      phone,
      text: `Hello ${name}, you now have your own PSWS portal. Your PSWS number is ${no}.\n\nOpen ${url}, tap "First time here", and use your mobile number and this Gmail: ${email}. Then choose your password.`,
    },
  };
}
