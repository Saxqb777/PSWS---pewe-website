import type { FormState } from "@/lib/erp/form-state";
import { ErpForm, Field, Submit } from "./form";
import styles from "./erp.module.css";

/**
 * Asking to delete or remove something. Nothing happens straight away: the
 * request, with the reason, goes to the approvers, and is carried out only
 * once every one of them agrees.
 */
export function AskBox({
  action,
  title,
  explain,
  button,
}: {
  action: (s: FormState, d: FormData) => Promise<FormState>;
  title: string;
  explain: string;
  button: string;
}) {
  return (
    <details className={`${styles.fold} ${styles.noPrint}`} style={{ marginTop: 28 }}>
      <summary>{title}</summary>
      <div>
        <p className={styles.p}>{explain}</p>
        <ErpForm action={action}>
          <Field label="Why?" hint="Kyun? The approvers read this" name="reason">
            <input name="reason" autoComplete="off" />
          </Field>
          <div className={styles.actions}>
            <Submit danger>{button}</Submit>
          </div>
        </ErpForm>
      </div>
    </details>
  );
}
