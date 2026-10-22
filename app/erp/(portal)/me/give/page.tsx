import Link from "next/link";
import { requireMember } from "@/lib/erp/auth";
import { GiveForm } from "@/components/erp/portal-forms";
import { PayTo } from "@/components/erp/pay-to";
import p from "@/components/erp/portal.module.css";
import { sendPledge } from "../actions";

export const metadata = { title: "Give" };

export default async function GivePage() {
  await requireMember();
  return (
    <>
      <Link href="/erp/me" className={p.back}>
        ← Home
      </Link>
      <h1 className={p.h1}>Give</h1>
      <p className={p.lead}>
        To PSWS&apos;s Zakat, donations or village work. To give to one ask,{" "}
        <Link href="/erp/me/asks">open it from Asks</Link>.
      </p>
      <PayTo />
      <GiveForm action={sendPledge.bind(null, null)} chooseFund />
    </>
  );
}
