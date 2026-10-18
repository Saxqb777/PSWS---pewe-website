import { currentUser } from "@/lib/erp/auth";
import { sheet } from "@/lib/erp/data";
import { fyOf, todayIST } from "@/lib/erp/labels";

/**
 * Downloads for Excel. A CSV with a byte-order mark, so Excel reads ₹ and
 * names in Marathi correctly. A cell that starts like a formula is
 * prefixed so Excel shows it as text and never runs it.
 */

const cell = (v: string | number | null) => {
  if (v === null || v === undefined) return "";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request, ctx: { params: Promise<{ kind: string }> }) {
  if (!(await currentUser())) return new Response("Sign in to the office first.", { status: 401 });
  const { kind } = await ctx.params;
  const url = new URL(req.url);
  const fyRaw = url.searchParams.get("fy") ?? "";
  const fy = /^\d{4}-\d{2}$/.test(fyRaw) ? fyRaw : fyOf(todayIST());
  const monthRaw = url.searchParams.get("month") ?? "";
  const month = /^\d{4}-\d{2}$/.test(monthRaw) ? monthRaw : null;
  const s = await sheet(kind, fy, month);
  if (!s) return new Response("Not found", { status: 404 });
  const body = "﻿" + [s.columns, ...s.rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
  const name = `psws-${kind}${["money-in", "money-out", "families"].includes(kind) ? `-${month ?? fy}` : ""}.csv`;
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "private, no-store",
    },
  });
}
