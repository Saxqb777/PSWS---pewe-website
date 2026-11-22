"use client";

import { useState } from "react";
import { Chips } from "./form";
import styles from "./erp.module.css";

/**
 * Meeting or notice, and whether every member reads it in their portal. A
 * notice is for members unless the office says not; a meeting's notes stay
 * in the office unless it says so. Once the box is touched, it stays as set.
 */
export function KindAndShare({ kind, shared }: { kind?: "meeting" | "notice"; shared?: boolean }) {
  const [k, setK] = useState<string>(kind ?? "meeting");
  const [touched, setTouched] = useState(shared !== undefined);
  const [on, setOn] = useState(shared ?? false);
  const show = touched ? on : k === "notice";
  return (
    <>
      <Chips
        name="kind"
        legend="Is it a meeting or a notice?"
        options={[
          { value: "meeting", en: "Meeting", hi: "Baithak, minutes" },
          { value: "notice", en: "Notice", hi: "Elaan, khabar" },
        ]}
        value={k}
        onChange={setK}
      />
      <label className={styles.check} style={{ margin: "4px 0 14px" }}>
        <input
          type="checkbox"
          name="for_members"
          checked={show}
          onChange={(e) => {
            setTouched(true);
            setOn(e.target.checked);
          }}
        />
        <span>
          <strong>Every member reads it in their portal</strong>
          <span className={styles.hint} style={{ display: "block" }}>
            {k === "meeting"
              ? "Members always see the date and title of a meeting coming up, and can say if they are coming. Tick this to show what is written too."
              : "It shows under Notices and on everyone's home screen."}
          </span>
        </span>
      </label>
    </>
  );
}
