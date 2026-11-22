"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  LOOK_COOKIE,
  backToOwner,
  handOverAccountant,
  makeInvite,
  requireOwner,
  siteOrigin,
  workAsAccountant,
} from "@/lib/erp/auth";
import {
  activeAdmins,
  clearPassword,
  getAccount,
  getAccountant,
  noteHandOver,
  noteLooking,
  officePeople,
  setActive,
  setContact,
  unlock,
} from "@/lib/erp/control";
import { clean, normalPhone } from "@/lib/erp/labels";
import { logChange } from "@/lib/erp/db";
import type { FormState } from "@/lib/erp/form-state";

/** The control room's fixes: only the website owner, and every one written to the history. */

async function account(id: number) {
  const a = await getAccount(id);
  if (!a) redirect("/erp/control");
  return a;
}

const done = (id: number) => {
  revalidatePath("/erp/control");
  revalidatePath(`/erp/control/people/${id}`);
};

/** Open their portal as they see it, look only, until "Stop looking". */
export async function lookAt(id: number) {
  const u = await requireOwner();
  const a = await account(id);
  (await cookies()).set(LOOK_COOKIE, String(a.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/erp",
    maxAge: 60 * 60 * 2,
  });
  await noteLooking(u, a);
  redirect("/erp/me");
}

export async function stopLooking() {
  await requireOwner();
  const jar = await cookies();
  const id = jar.get(LOOK_COOKIE)?.value;
  jar.delete({ name: LOOK_COOKIE, path: "/erp" });
  redirect(id ? `/erp/control/people/${id}` : "/erp/control");
}

export async function unlockAction(id: number, _: FormState): Promise<FormState> {
  const u = await requireOwner();
  const a = await account(id);
  await unlock(u, a);
  done(id);
  // the locked box goes away once unlocked, so the page itself says it worked
  redirect(`/erp/control/people/${id}?unlocked=1`);
}

export async function resetPasswordAction(id: number, _: FormState): Promise<FormState> {
  const u = await requireOwner();
  const a = await account(id);
  await clearPassword(u, a);
  done(id);
  const url = `${await siteOrigin()}/erp/welcome?t=${await makeInvite(a.id, u.id)}`;
  const text = `Hello ${a.name}, your PSWS password has been reset. Open this link to choose a new one. It works once, for 7 days.\n\n${url}${
    a.first_email ? `\n\nOr open ${await siteOrigin()}/erp/login?first=1 and use your mobile number and Gmail.` : ""
  }`;
  return {
    done: `${a.name}'s password is cleared and they are signed out. Send them this link to choose a new one.`,
    share: { url, text, phone: a.phone },
  };
}

export async function contactAction(id: number, _: FormState, data: FormData): Promise<FormState> {
  const u = await requireOwner();
  const a = await account(id);
  const errors: Record<string, string> = {};
  const phone = normalPhone(data.get("phone"));
  if (!phone) errors.phone = "Type their mobile number, e.g. 98123 45678.";
  const raw = clean(data.get("email"), 120);
  const email = raw ? raw.toLowerCase() : null;
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = "This does not look like a Gmail address.";
  if (Object.keys(errors).length) return { errors };
  if ((await setContact(u, a, phone!, email)) === "taken")
    return { errors: { phone: "Someone else already signs in with this mobile number." } };
  done(id);
  return { done: "Saved." };
}

export async function activeAction(id: number, _: FormState): Promise<FormState> {
  const u = await requireOwner();
  const a = await account(id);
  const on = !a.active;
  if (!on && a.role === "admin" && (await activeAdmins()) <= 1)
    return { error: "This is the last person in the office with access. Give someone else access first." };
  await setActive(u, a, on);
  done(id);
  return { done: on ? `${a.name} can sign in again.` : `${a.name} can no longer sign in, and has been signed out.` };
}

/* ------------------------------------------------------------ the PSWS Accountant */

/** While you hold it: work as the Accountant on this browser, and come back with one tap. */
export async function workAsAccountantAction() {
  const u = await requireOwner();
  if (!(await workAsAccountant(u))) redirect("/erp/control?accountant=held");
  redirect("/erp/money");
}

export async function backToOwnerAction() {
  if (!(await backToOwner())) redirect("/erp/login");
  redirect("/erp/control");
}

/** The message that goes with the Accountant's link, on WhatsApp. */
async function accountantMessage(name: string, token: string) {
  const origin = await siteOrigin();
  const url = `${origin}/erp/welcome?t=${token}`;
  const text = [
    `Hello ${name}, you are now the PSWS Accountant.`,
    "",
    "Open this link to choose the Accountant's password. It works once, for 7 days:",
    url,
    "",
    `After that, sign in at ${origin}/erp/login with the word "accountant" and that password.`,
    "Only the Accountant records money in and out, and confirms members' gifts against the bank.",
  ].join("\n");
  return { url, text };
}

export async function handOverAction(_: FormState, data: FormData): Promise<FormState> {
  const u = await requireOwner();
  const toId = Number(data.get("to"));
  const to = (await officePeople()).find((p) => p.id === toId);
  if (!to) return { errors: { to: "Pick who will be the Accountant." } };
  const { id, token } = await handOverAccountant(u, to.id);
  await noteHandOver(u, id, to.name);
  const holder = await getAccountant();
  const { url, text } = await accountantMessage(to.name, token!);
  // no page refresh here: it would put "Take it back" in this form's place, and the link with it
  return {
    done: `${to.name} is now the PSWS Accountant. Send them this link to choose its password. If you lose it, open the control room again and make it again.`,
    share: { url, text, phone: holder?.holder_phone ?? null },
  };
}

/** The link again, for whoever holds the Accountant: when it was lost, ran out, or they forgot the password. The old link stops working. */
export async function accountantLinkAction(_: FormState): Promise<FormState> {
  const u = await requireOwner();
  const acc = await getAccountant();
  if (!acc?.holder_name) return { error: "You hold the Accountant's account yourself. Hand it over first." };
  const token = await makeInvite(acc.id, u.id);
  await logChange(u.id, "access", "person", acc.id, `New link for ${acc.holder_name} to choose the PSWS Accountant's password`);
  const { url, text } = await accountantMessage(acc.holder_name, token);
  return {
    done: `A new link for ${acc.holder_name}. The old one no longer works.`,
    share: { url, text, phone: acc.holder_phone },
  };
}

export async function takeBackAction(_: FormState): Promise<FormState> {
  const u = await requireOwner();
  const { id } = await handOverAccountant(u, null);
  await noteHandOver(u, id, null);
  revalidatePath("/erp/control");
  return { done: "You hold the Accountant's account again. Its password is cleared and it is signed out everywhere." };
}
