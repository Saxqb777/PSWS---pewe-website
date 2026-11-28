import Link from "next/link";
import { requireMember } from "@/lib/erp/auth";
import { GiveForm } from "@/components/erp/portal-forms";
import { PayTo } from "@/components/erp/pay-to";
import p from "@/components/erp/portal.module.css";
import { readerOn } from "@/lib/erp/screenshot";
import { sendPledge } from "../actions";

export const metadata = { title: "Give" };
/** reading a screenshot takes a few seconds */
export const maxDuration = 30;

export default async function GivePage() {
  await requireMember();
  return (
    <>
      <Link href="/erp/me" className={p.back}>
        ← Home
      </Link>
      <h1 className={p.h1}>Give</h1>
      <p className={p.lead}>
        To PSWS&apos;s Zakat, Donation or Village Work. To give to one appeal,{" "}
        <Link href="/erp/me/asks">open it from Donate</Link>.
      </p>
      <PayTo />
      <GiveForm action={sendPledge.bind(null, null)} chooseFund reads={readerOn()} />
    </>
  );
}
