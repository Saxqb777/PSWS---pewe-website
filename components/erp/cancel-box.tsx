import type { FormState } from "@/lib/erp/form-state";
import { ErpForm, Field, Submit } from "./form";
import styles from "./erp.module.css";

/** Cancelling instead of deleting: the entry stays, struck through, with the reason. */
export function CancelBox({
  action,
  what,
}: {
  action: (s: FormState, d: FormData) => Promise<FormState>;
  what: string;
}) {
  return (
    <details className={`${styles.fold} ${styles.noPrint}`} style={{ marginTop: 28 }}>
      <summary>Cancel this {what}</summary>
      <div>
        <p className={styles.p}>
          Use this when the {what} was entered by mistake. It stays in the list, crossed out, and no longer counts in any
          total. Nothing is deleted.
        </p>
        <ErpForm action={action} confirm={`Cancel this ${what}? This cannot be undone.`}>
          <Field label="Why?" hint="Kyun cancel kar rahe hain" name="reason">
            <input name="reason" autoComplete="off" />
          </Field>
          <div className={styles.actions}>
            <Submit danger>Cancel this {what}</Submit>
          </div>
        </ErpForm>
      </div>
    </details>
  );
}
