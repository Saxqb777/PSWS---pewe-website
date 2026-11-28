"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actingMember, changePassword, checkPassword, passwordProblem } from "@/lib/erp/auth";
import { addAsk, addMessage, addPledge, getAsk, isPublicKind, notePhoto, replyToMeeting, withdrawAsk, withdrawPledge } from "@/lib/erp/portal";
import { ASK_KINDS, HEADS, METHODS, clean, cleanLong, isCountry, isDate, isKey, todayIST, toPaise, type Head } from "@/lib/erp/labels";
import { toId, type FormState } from "@/lib/erp/form-state";
import { readDetail, readGivers } from "@/lib/erp/details";
import { addPromise, dropPromise, keepPromise, openPromise } from "@/lib/erp/collection";
import { askPhotos, pictureBytes, removeAskPhoto, savePicture } from "@/lib/erp/files";
import { paidToPsws, readerOn, sameName, seePayment } from "@/lib/erp/screenshot";

/** What the Give form learns from a payment screenshot, to fill itself in. */
export type ProofRead =
  | {
      ok: true;
      amount_paise: number | null;
      sent_on: string | null;
      reference: string | null;
      method: "upi" | "bank";
      payer_name: string | null;
      payer_bank: string | null;
      app: string | null;
      status: "success" | "failed" | "pending" | "unknown";
      paid_to: "psws" | "other" | "unknown";
      /** the payer's name is not the member's: likely someone else's money */
      other_person: boolean;
      /** paid from an NRO or NRE account: the giver may live abroad */
      abroad: boolean;
    }
  | { ok: false; why: "off" | "not_a_payment" | "unreadable" | "bad_file" };

/** "FUZAIL KHAN", as a bank prints it, becomes "Fuzail Khan"; a name with small letters in it is left as it is. */
const tidyName = (n: string | null) =>
  n && n === n.toUpperCase() ? n.toLowerCase().replace(/(^|[\s.-])([a-z])/g, (m, a, b) => a + b.toUpperCase()) : n;

/** The member chose a screenshot: read it, so the form fills itself. Never an error for the member, only "type it". */
export async function readProof(data: FormData): Promise<ProofRead> {
  const u = await actingMember();
  if (!readerOn()) return { ok: false, why: "off" };
  const pic = await pictureBytes(data.get("proof"));
  if (!pic || "error" in pic) return { ok: false, why: "bad_file" };
  const s = await seePayment(pic.bytes, pic.mime);
  if (!s) return { ok: false, why: "unreadable" };
  if (!s.is_payment) return { ok: false, why: "not_a_payment" };
  const today = todayIST();
  const date = s.date && isDate(s.date) && s.date <= today ? s.date : null;
  const upi = s.upi_transaction_id?.replace(/\D/g, "") ?? "";
  const rupees = s.amount_rupees && s.amount_rupees > 0 && s.amount_rupees < 1e8 ? s.amount_rupees : null;
  return {
    ok: true,
    amount_paise: rupees ? Math.round(rupees * 100) : null,
    sent_on: date,
    reference: upi.length === 12 ? upi : clean(s.other_reference, 120),
    method: s.method === "bank" ? "bank" : "upi",
    payer_name: tidyName(clean(s.payer_name, 80)),
    payer_bank: clean(s.payer_bank, 80),
    app: clean(s.app, 40),
    status: s.status,
    paid_to: paidToPsws(s),
    other_person: !!s.payer_name && !sameName(u.name, s.payer_name),
    abroad: s.payer_account_type === "nro" || s.payer_account_type === "nre",
  };
}

/** What a member does on their own portal. */

export async function postAsk(_: FormState, data: FormData): Promise<FormState> {
  const u = await actingMember();
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
    kind === "zakat"
      ? "zakat"
      : kind === "collection" && (headRaw === "zakat" || headRaw === "donation" || headRaw === "development")
        ? headRaw
        : "donation";
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
  const u = await actingMember();
  const errors: Record<string, string> = {};
  let head: Head = "donation";
  let head_other: string | null = null;
  if (askId) {
    const a = await getAsk(askId);
    if (!a || a.status !== "live" || !isPublicKind(a.kind)) return { error: "This appeal is not open any more." };
    head = a.head;
  } else {
    const h = data.get("head");
    if (!isKey(HEADS, h)) errors.head = "What is it for? (Kis liye?)";
    else head = h as Head;
    head_other = head === "other" ? clean(data.get("head_other"), 120) : null;
    if (head === "other" && !head_other) errors.head_other = "Say what it is for. (Kis liye?)";
  }
  const method = data.get("method");
  if (!isKey(METHODS, method)) errors.method = "How did you send it?";
  const detail = readDetail(data, isKey(METHODS, method) ? method : null, errors);
  // in rupees, or in the currency it was sent in: then the Accountant types the rupees that arrived
  const amount = detail.currency ? null : toPaise(data.get("amount"));
  if (!detail.currency && !amount) errors.amount = "Type the amount in numbers, e.g. 1000.";
  const reference = clean(data.get("reference"), 120);
  // with a screenshot attached the Accountant can read the number from it, so it need not be typed
  const proofFile = data.get("proof");
  const hasProof = !!proofFile && typeof proofFile !== "string" && proofFile.size > 0;
  if ((method === "upi" || method === "bank") && !reference && !hasProof)
    errors.reference = "Type the UTR, the 12-digit number of the payment, or add the screenshot, so the Accountant can find it.";
  const sent_on = String(data.get("sent_on") ?? "");
  if (!isDate(sent_on) || sent_on > todayIST()) errors.sent_on = "Pick the day you sent it.";
  // whose money it is: the member's own; one other person's, in that person's name, the member only paid it
  // in; or gathered from several. The last two count for the ask and as the member's collection, not their gift
  const who = data.get("from_who");
  const fromWho = who === "someone" || who === "many" ? who : "me";
  const collected = fromWho !== "me";
  let g: { people: number | null; givers: string[]; givers_hidden: boolean } = { people: null, givers: [], givers_hidden: false };
  if (fromWho === "someone") {
    const name = clean(data.get("giver_name"), 80);
    if (!name) errors.giver_name = "Type the name of the person whose money it is.";
    // their name shows unless the member ticks to keep it hidden; it always stays on the receipt
    g = { people: 1, givers: name ? [name] : [], givers_hidden: data.get("hide_name") === "on" };
  } else if (fromWho === "many") g = readGivers(data, errors);
  if (Object.keys(errors).length) return { errors };
  // paying a promise made earlier to this appeal: it then counts as sent, not promised
  const promiseId = askId ? toId(String(data.get("promise_id") ?? "")) : null;
  if (promiseId && !(await openPromise(u.id, promiseId, askId!))) errors.promise_id = "That commitment is not open any more.";
  if (Object.keys(errors).length) return { errors };
  const proof = await savePicture(u, data.get("proof"), "proof");
  if (proof && "error" in proof) return { errors: { proof: proof.error } };
  const pledgeId = await addPledge(u, {
    ask_id: askId,
    amount_paise: amount,
    head,
    head_other,
    method: method as keyof typeof METHODS,
    reference,
    sent_on,
    ...detail,
    // names show unless the giver asks to keep theirs hidden
    show_name: data.get("hide_name") !== "on",
    collected,
    people: g.people,
    givers: g.givers,
    givers_hidden: g.givers_hidden,
    proof_id: proof?.id ?? null,
  });
  if (promiseId) await keepPromise(u.id, promiseId, askId!, pledgeId);
  const flag = collected ? "gave=1&collected=1" : "gave=1";
  redirect(askId ? `/erp/me/asks/${askId}?${flag}` : `/erp/me/passbook?${flag}`);
}

