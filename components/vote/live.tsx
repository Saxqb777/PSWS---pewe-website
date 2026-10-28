"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import v from "./vote.module.css";

/** The results keep themselves up to date while they are on screen. */
export function StayLive({ every = 5000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => document.visibilityState === "visible" && router.refresh();
    const t = window.setInterval(tick, every);
    return () => window.clearInterval(t);
  }, [router, every]);
  return null;
}

/** Send the vote on to the family group, or copy its link. */
export function ShareVote({ path, text }: { path: string; text: string }) {
  const [url, setUrl] = useState(path);
  const [copied, setCopied] = useState(false);
  useEffect(() => setUrl(window.location.origin + path), [path]);
  return (
    <div className={v.share}>
      <a className={v.shareMain} href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`} target="_blank" rel="noopener noreferrer">
        Share on WhatsApp
      </a>
      <button
        type="button"
        className={v.shareQuiet}
        onClick={() =>
          navigator.clipboard?.writeText(url).then(
            () => setCopied(true),
            () => setCopied(false),
          )
        }
      >
        {copied ? "Link copied" : "Copy the link"}
      </button>
    </div>
  );
}
