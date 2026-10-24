"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { changePassword, checkPassword, passwordProblem, requireMember } from "@/lib/erp/auth";
import { addAsk, addMessage, addPledge, getAsk, isPublicKind, withdrawAsk, withdrawPledge } from "@/lib/erp/portal";
import { ASK_KINDS, HEADS, METHODS, clean, cleanLong, isDate, isKey, todayIST, toPaise, type Head } from "@/lib/erp/labels";
import type { FormState } from "@/lib/erp/form-state";

/** What a member does on their own portal. */

export async function postAsk(_: FormState, data: FormData): Promise<FormState> {
  const u = await requireMember();
  const errors: Record<string, string> = {};
  const kind = data.get("kind");
  if (!isKey(ASK_KINDS, kind)) errors.kind = "Pick what it is. (Kya chahiye?)";
  const title = clean(data.get("title"), 90);
  if (!title) errors.title = "Say in one line what it is for.";
  const story = cleanLong(data.get("story"), 2000);
  const private_note = cleanLong(data.get("private_note"), 2000);
  if ((kind === "zakat" || kind === "help") && !private_note)
    errors.private_note = "Tell the office who it is for, so they can check. Only they see this.";
  let target: number | null = null;
  let closes_on: string | null = null;
  if (kind !== "help") {
    target = toPaise(data.get("target"));
    if (!target) errors.target = "How much is needed? Numbers only, e.g. 25000.";
    const d = String(data.get("closes_on") ?? "");
    if (d && (!isDate(d) || d < todayIST())) errors.closes_on = "Pick a date from today on.";
    closes_on = d || null;
  }
  const headRaw = data.get("head");
  const head: Head =
    kind === "zakat" ? "zakat" : kind === "collection" && (headRaw === "donation" || headRaw === "development") ? headRaw : "donation";
  if (Object.keys(errors).length) return { errors };
  const id = await addAsk(u, {
    kind: kind as keyof typeof ASK_KINDS,
    title: title!,
    story,
    private_note,
    target_paise: target,
    head,
    closes_on,
  });
  redirect(`/erp/me/asks/${id}?sent=1`);
}

/** "I have sent it": for an ask, or for a fund. */
export async function sendPledge(askId: number | null, _: FormState, data: FormData): Promise<FormState> {
  const u = await requireMember();
  const errors: Record<string, string> = {};
  let head: Head = "donation";
  if (askId) {
    const a = await getAsk(askId);
    if (!a || a.status !== "live" || !isPublicKind(a.kind)) return { error: "This ask is not open any more." };
    head = a.head;
  } else {
    const h = data.get("head");
    if (!isKey(HEADS, h)) errors.head = "What is it for? (Kis liye?)";
    else head = h as Head;
  }
  const amount = toPaise(data.get("amount"));
  if (!amount) errors.amount = "Type the amount in numbers, e.g. 1000.";
  const method = data.get("method");
  if (!isKey(METHODS, method)) errors.method = "How did you send it?";
  const reference = clean(data.get("reference"), 120);
  if ((method === "upi" || method === "bank") && !reference)
    errors.reference = "Type the number from the payment message, so the Treasurer can find it.";
  const sent_on = String(data.get("sent_on") ?? "");
  if (!isDate(sent_on) || sent_on > todayIST()) errors.sent_on = "Pick the day you sent it.";
  if (Object.keys(errors).length) return { errors };
  await addPledge(u, {
    ask_id: askId,
    amount_paise: amount!,
    head,
    method: method as keyof typeof METHODS,
    reference,
    sent_on,
    // names show unless the giver asks to keep theirs hidden
    show_name: data.get("hide_name") !== "on",
  });
  redirect(askId ? `/erp/me/asks/${askId}?gave=1` : "/erp/me/passbook?gave=1");
}

export async function takeBackAsk(id: number) {
  const u = await requireMember();
  await withdrawAsk(u, id);
  revalidatePath(`/erp/me/asks/${id}`);
}

export async function takeBackPledge(id: number) {
  const u = await requireMember();
  await withdrawPledge(u, id);
  revalidatePath("/erp/me/passbook");
}

export async function messageOffice(_: FormState, data: FormData): Promise<FormState> {
  const u = await requireMember();
  const body = cleanLong(data.get("body"), 1000);
  if (!body) return { errors: { body: "Type your message." } };
  await addMessage(u, body);
  return { done: "Sent. The office will see it and reply." };
}

export async function changePortalPassword(_: FormState, data: FormData): Promise<FormState> {
  const u = await requireMember();
  const current = String(data.get("current") ?? "");
  const password = String(data.get("password") ?? "");
  const again = String(data.get("again") ?? "");
  if (!(await checkPassword(u.id, current))) return { errors: { current: "That is not your current password." } };
  const problem = passwordProblem(password);
  if (problem) return { errors: { password: problem } };
  if (password !== again) return { errors: { again: "The two passwords are not the same." } };
  await changePassword(u.id, password);
  return { done: "Your password is changed. Other phones signed in as you have been signed out." };
}
