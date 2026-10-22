import { isDemo } from "@/lib/erp/auth";
import p from "./portal.module.css";

/**
 * Where a member sends money: PSWS's own UPI ID, never a person's. It is
 * set as PSWS_UPI_ID in the Vercel project settings, so no account details
 * are ever written into this public repository. The demo shows none at all,
 * so nobody pays real money to a sample.
 */
export async function PayTo() {
  const upi = process.env.PSWS_UPI_ID;
  const demo = await isDemo();
  return (
    <>
      <div className={p.payTo}>
        {demo ? (
          <>
            <p>
              <b>In the real portal, PSWS&apos;s own UPI ID and QR code show here.</b>
            </p>
            <p>In this demo, do not send any money. Just fill in the form below as if you had paid.</p>
          </>
        ) : upi ? (
          <>
            <p>Pay PSWS from your own GPay or PhonePe:</p>
            <p className={p.payId}>{upi}</p>
            <p>Only to this PSWS account. Never to a person, whoever asks.</p>
          </>
        ) : (
          <p>Ask the Treasurer for PSWS&apos;s UPI ID or bank details. Pay only into PSWS&apos;s own account, never to a person.</p>
        )}
      </div>
      <ol className={p.steps}>
        <li>Pay PSWS from your own phone.</li>
        <li>Then tell us below, with the number from the payment message.</li>
        <li>The Treasurer finds it in the bank and your receipt is made. Only then does it count.</li>
      </ol>
    </>
  );
}
