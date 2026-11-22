import { OWNER_PHONE, currentUser } from "@/lib/erp/auth";
import { readPicture } from "@/lib/erp/files";
import { toId } from "@/lib/erp/form-state";
import { getAsk, memberMaySee } from "@/lib/erp/portal";

/**
 * A picture, only for someone signed in who may see it. A payment screenshot:
 * the member who sent it, the PSWS Accountant and the website owner. A photo
 * on an ask: whoever may see the ask.
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const none = () => new Response("Not found", { status: 404 });
  const u = await currentUser();
  if (!u) return none();
  const id = toId((await params).id);
  const f = id ? await readPicture(id) : null;
  if (!f) return none();
  let may = false;
  if (f.kind === "proof") may = f.uploaded_by === u.id || u.role === "accountant" || u.phone === OWNER_PHONE;
  else if (f.ask_id) {
    const a = await getAsk(f.ask_id);
    may = !!a && memberMaySee(a, u.id, u.role !== "member");
  }
  if (!may) return none();
  return new Response(new Uint8Array(f.bytes), {
    headers: {
      "Content-Type": f.mime,
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
