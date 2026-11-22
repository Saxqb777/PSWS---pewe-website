"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assignMemberNo, requireAccountant, requireUser, siteOrigin } from "@/lib/erp/auth";
import { portalOn } from "@/lib/erp/flags";
import { addPortalMember, closeAsk, confirmPledge, getAsk, messageDone, notePhoto, pledgeNotFound, voteAsk } from "@/lib/erp/portal";
import { removeAskPhoto, savePicture } from "@/lib/erp/files";
import { clean, cleanLong, normalPhone, toPaise } from "@/lib/erp/labels";
import type { FormState } from "@/lib/erp/form-state";

/** The office's side of the members' portal. */

async function officeUser() {
  const u = await requireUser("editor");
  if (!portalOn()) redirect("/erp");
  return u;
}

/** Finding members' gifts in the bank is the PSWS Accountant's alone. */
async function accountantUser() {
  const u = await requireAccountant();
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

export async function foundPayment(id: number, _: FormState, data: FormData): Promise<FormState> {
  const u = await accountantUser();
  // only asked for a gift sent in another currency: the rupees that arrived
  const raw = data.get("rupees");
  const rupees = raw ? toPaise(raw) : null;
  if (raw && !rupees) return { errors: { rupees: "Type the rupees in numbers, e.g. 11250." } };
  const r = await confirmPledge(u, id, rupees);
  if ("error" in r) return { error: r.error };
  // the payment leaves the list, so the message goes on the page itself
  redirect(`/erp/portal?found=${encodeURIComponent(r.receipt_no)}`);
}

export async function paymentNotFound(id: number, _: FormState, data: FormData): Promise<FormState> {
  const u = await accountantUser();
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

/** A photo on any ask, from the office: often what the money did, with the closing note. */
export async function addAskPhoto(askId: number, _: FormState, data: FormData): Promise<FormState> {
  const u = await officeUser();
  const a = await getAsk(askId);
  if (!a) return { error: "This ask is not there any more." };
  const saved = await savePicture(u, data.get("photo"), "ask_photo", { askId, caption: clean(data.get("caption"), 120) });
  if (!saved) return { errors: { photo: "Choose a photo first." } };
  if ("error" in saved) return { errors: { photo: saved.error } };
  await notePhoto(u, a);
  revalidatePath(`/erp/portal/asks/${askId}`);
  return { done: "Photo added. Members who can see this ask see it." };
}

export async function takeOffAskPhoto(askId: number, photoId: number) {
  const u = await officeUser();
  await removeAskPhoto(u, photoId, askId);
  revalidatePath(`/erp/portal/asks/${askId}`);
}
