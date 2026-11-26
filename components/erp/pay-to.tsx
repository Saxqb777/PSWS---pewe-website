import { isDemo } from "@/lib/erp/auth";
import { BankBox, type BankDetails } from "./bank-box";
import p from "./portal.module.css";

/**
 * Where a member sends money: PSWS's own account, never a person's. The bank
 * details and the UPI ID are set in the Vercel project settings
 * (PSWS_BANK_ACCOUNT_NAME, PSWS_BANK_NAME, PSWS_BANK_ACCOUNT_NO,
 * PSWS_BANK_IFSC, PSWS_UPI_ID), so no account details are ever written into
 * this public repository. Only signed-in members reach these pages, and the
 * demo shows none at all, so nobody pays real money to a sample.
 */
function bankDetails(): BankDetails | null {
  const accountName = process.env.PSWS_BANK_ACCOUNT_NAME?.trim();
  const bank = process.env.PSWS_BANK_NAME?.trim();
  const accountNo = process.env.PSWS_BANK_ACCOUNT_NO?.trim();
  const ifsc = process.env.PSWS_BANK_IFSC?.trim();
  return accountName && bank && accountNo && ifsc ? { accountName, bank, accountNo, ifsc } : null;
}

/** The details as the committee sends them on WhatsApp. */
function shareText(b: BankDetails): string {
  return [
    "Please deposit/send your contribution to:",
    "",
    "🏦 Account Name :",
    b.accountName,
    "",
    "🏛 Bank :",
    b.bank,
    "",
    "💼 Current A/C # :",
    b.accountNo,
    "",
    "🔖 IFSC Code :",
    b.ifsc,
    "",
    "🤝 Kindly share payment screenshot/details",
    "after transfer for confirmation.",
  ].join("\n");
}

export async function PayTo() {
  const upi = process.env.PSWS_UPI_ID?.trim();
  const bank = bankDetails();
  const demo = await isDemo();
  return (
    <>
      <div className={p.payTo}>
        {demo ? (
          <>
            <p>
              <b>In the real portal, members pay PSWS the usual way, then record it here.</b>
            </p>
            <p>In this demo, do not send any money. Just fill in the form below as if you had paid.</p>
          </>
        ) : (
          <>
            {bank || upi ? (
              <details className={p.bankFold}>
                <summary>Show PSWS bank details</summary>
                {bank && <BankBox bank={bank} share={shareText(bank)} />}
                {upi && (
                  <>
                    <p>{bank ? "Or from GPay or PhonePe:" : "Pay PSWS from your own GPay or PhonePe:"}</p>
                    <p className={p.payId}>{upi}</p>
                  </>
                )}
                <p className={p.payRule}>PSWS never asks you to pay into a person&apos;s account.</p>
                <p className={p.payRule}>
                  <b>Living abroad?</b> Give it to a PSWS member in India. They pay it in here and record it in your name.
                </p>
              </details>
            ) : (
              <p>Ask the office for PSWS&apos;s bank details if you need them.</p>
            )}
            <p className={p.payRule}>Only from an Indian bank account or UPI: PSWS cannot take money from foreign bank accounts.</p>
          </>
        )}
      </div>
      <ol className={p.steps}>
        <li>Pay PSWS: bank transfer, GPay or PhonePe, cash or cheque.</li>
        <li>Then tell us below whose money it is, with the UTR (the 12-digit number of the payment) and a screenshot if you have one.</li>
        <li>The PSWS Accountant finds it in the bank and the receipt is made in the giver&apos;s name. Only then does it count.</li>
      </ol>
    </>
  );
}
