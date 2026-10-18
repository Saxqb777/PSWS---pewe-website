"use client";

import { useEffect, useRef, useState } from "react";
import { openWithKey } from "@/app/erp/actions";
import styles from "./erp.module.css";

/** Reads the key from after the # (never sent with the page request) and hands it to the server once. */
export function KeyDoor() {
  const [error, setError] = useState<string | null>(null);
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const key = decodeURIComponent(window.location.hash.slice(1));
    // take the key out of the address bar and the browser's history
    window.history.replaceState(null, "", window.location.pathname);
    if (!key) {
      setError("This link is not complete. Copy the whole link, with everything after the #.");
      return;
    }
    openWithKey(key).then((r) => r && setError(r.error));
  }, []);
  return error ? (
    <p role="alert" className={styles.formError} style={{ marginTop: 18 }}>
      {error}
    </p>
  ) : (
    <p className={styles.sub} style={{ marginTop: 18 }}>
      Opening the office…
    </p>
  );
}
