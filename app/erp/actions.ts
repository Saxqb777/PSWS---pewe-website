"use server";

import { redirect } from "next/navigation";
import {
  changePassword,
  checkPassword,
  createFirstAdmin,
  endSession,
  passwordProblem,
  requireUser,
  setupCodeOk,
  tryLogin,
  redeemInvite,
} from "@/lib/erp/auth";
import { clean, normalPhone } from "@/lib/erp/labels";
import type { FormState } from "@/lib/erp/form-state";

/** Signing in, setting a password, and setting the office up the first time. */

export async function signIn(_: FormState, data: FormData): Promise<FormState> {
  const phone = normalPhone(data.get("phone"));
  const password = String(data.get("password") ?? "");
  const errors: Record<string, string> = {};
  if (!phone) errors.phone = "Type your mobile number, e.g. 98123 45678.";
  if (!password) errors.password = "Type your password.";
  if (Object.keys(errors).length) return { errors };
  const r = await tryLogin(phone!, password);
  if (r === "ok") redirect("/erp");
  if (r === "locked")
    return { error: "Too many wrong tries. Wait 15 minutes and try again. (15 minute ruk kar phir koshish kijiye.)" };
  if (r === "no-password")
    return {
      error:
        "You have not set your password yet. Open the link the office sent you on WhatsApp, or ask the admin for a new one.",
    };
  return { error: "The phone number and password do not match. (Number ya password galat hai.)" };
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
  redirect("/erp?welcome=1");
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
