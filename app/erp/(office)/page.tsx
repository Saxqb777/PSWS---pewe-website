import Link from "next/link";
import { requireUser } from "@/lib/erp/auth";
import { listMoney, listRequests, stipendLines, totals } from "@/lib/erp/data";
import { KINDS, canDo, fyOf, fyRange, inr, showDate, showMonth, thisMonthIST, todayIST } from "@/lib/erp/labels";
import { Empty, MoneyList, Stat } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";

export const metadata = { title: "Home" };

const TILES = [
  { href: "/erp/money/in/new", sign: "+ ₹", en: "Money received", hi: "Paisa aaya", tone: "in" },
  { href: "/erp/money/out/new", sign: "− ₹", en: "Money paid", hi: "Paisa diya", tone: "out" },
  { href: "/erp/money/out/new?for=family", sign: "Madad", en: "Family helped", hi: "Parivaar ki madad", tone: "out" },
  { href: "/erp/works", sign: "Kaam", en: "Village work", hi: "Gaon ka kaam", tone: "" },
  { href: "/erp/meetings/new", sign: "Likhiye", en: "Meeting or notice", hi: "Baithak ya elaan", tone: "" },
] as const;

export default async function OfficeHome({ searchParams }: { searchParams: Promise<{ denied?: string; welcome?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const today = todayIST();
  const month = thisMonthIST();
  const fy = fyOf(today);
  const year = fyRange(fy);
  const [m, y, waiting, stipends, latest] = await Promise.all([
    totals(`${month}-01`, today),
    totals(year.from, year.to),
    listRequests({ open: true }),
    stipendLines(month),
    listMoney({ fy, month: null, dir: "all", q: null }),
  ]);
  const editor = canDo(u.role, "editor");
  const paid = stipends.filter((s) => s.paid_voucher).length;
  const firstName = u.name.split(" ")[0];

  return (
    <>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Hello, {firstName}</h1>
          <p className={styles.sub}>{showDate(today)}</p>
        </div>
      </header>

      {sp.welcome && (
        <p className={styles.formDone}>
          You are in. On your phone, add this page to the home screen so the office is one tap away.
        </p>
      )}
      {sp.denied && (
        <p className={`${styles.banner} ${styles.bannerWarn}`}>
          You can see everything, but not add or change entries. Ask an admin if you need to.
        </p>
      )}

      {editor && (
        <nav className={styles.tiles} aria-label="Add">
          {TILES.map((t) => (
            <Link key={t.href} href={t.href} className={`${styles.tile} ${t.tone === "in" ? styles.tileIn : t.tone === "out" ? styles.tileOut : ""}`}>
              <span className={styles.tileSign}>{t.sign}</span>
              <span>
                <span className={styles.tileName}>{t.en}</span>
                <span className={styles.tileHi}>{t.hi}</span>
              </span>
            </Link>
          ))}
        </nav>
      )}

      <div className={`${styles.stats} ${styles.stats4}`}>
        <Stat label={`Received in ${showMonth(month).split(" ")[0]}`}>
          <span className={styles.in}>{inr(m.in_paise)}</span>
        </Stat>
        <Stat label={`Paid in ${showMonth(month).split(" ")[0]}`}>
          <span className={styles.out}>{inr(m.out_paise)}</span>
        </Stat>
        <Stat label={`Received since 1 April`}>
          <span className={styles.in}>{inr(y.in_paise)}</span>
        </Stat>
        <Stat label={`Paid since 1 April`}>
          <span className={styles.out}>{inr(y.out_paise)}</span>
        </Stat>
      </div>
      <p className={styles.note} style={{ marginTop: 8 }}>
        From what is entered here, for the year {fy}. Cancelled entries do not count.
      </p>

      <div className={styles.split} style={{ marginTop: 8 }}>
        <section>
          <h2 className={styles.h2}>
            Monthly stipends<small>{showMonth(month)}</small>
          </h2>
          {stipends.length ? (
            <div className={styles.card}>
              <p className={styles.statValue} style={{ marginTop: 0 }}>
                {paid} of {stipends.length} paid
              </p>
              <div className={styles.meter}>
                <span style={{ width: `${(paid / stipends.length) * 100}%` }} />
              </div>
              <Link href="/erp/stipends" className={paid < stipends.length && editor ? styles.btn : styles.btnQuiet} style={{ marginTop: 12 }}>
                {paid < stipends.length && editor ? `Pay the other ${stipends.length - paid}` : "Open"}
              </Link>
            </div>
          ) : (
            <Empty>Nobody is on the monthly stipend yet.</Empty>
          )}
        </section>

        <section>
          <h2 className={styles.h2}>
            Waiting for a decision<small>Faisla baaki</small>
          </h2>
          {waiting.length ? (
            <ul className={styles.list}>
              {waiting.slice(0, 6).map((r) => (
                <li key={r.id} className={styles.row}>
                  <Link href={`/erp/families/${r.family_id}`} className={styles.rowLink}>
                    <span className={styles.rowMain}>
                      <span className={styles.rowTitle}>
                        {r.family_name}
                        {r.status === "approved" && <span className={`${styles.tag} ${styles.tagIn}`}>Approved, to pay</span>}
                      </span>
                      <span className={styles.rowMeta}>
                        {KINDS[r.kind].en} · asked {showDate(r.asked_on)}
                      </span>
                    </span>
                    <span className={styles.rowAmt}>{r.approved_paise ? inr(r.approved_paise) : r.asked_paise ? inr(r.asked_paise) : ""}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No requests waiting.</Empty>
          )}
        </section>
      </div>

      <h2 className={styles.h2}>
        Latest entries<small>Abhi abhi</small>
      </h2>
      {latest.length ? (
        <>
          <MoneyList rows={latest.slice(0, 8)} />
          <p style={{ marginTop: 12 }}>
            <Link href="/erp/money" className={styles.link}>
              See all money
            </Link>
          </p>
        </>
      ) : (
        <Empty
          action={
            editor ? (
              <Link href="/erp/money/in/new" className={styles.btn}>
                Add the first receipt
              </Link>
            ) : null
          }
        >
          The office is empty. Start with the next receipt or payment; past years can be brought in later.
        </Empty>
      )}
    </>
  );
}
