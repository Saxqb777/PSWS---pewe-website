"use client";

import { useState } from "react";
import { Chips, type Choice } from "./form";

const MODES: Choice[] = [
  { value: "sent", en: "I have sent it", hi: "Bhej diya" },
  { value: "commit", en: "Commitment", hi: "Waada, baad mein bhejenge" },
];

/**
 * Giving to an appeal: money already sent, or a commitment to send it later.
 * One switch, and only that form shows, so the page stays short.
 */
export function GiveSwitch({ sent, commit }: { sent: React.ReactNode; commit: React.ReactNode }) {
  const [mode, setMode] = useState("sent");
  return (
    <>
      <Chips
        name="give_mode"
        legend="Have you sent the money?"
        hint="Bhej diya, ya waada"
        options={MODES}
        value={mode}
        onChange={setMode}
      />
      {mode === "sent" ? sent : commit}
    </>
  );
}
