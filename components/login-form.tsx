"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLE_LABEL, type Role } from "@/lib/mock-data";

const ROLES: { role: Role; who: string; sees: string }[] = [
  { role: "ADMIN",     who: "Abdul Rafiq Kazi · PSWS-001",     sees: "Everything, including member roles and the audit trail." },
  { role: "COMMITTEE", who: "Mushtaq Ali Dalvi · PSWS-006",    sees: "Ledger entry, welfare decisions, quotations, notices." },
  { role: "AUDITOR",   who: "Shakeel Ahmed Bhatkar · PSWS-005", sees: "Read-only across every ledger, plus the backdating review." },
  { role: "MEMBER",    who: "Zubair Ahmed Bagwan · PSWS-011",  sees: "Own giving history, own applications, published accounts." },
];

export function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("COMMITTEE");

  function enter(e: React.FormEvent) {
    e.preventDefault();
    try {
      window.localStorage.setItem("psws-proto-role", role);
    } catch {
      /* private browsing — the ERP falls back to Committee */
    }
    router.push("/erp");
  }

  return (
    <form onSubmit={enter} className="mt-7">
      <label className="label block" htmlFor="phone">Phone number</label>
      <input
        id="phone"
        type="tel"
        defaultValue="+91 90280 33471"
        className="num mt-2 w-full border border-rule-strong bg-paper-2 px-3 py-2.5 text-[15.5px] text-ink focus:border-ink"
      />

      <label className="label mt-5 block" htmlFor="pw">Password</label>
      <input
        id="pw"
        type="password"
        defaultValue="anything"
        className="mt-2 w-full border border-rule-strong bg-paper-2 px-3 py-2.5 text-[15.5px] text-ink focus:border-ink"
      />

      <fieldset className="mt-6">
        <legend className="label mb-2">Enter as</legend>
        <div className="space-y-px bg-rule border border-rule">
          {ROLES.map((r) => (
            <label
              key={r.role}
              className={`flex cursor-pointer items-start gap-3 p-3 transition-colors ${
                role === r.role ? "bg-brass-tint" : "bg-paper hover:bg-paper-2"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={r.role}
                checked={role === r.role}
                onChange={() => setRole(r.role)}
                className="mt-1 accent-[#7A2E2E]"
              />
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-ink">
                  {ROLE_LABEL[r.role]}
                </span>
                <span className="num block text-[12.5px] text-ink-3">{r.who}</span>
                <span className="mt-1 block text-[13.5px] leading-snug text-ink-2">{r.sees}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        className="mt-7 w-full border border-maroon bg-maroon px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-paper transition-colors hover:bg-maroon-dark hover:border-maroon-dark cursor-pointer"
      >
        Enter the office
      </button>
    </form>
  );
}
