"use server";

import { redirect } from "next/navigation";
import {
  changePassword,
  checkPassword,
  createFirstAdmin,
  demoSignIn,
  endSession,
  firstSignIn,
  homePath,
  ownerSignIn,
  passwordProblem,
  requireUser,
  setupCodeOk,
  tryLogin,
  redeemInvite,
} from "@/lib/erp/auth";
import { clean, normalMemberNo, normalPhone } from "@/lib/erp/labels";
import { portalOn } from "@/lib/erp/flags";
import type { FormState } from "@/lib/erp/form-state";

/** Signing in, setting a password, and setting the office up the first time. */

export async function signIn(_: FormState, data: FormData): Promise<FormState> {
  // with the portal on, the same box takes a PSWS number or a mobile number
  const memberNo = portalOn() ? normalMemberNo(data.get("phone")) : null;
  const phone = memberNo ? null : normalPhone(data.get("phone"));
  const password = String(data.get("password") ?? "");
  const errors: Record<string, string> = {};
  if (!memberNo && !phone)
    errors.phone = portalOn()
      ? "Type your PSWS number (e.g. PSWS-48213) or your mobile number."
      : "Type your mobile number, e.g. 98123 45678.";
  if (!password) errors.password = "Type your password.";
  if (Object.keys(errors).length) return { errors };
  const r = await tryLogin(memberNo ? { member_no: memberNo } : { phone: phone! }, password);
  if (r === "ok") redirect(homePath());
  if (r === "locked")
    return { error: "Too many wrong tries. Wait 15 minutes and try again. (15 minute ruk kar phir koshish kijiye.)" };
  if (r === "no-password")
    return {
      error:
        "You have not chosen a password yet. Tap “First time here” above and use the Gmail you gave in the members' form.",
    };
  return {
    error: memberNo
      ? "The PSWS number and password do not match. (Number ya password galat hai.)"
      : "The phone number and password do not match. (Number ya password galat hai.)",
  };
}

export async function setPassword(_: FormState, data: FormData): Promise<FormState> {
  const token = String(data.get("token") ?? "");
  const password = String(data.get("password") ?? "");
  const again = String(data.get("again") ?? "");
  const problem = passwordProblem(password);
  if (problem) return { errors: { password: problem } };
  if (password !== again) return { errors: { again: "The two passwords are not the same. (Dono ek jaise likhiye.)" } };
  if (!(await redeemInvite(token, password)))
    return { error: "This link has expired or has already been used. Ask the admin for a new one." };
  redirect(`${homePath()}?welcome=1`);
}

export async function setUp(_: FormState, data: FormData): Promise<FormState> {
  const code = String(data.get("code") ?? "");
  const name = clean(data.get("name"), 80);
  const phone = normalPhone(data.get("phone"));
  const post = clean(data.get("post"), 80);
  const password = String(data.get("password") ?? "");
  const again = String(data.get("again") ?? "");
  const errors: Record<string, string> = {};
  if (!setupCodeOk(code)) errors.code = "That is not the setup code.";
  if (!name) errors.name = "Type your name.";
  if (!phone) errors.phone = "Type your mobile number, e.g. 98123 45678.";
  const problem = passwordProblem(password);
  if (problem) errors.password = problem;
  else if (password !== again) errors.again = "The two passwords are not the same.";
  if (Object.keys(errors).length) return { errors };
  if (!(await createFirstAdmin(name!, phone!, post, password)))
    return { error: "The office is already set up. Sign in instead." };
  redirect("/erp?welcome=1");
}

export async function signOut() {
  await endSession();
  redirect("/erp/login");
}

export async function changeMyPassword(_: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser();
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

export async function openWithKey(key: string): Promise<{ error: string }> {
  const r = await ownerSignIn(String(key ?? ""));
  if (r === "ok") redirect("/erp");
  return {
    error:
      r === "off"
        ? "This link has been switched off. An admin can turn it back on under People with access."
        : "This link is not right. Copy the whole link, with everything after the #.",
  };
}

export async function firstTime(_: FormState, data: FormData): Promise<FormState> {
  const phone = normalPhone(data.get("phone"));
  const email = String(data.get("email") ?? "");
  const password = String(data.get("password") ?? "");
  const again = String(data.get("again") ?? "");
  const errors: Record<string, string> = {};
  if (!phone) errors.phone = "Type your mobile number. From abroad, start with + and the country code.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) errors.email = "Type the Gmail you gave in the members' form.";
  const problem = passwordProblem(password);
  if (problem) errors.password = problem;
  else if (password !== again) errors.again = "The two passwords are not the same. (Dono ek jaise likhiye.)";
  if (Object.keys(errors).length) return { errors };
  const r = await firstSignIn(phone!, email, password);
  if (r === "ok") redirect(`${homePath()}?welcome=1`);
  if (r === "locked") return { error: "Too many wrong tries. Wait 15 minutes and try again." };
  if (r === "done") return { error: "You have already chosen a password. Use “Sign in” with your mobile number and password." };
  if (r === "no-email")
    return { error: "There is no Gmail on record for this number. Ask the General Secretary to send you a link instead." };
  return {
    error:
      "This mobile number and Gmail do not match the members' form. Check both. From abroad, start the number with + and the country code.",
  };
}

/** The demo copy only: be one of the sample people, with one tap. */
export async function demoAs(data: FormData) {
  const id = Number(data.get("id"));
  // the demo tour can send someone straight to the page for its next step
  const next = String(data.get("next") ?? "");
  const to = /^\/erp\/[a-z0-9/?=&_-]*$/i.test(next) ? next : "/erp/me";
  if (Number.isSafeInteger(id) && (await demoSignIn(id))) redirect(to);
  redirect("/erp/login");
}
