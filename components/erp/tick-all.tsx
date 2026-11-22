"use client";

import { useState } from "react";
import styles from "./erp.module.css";

/** Tick or untick every receipt on the list in one go. */
export function TickAll({ form }: { form: string }) {
  const [all, setAll] = useState(false);
  return (
    <button
      type="button"
      className={styles.btnQuiet}
      onClick={() => {
        const next = !all;
        document.querySelectorAll<HTMLInputElement>(`#${form} input[type=checkbox][name=r]`).forEach((b) => (b.checked = next));
        setAll(next);
      }}
    >
      {all ? "Untick all" : "Tick all"}
    </button>
  );
}