export async function takeBackAsk(id: number) {
  const u = await actingMember();
  await withdrawAsk(u, id);
  revalidatePath(`/erp/me/asks/${id}`);
}

export async function takeBackPledge(id: number) {
  const u = await actingMember();
  await withdrawPledge(u, id);
  revalidatePath("/erp/me/passbook");
}

export async function messageOffice(_: FormState, data: FormData): Promise<FormState> {
  const u = await actingMember();
  const body = cleanLong(data.get("body"), 1000);
  if (!body) return { errors: { body: "Type your message." } };
  await addMessage(u, body);
  return { done: "Sent. The office will see it and reply." };
}

export async function changePortalPassword(_: FormState, data: FormData): Promise<FormState> {
  const u = await actingMember();
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

/** A photo on your own ask: what is needed, or what it became. */
export async function addOwnPhoto(askId: number, _: FormState, data: FormData): Promise<FormState> {
  const u = await actingMember();
  const a = await getAsk(askId);
  if (!a || a.asked_by !== u.id || a.status === "withdrawn" || a.status === "declined")
    return { error: "Photos can be added to your own open appeal." };
  const saved = await savePicture(u, data.get("photo"), "ask_photo", { askId, caption: clean(data.get("caption"), 120) });
  if (!saved) return { errors: { photo: "Choose a photo first." } };
  if ("error" in saved) return { errors: { photo: saved.error } };
  await notePhoto(u, a);
  revalidatePath(`/erp/me/asks/${askId}`);
  return { done: "Photo added." };
}

/** Take off a photo you added yourself. */
export async function removeOwnPhoto(askId: number, photoId: number) {
  const u = await actingMember();
  const mine = (await askPhotos(askId)).find((x) => x.id === photoId && x.uploaded_by === u.id);
  if (mine) await removeAskPhoto(u, photoId, askId);
  revalidatePath(`/erp/me/asks/${askId}`);
}

/** "I'm coming" or "I can't come" to a meeting coming up. It can be changed until the day. */
export async function replyMeeting(meetingId: number, coming: boolean) {
  const u = await actingMember();
  await replyToMeeting(u, meetingId, coming);
  revalidatePath("/erp/me/notices");
}

/** "I will give ₹50,000": promised to an appeal, not sent yet. It counts as promised until it is sent and recorded. */
export async function promiseGift(askId: number, _: FormState, data: FormData): Promise<FormState> {
  const u = await actingMember();
  const a = await getAsk(askId);
  if (!a || a.status !== "live" || !isPublicKind(a.kind)) return { error: "This appeal is not open any more." };
  const errors: Record<string, string> = {};
  const someone = data.get("promise_who") === "someone";
  const giver_name = someone ? clean(data.get("promise_name"), 80) : null;
  if (someone && !giver_name) errors.promise_name = "Type the name of the person who made the commitment.";
  const country = String(data.get("country") ?? "India");
  if (!isCountry(country)) errors.country = "Pick the country from the list.";
  const amount_paise = toPaise(data.get("promise_amount"));
  if (!amount_paise) errors.promise_amount = "Type the amount in numbers, e.g. 50000.";
  if (Object.keys(errors).length) return { errors };
  await addPromise(u, {
    ask_id: askId,
    giver_name,
    country: country === "India" ? null : country,
    amount_paise: amount_paise!,
    note: clean(data.get("promise_note"), 200),
  });
  revalidatePath(`/erp/me/asks/${askId}`);
  return { done: "Saved as a commitment. When the money is sent, switch to “I have sent it” and pick it." };
}

/** The promised gift is not coming after all. */
export async function dropOwnPromise(askId: number, id: number) {
  const u = await actingMember();
  await dropPromise(u, id);
  revalidatePath(`/erp/me/asks/${askId}`);
}
