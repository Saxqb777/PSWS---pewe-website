"use client";

import { useState } from "react";
import p from "./portal.module.css";
import styles from "./erp.module.css";

/** PSWS's own bank account, as members pay into it. The details come from the server, never from this code. */
export interface BankDetails {
  accountName: string;
  bank: string;
  accountNo: string;
  ifsc: string;
}

/** The account to pay into, with the long numbers one tap to copy, and the whole of it ready for WhatsApp. */
export function BankBox({ bank, share }: { bank: BankDetails; share: string }) {
  return (
    <div className={p.bank}>
      <dl className={p.bankRows}>
        <div>
          <dt>Account name</dt>
          <dd>{bank.accountName}</dd>
        </div>
        <div>
          <dt>Bank</dt>
          <dd>{bank.bank}</dd>
        </div>
        <div>
          <dt>Current A/C</dt>
          <dd>
            <span className={p.bankNo}>{bank.accountNo}</span>
            <Copy text={bank.accountNo} what="account number" />
          </dd>
        </div>
        <div>
          <dt>IFSC</dt>
          <dd>
            <span className={p.bankNo}>{bank.ifsc}</span>
            <Copy text={bank.ifsc} what="IFSC" />
          </dd>
        </div>
      </dl>
      <a
        className={styles.btnQuiet}
        href={`https://wa.me/?text=${encodeURIComponent(share)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Send these details on WhatsApp
      </a>
    </div>
  );
}

function Copy({ text, what }: { text: string; what: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={p.copy}
      aria-label={`Copy the ${what}`}
      onClick={() =>
        navigator.clipboard?.writeText(text).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          },
          () => setCopied(false),
        )
      }
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
