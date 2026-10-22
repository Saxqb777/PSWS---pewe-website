import Link from "next/link";
import { requireMember } from "@/lib/erp/auth";
import { myAsks, publicAsks } from "@/lib/erp/portal";
import { ASK_KINDS, showDate } from "@/lib/erp/labels";
import { AskCard, AskStatus } from "@/components/erp/portal-ui";
import { AutoRefresh } from "@/components/erp/portal-client";
import styles from "@/components/erp/erp.module.css";
import p from "@/components/erp/portal.module.css";

export const metadata = { title: "Asks" };

export default async function AsksPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const u = await requireMember();
  const show = (await searchParams).show;
  const which = show === "closed" ? "closed" : show === "mine" ? "mine" : "open";
  const asks = which === "mine" ? await myAsks(u.id) : await publicAsks(which === "closed" ? "closed" : "live");

  return (
    <>
      {which === "open" && <AutoRefresh every={6000} />}
      <h1 className={p.h1}>Asks</h1>
      <p className={p.lead}>Collections and Zakat appeals, once two approvers have said yes. The money goes only to PSWS.</p>
      <div className={styles.actions} style={{ marginBottom: 16 }}>
        <Link href="/erp/me/new" className={styles.btn}>
          Put out an ask
        </Link>
      </div>
      <nav className={styles.tabs} aria-label="Show">
        {(
          [
            ["open", "Open", "/erp/me/asks"],
            ["closed", "Closed", "/erp/me/asks?show=closed"],
            ["mine", "Mine", "/erp/me/asks?show=mine"],
          ] as const
        ).map(([k, label, href]) => (
          <Link key={k} href={href} aria-current={which === k ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>

      {which === "mine" ? (
        asks.length ? (
          <ul className={p.items}>
            {asks.map((a) => (
              <li key={a.id}>
                <Link href={`/erp/me/asks/${a.id}`} className={p.itemTitle}>
                  {a.title}
                  <AskStatus a={a} />
                </Link>
                <span className={p.itemAmt} />
                <span className={p.itemMeta}>
                  {ASK_KINDS[a.kind].en} · asked {showDate(a.asked_at)}
                  {a.status === "waiting" && ` · ${a.yes} of 2 approvers said yes`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.note}>You have not put out an ask yet.</p>
        )
      ) : asks.length ? (
        asks.map((a) => <AskCard key={a.id} a={a} href={`/erp/me/asks/${a.id}`} />)
      ) : (
        <p className={styles.note}>{which === "open" ? "Nothing is open right now." : "Nothing has closed yet."}</p>
      )}
    </>
  );
}
