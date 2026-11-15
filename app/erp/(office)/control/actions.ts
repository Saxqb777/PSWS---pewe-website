"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOOK_COOKIE, makeInvite, requireOwner, siteOrigin } from "@/lib/erp/auth";
import { activeAdmins, clearPassword, getAccount, noteLooking, setActive, setContact, unlock } from "@/lib/erp/control";
import { clean, normalPhone } from "@/lib/erp/labels";
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
