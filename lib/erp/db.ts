import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * The office's database: the same Neon database as the members' details
 * form. The connection string lives only in DATABASE_URL (Vercel project
 * settings); this repository is public and never holds it.
 */
let client: NeonQueryFunction<false, false> | null = null;

export function db(): NeonQueryFunction<false, false> {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    client = neon(url);
  }
  return client;
}

/** Postgres bigint and numeric arrive as strings; amounts and counts are safe as numbers. */
export const num = (v: unknown) => Number(v ?? 0);

/** One plain line in the history for everything anyone adds, changes or cancels. */
export async function logChange(
  userId: number,
  action: "added" | "changed" | "cancelled" | "paid" | "decided" | "access",
  entity: string,
  entityId: number | null,
  summary: string,
) {
  await db()`INSERT INTO erp_audit (user_id, action, entity, entity_id, summary)
             VALUES (${userId}, ${action}, ${entity}, ${entityId}, ${summary})`;
}
