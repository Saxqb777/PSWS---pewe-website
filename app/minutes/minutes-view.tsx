"use client";

import Link from "next/link";
import { useState } from "react";
import { Seal } from "@/components/seal";
import { SOCIETY } from "@/lib/site";
import { MomSheet } from "@/app/mom/sheet";
import { EN, HI } from "@/app/mom/content";
import "./minutes.css";

export function MinutesView() {
  const [lang, setLang] = useState<"en" | "hi">("en");
  const c = lang === "en" ? EN : HI;

  return (
    <div className="min-wrap">
      <div className="min-bar">
        <div className="min-bar-in">
          <Link href="/" className="min-bar-id">
            <Seal size={38} />
            <span>
              <span className="min-bar-n">{SOCIETY.name}</span>
              <span className="min-bar-s">Committee record</span>
            </span>
          </Link>
          <Link href="/" className="min-back">← Back to the website</Link>
        </div>
      </div>

      <div className="min-head">
        <div>
          <h1 className="min-head-t">{c.meeting.title}</h1>
          <p className="min-head-d">{c.meeting.date} · {c.meeting.held}</p>
        </div>

        <div className="min-tools">
          <div className="min-seg" role="group" aria-label="Language">
            <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
              English
            </button>
            <button type="button" aria-pressed={lang === "hi"} onClick={() => setLang("hi")}>
              Urdu-English
            </button>
          </div>
          <button type="button" className="min-print" onClick={() => window.print()}>
            Print / Save PDF
          </button>
        </div>
      </div>

      <div className="min-paper-out">
        <div className="min-paper">
          <MomSheet c={c} />
        </div>
      </div>
    </div>
  );
}
