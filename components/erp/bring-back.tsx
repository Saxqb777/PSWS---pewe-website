import type { FormState } from "@/lib/erp/form-state";
import { ErpForm, Submit } from "./form";
import styles from "./erp.module.css";

/** A removed family, member or work, with the way to bring it back (no approval needed for that). */
export function Removed({
  what,
  action,
}: {
  what: string;
  action: ((s: FormState) => Promise<FormState>) | null;
}) {
  return (
    <div className={`${styles.banner} ${styles.bannerWarn}`}>
      <p style={{ margin: 0 }}>Removed with the approval of the approvers. {what} stays on record, and is left out of the lists.</p>
      {action && (
        <ErpForm action={action}>
          <div className={styles.actions} style={{ marginTop: 10 }}>
            <Submit quiet>Bring back</Submit>
          </div>
        </ErpForm>
      )}
    </div>
  );
}
