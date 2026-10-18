"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { makeInvite, requireUser } from "@/lib/erp/auth";
import { addPerson, adminCount, getPerson, updatePerson } from "@/lib/erp/data";
import { logChange } from "@/lib/erp/db";
import { ROLES, clean, isKey, normalPhone, type Role } from "@/lib/erp/labels";
import type { FormState } from "@/lib/erp/form-state";

/** Giving people access: only admins. Each person gets a link to set their own password. */

async function linkFor(userId: number, by: number, name: string, phone: string): Promise<NonNullable<FormState>["share"]> {
  const token = await makeInvite(userId, by);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "psws-pewe-website.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const url = `${proto}://${host}/erp/welcome?t=${token}`;
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
  const role = data.get("role");
  if (!isKey(ROLES, role)) errors.role = "What may they do?";
  if (Object.keys(errors).length) return { errors };
  const id = await addPerson(u, { name: name!, phone: phone!, role: role as Role, post: clean(data.get("post"), 80) });
  if (!id) return { errors: { phone: "Someone with this mobile number already has access. Find them in the list below." } };
  revalidatePath("/erp/people");
  return {
    done: `${name} is added. Send them this link on WhatsApp so they can set their password.`,
    share: await linkFor(id, u.id, name!, phone!),
  };
}

export async function updatePersonAction(id: number, _: FormState, data: FormData): Promise<FormState> {
  const u = await requireUser("admin");
  const p = await getPerson(id);
  if (!p) return { error: "This person is not in the office any more." };
  const name = clean(data.get("name"), 80);
  const role = data.get("role");
  const active = data.get("inactive") !== "on";
  const errors: Record<string, string> = {};
  if (!name) errors.name = "Type their name.";
  if (!isKey(ROLES, role)) errors.role = "What may they do?";
  if (Object.keys(errors).length) return { errors };
  // the office must always keep one admin who can give access
  if (p.role === "admin" && p.active && (role !== "admin" || !active) && (await adminCount()) <= 1)
    return { error: "This is the only admin. Make someone else an admin first." };
  await updatePerson(u, id, { name: name!, role: role as Role, post: clean(data.get("post"), 80), active });
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
