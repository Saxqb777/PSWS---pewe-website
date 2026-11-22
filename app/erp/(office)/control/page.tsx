import Link from "next/link";
import { requireOwner } from "@/lib/erp/auth";
import { getAccountant, listAccounts, officePeople, type Account } from "@/lib/erp/control";
import { portalOn } from "@/lib/erp/flags";
import { showPhone, showWhen } from "@/lib/erp/labels";
import { ErpForm, Field, Submit } from "@/components/erp/form";
import { PageHead } from "@/components/erp/ui";
import styles from "@/components/erp/erp.module.css";
import { handOverAction, takeBackAction, workAsAccountantAction } from "./actions";

export const metadata = { title: "Control room" };

const SHOW = {
  all: "Everyone",
  office: "Office",
  members: "Members",
  waiting: "Not signed in yet",
  stuck: "Locked or off",
} as const;
type Show = keyof typeof SHOW;

const fits = (a: Account, show: Show) =>
  show === "office"
    ? a.role !== "member"
    : show === "members"
      ? a.role === "member"
      : show === "waiting"
        ? a.active && !a.has_password
        : show === "stuck"
          ? a.locked || !a.active
          : true;

const matches = (a: Account, q: string) =>
  [a.name, a.phone, a.member_no, a.first_email, a.post, a.lives_in]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().replace(/[\s-]/g, "").includes(q));

/** Every page there is, to open in one tap. Portal pages show whoever you are looking at. */
const PAGES: { group: string; note?: string; links: [string, string][] }[] = [
  {
    group: "The office",
    links: [
      ["Home", "/erp"],
      ["Money", "/erp/money"],
      ["Accounts", "/erp/accounts"],
      ["Families", "/erp/families"],
      ["Monthly help", "/erp/stipends"],
      ["Village works", "/erp/works"],
      ["Members", "/erp/members"],
      ["Meetings and notices", "/erp/meetings"],
      ["Members' portal (office side)", "/erp/portal"],
      ["Approvals", "/erp/approvals"],
      ["Reports and Excel", "/erp/reports"],
      ["Who changed what", "/erp/history"],
      ["People with access", "/erp/people"],
    ],
  },
  {
    group: "A member's portal",
    note: "Open someone's portal from their page first. These then show their screens, look only.",
    links: [
      ["Home", "/erp/me"],
      ["Asks", "/erp/me/asks"],
      ["Give", "/erp/me/give"],
      ["Put out an ask", "/erp/me/new"],
      ["Passbook", "/erp/me/passbook"],
      ["Notices", "/erp/me/notices"],
      ["Member card", "/erp/me/card"],
    ],
  },
  {
    group: "Screens and links",
    links: [
      ["Live screen, for a TV", "/erp/live"],
      ["Sign-in page", "/erp/login"],
      ["First time sign-in", "/erp/login?first=1"],
      ["Public website", "/"],
      ["Minutes", "/minutes"],
    ],
  },
];

