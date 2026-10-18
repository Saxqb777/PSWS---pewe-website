// Applies db/erp.sql to the database in DATABASE_URL. Safe to run again:
// every statement only adds what is missing.
//   DATABASE_URL=... node scripts/db/migrate.mjs
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL first.");
  process.exit(1);
}
const sql = neon(url);
const file = new URL("../../db/erp.sql", import.meta.url);
const statements = readFileSync(file, "utf8")
  .replace(/--[^\n]*/g, "")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

for (const s of statements) await sql.query(s);
const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'erp_%' ORDER BY 1`;
console.log(`applied ${statements.length} statements; tables: ${tables.map((t) => t.table_name).join(", ")}`);
