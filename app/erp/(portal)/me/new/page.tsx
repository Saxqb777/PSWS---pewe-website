import Link from "next/link";
import { requireMember } from "@/lib/erp/auth";
import { ASK_KINDS, isKey, type AskKind } from "@/lib/erp/labels";
import { AskForm } from "@/components/erp/portal-forms";
import p from "@/components/erp/portal.module.css";
import { postAsk } from "../actions";

export const metadata = { title: "Put out an ask" };

export default async function NewAskPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  await requireMember();
  const k = (await searchParams).kind;
  const kind: AskKind = isKey(ASK_KINDS, k) ? (k as AskKind) : "collection";
  return (
    <>
      <Link href="/erp/me/asks" className={p.back}>
        ← Asks
      </Link>
      <h1 className={p.h1}>Put out an ask</h1>
      <p className={p.lead}>A collection for a cause, a Zakat appeal for someone in need, or help for you or someone you know.</p>
      <AskForm action={postAsk} kind={kind} />
    </>
  );
}