export default async function ControlRoom({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; show?: string; accountant?: string }>;
}) {
  await requireOwner();
  const sp = await searchParams;
  const [acc, people] = await Promise.all([getAccountant(), officePeople()]);
  const show: Show = sp.show && sp.show in SHOW ? (sp.show as Show) : "all";
  const q = (sp.q ?? "").trim().toLowerCase().replace(/[\s-]/g, "");
  const all = await listAccounts();
  const shown = all.filter((a) => fits(a, show) && (!q || matches(a, q)));
  const count = (s: Show) => all.filter((a) => fits(a, s)).length;
  const portal = portalOn();
  return (
    <>
      <PageHead
        title="Control room"
        sub="Only you see this. Every account and every page, and the fixes for anyone who is stuck. Every fix is written to Who changed what."
      />

      {acc && (
        <section className={styles.card} style={{ marginBottom: 20 }}>
          <h2 className={styles.h2} style={{ marginTop: 0 }}>
            PSWS Accountant
          </h2>
          <p className={styles.p}>
            One account for the job. Only it records money in and out, and confirms members&apos; gifts against the bank.
            Everyone else in the office sees the money and cannot add to it.
          </p>
          <p className={styles.p}>
            <strong>Held by {acc.holder_name ?? "you"}</strong>
            {acc.held_since && ` since ${showWhen(acc.held_since)}`}
            {acc.holder_name &&
              (acc.has_password ? " · password chosen" : " · has not opened the link yet")}
            {acc.last_login_at && ` · last signed in ${showWhen(acc.last_login_at)}`}
          </p>
          {sp.accountant === "held" && (
            <p className={styles.formError}>Someone else holds the Accountant&apos;s account now. Take it back first.</p>
          )}
          {!acc.holder_name ? (
            <>
              <form action={workAsAccountantAction}>
                <div className={styles.actions}>
                  <button type="submit" className={styles.btn}>
                    Work as the Accountant
                  </button>
                </div>
              </form>
              <p className={styles.p} style={{ marginTop: 16 }}>
                When someone takes over the job, hand it to them. They choose its password with a link, and sign in with the
                word &ldquo;accountant&rdquo;.
              </p>
              <ErpForm action={handOverAction}>
                <Field label="Hand over to" name="to">
                  <select name="to" defaultValue="">
                    <option value="" disabled>
                      Pick someone in the office
                    </option>
                    {people.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                        {x.post ? ` · ${x.post}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className={styles.actions}>
                  <Submit quiet>Hand over and make their link</Submit>
                </div>
              </ErpForm>
            </>
          ) : (
            <ErpForm
              action={takeBackAction}
              confirm={`Take the Accountant's account back from ${acc.holder_name}? It is signed out everywhere.`}
            >
              <div className={styles.actions}>
                <Submit quiet>Take it back</Submit>
              </div>
            </ErpForm>
          )}
        </section>
      )}

      <form className={styles.filters} method="get">
        <label className={styles.field}>
          <span className={styles.srOnly}>Show</span>
          <select name="show" defaultValue={show}>
            {(Object.keys(SHOW) as Show[]).map((s) => (
              <option key={s} value={s}>
                {SHOW[s]} ({count(s)})
              </option>
            ))}
          </select>
        </label>
        <div className={styles.filtersSearch}>
          <label className={styles.field}>
            <span className={styles.srOnly}>Search</span>
            <input name="q" type="search" placeholder="Name, mobile, PSWS number or Gmail" defaultValue={sp.q ?? ""} />
          </label>
          <button type="submit" className={styles.btnQuiet}>
            Show
          </button>
        </div>
      </form>

      <h2 className={styles.h2}>
        {SHOW[show]}: {shown.length}
      </h2>
      <ul className={styles.list}>
        {shown.map((a) => (
          <li key={a.id} className={`${styles.row} ${a.active ? "" : styles.cancelled}`}>
            <Link href={`/erp/control/people/${a.id}`} className={styles.rowLink}>
              <span className={styles.rowMain}>
                <span className={styles.rowTitle}>
                  {a.name}
                  <span className={styles.tag}>{a.role === "member" ? "member" : "office"}</span>
                  {a.approver && <span className={`${styles.tag} ${styles.tagIn}`}>approver</span>}
                  {!a.active && <span className={`${styles.tag} ${styles.tagOut}`}>off</span>}
                  {a.locked && <span className={`${styles.tag} ${styles.tagOut}`}>locked</span>}
                  {a.active && !a.has_password && <span className={`${styles.tag} ${styles.tagWarn}`}>not signed in yet</span>}
                </span>
                <span className={styles.rowMeta}>
                  {[
                    portal && (a.member_no ?? "no PSWS number yet"),
                    a.post,
                    showPhone(a.phone),
                    a.last_login_at ? `last in ${showWhen(a.last_login_at)}` : "never signed in",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {!shown.length && <p className={styles.p}>Nobody here.</p>}

      <h2 className={styles.h2}>Every page</h2>
      {PAGES.filter((g) => portal || g.group !== "A member's portal").map((g) => (
        <section key={g.group} className={styles.box} style={{ marginBottom: 12 }}>
          <p className={styles.p} style={{ marginTop: 0 }}>
            <strong>{g.group}</strong>
            {g.note && (
              <>
                <br />
                {g.note}
              </>
            )}
          </p>
          <p className={styles.p} style={{ marginBottom: 0, lineHeight: 2 }}>
            {g.links.map(([label, href], i) => (
              <span key={href}>
                {i > 0 && " · "}
                <Link href={href}>{label}</Link>
              </span>
            ))}
          </p>
        </section>
      ))}
    </>
  );
}
