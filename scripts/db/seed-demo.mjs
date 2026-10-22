// Fills the portal demo's own database with sample people and sample money.
// Every name ends in "(sample)"; phone numbers and Gmails are made up.
//
// It WIPES the database first, so it refuses to run anywhere but the demo:
// the demo database alone has the psws_demo_marker table. Never point it at
// the real office.
//   DATABASE_URL=<the demo database> node scripts/db/seed-demo.mjs
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL to the demo database first.");
  process.exit(1);
}
const sql = neon(url);

const marker = await sql`SELECT to_regclass('public.psws_demo_marker') AS t`;
if (!marker[0].t) {
  console.error("This is not the demo database (no psws_demo_marker table). Nothing was changed.");
  process.exit(1);
}

const scrypt = promisify(scryptCb);
async function hash(pw) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64")}$${key.toString("base64")}`;
}

// dates in Pewe, counted back from today
const DAY = 864e5;
const todayIST = new Date(Date.now() + 330 * 60000);
const daysAgo = (n) => new Date(todayIST.getTime() - n * DAY).toISOString().slice(0, 10);
const inDays = (n) => new Date(todayIST.getTime() + n * DAY).toISOString().slice(0, 10);
const hoursAgo = (h) => new Date(Date.now() - h * 3600e3).toISOString();
const fyOf = (d) => {
  const [y, m] = d.split("-").map(Number);
  const s = m >= 4 ? y : y - 1;
  return `${s}-${String((s + 1) % 100).padStart(2, "0")}`;
};
const nextSaturday = () => {
  const d = new Date(todayIST);
  d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7 || 7));
  return d.toISOString().slice(0, 10);
};
const rs = (n) => n * 100;

/* ------------------------------------------------------------ wipe */
const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'erp_%'`;
await sql.query(`TRUNCATE ${tables.map((t) => t.table_name).join(", ")} RESTART IDENTITY CASCADE`);

/* ------------------------------------------------------------ people */
const password = await hash("demo1234");
const people = [
  // name, post, role, approver, lives in
  ["Rashid (sample)", "President", "admin", true, "Pewe"],
  ["Nadeem (sample)", "General Secretary", "admin", true, "Pewe"],
  ["Imran (sample)", "Treasurer", "admin", true, "Guhagar"],
  ["Shakeel (sample)", "Head, Zakat Committee", "admin", true, "Pewe"],
  ["Tariq (sample)", "Committee member", "admin", false, "Mumbai"],
  ["Ayaan (sample)", null, "member", false, "Pewe"],
  ["Sana (sample)", null, "member", false, "Mumbai"],
  ["Faisal (sample)", null, "member", false, "Dubai"],
  ["Huda (sample)", null, "member", false, "Pewe"],
  ["Junaid (sample)", null, "member", false, "Guhagar"],
  ["Mariam (sample)", null, "member", false, "Pewe"],
  ["Zaid (sample)", null, "member", false, "Mumbai"],
];
const used = new Set();
const id = {};
for (const [i, [name, post, role, approver, lives]] of people.entries()) {
  let no;
  do no = `PSWS-${10000 + (randomBytes(4).readUInt32BE() % 90000)}`;
  while (used.has(no));
  used.add(no);
  const first = name.split(" ")[0].toLowerCase();
  const rows = await sql`
    INSERT INTO erp_user (name, phone, role, post, password_hash, approver, first_email, member_no, lives_in, member_since)
    VALUES (${name}, ${`9100000000${String(i + 1).padStart(2, "0")}`}, ${role}, ${post}, ${password}, ${approver},
            ${`${first}.sample@example.com`}, ${no}, ${lives}, ${daysAgo(200 - i * 9)})
    RETURNING id`;
  id[name.split(" ")[0]] = Number(rows[0].id);
}

/* ------------------------------------------------------------ the books start */
await sql`
  INSERT INTO erp_opening (on_date, cash_paise, bank_paise, zakat_paise, donation_paise, development_paise, other_paise, set_by)
  VALUES (${`${fyOf(daysAgo(0)).slice(0, 4)}-04-01`}, ${rs(15000)}, ${rs(120000)}, ${rs(40000)}, ${rs(50000)}, ${rs(45000)}, 0,
          ${id.Imran})`;

/* ------------------------------------------------------------ asks */
async function ask(a) {
  const rows = await sql`
    INSERT INTO erp_ask (kind, title, story, private_note, target_paise, head, closes_on, status, asked_by, asked_at, live_at,
                         closed_at, closed_by, closing_note)
    VALUES (${a.kind}, ${a.title}, ${a.story ?? null}, ${a.private ?? null}, ${a.target ? rs(a.target) : null}, ${a.head},
            ${a.closes ?? null}, ${a.status}, ${id[a.by]}, ${a.asked}, ${a.live ?? null}, ${a.closed ?? null},
            ${a.closed ? id.Nadeem : null}, ${a.note ?? null})
    RETURNING id`;
  const askId = Number(rows[0].id);
  for (const who of a.yes ?? [])
    await sql`INSERT INTO erp_ask_vote (ask_id, user_id, vote, note) VALUES (${askId}, ${id[who]}, 'yes', null)`;
  return askId;
}

const ration = await ask({
  kind: "collection",
  title: "Ration kits for 40 families before the monsoon",
  story: "Rice, dal, oil and flour for the families the Zakat committee knows are struggling, before the rains cut the roads.",
  target: 60000,
  head: "donation",
  status: "closed",
  by: "Nadeem",
  asked: hoursAgo(24 * 160),
  live: hoursAgo(24 * 158),
  closed: hoursAgo(24 * 130),
  closes: daysAgo(135),
  note: "40 kits bought at the Guhagar wholesale market for ₹58,400 and given out. The ₹2,800 left stays in donations for the next need.",
  yes: ["Nadeem", "Rashid"],
});
const hospital = await ask({
  kind: "zakat",
  title: "Hospital costs for a family in Pewe",
  story:
    "A father of three needs an operation at Chiplun. The family has paid what it could. The Zakat committee has visited them and seen the hospital's estimate.",
  private: "Sample only: a family in Bhoiwadi, operation at the Chiplun hospital, estimate ₹40,000.",
  target: 40000,
  head: "zakat",
  status: "live",
  by: "Shakeel",
  asked: hoursAgo(24 * 9),
  live: hoursAgo(24 * 8),
  closes: inDays(20),
  yes: ["Shakeel", "Imran"],
});
const roof = await ask({
  kind: "collection",
  title: "Roof repair for the Pewe primary school",
  story:
    "The monsoon damaged the school's roof and water comes into two classrooms. The village works committee has a quote of ₹1,50,000; work starts once ₹1 lakh is in.",
  target: 150000,
  head: "development",
  status: "live",
  by: "Ayaan",
  asked: hoursAgo(24 * 7),
  live: hoursAgo(24 * 6),
  closes: inDays(35),
  yes: ["Nadeem", "Imran"],
});
await ask({
  kind: "collection",
  title: "Water tank for Bhoiwadi",
  story: "Bhoiwadi's houses carry water from the well every summer. A 5,000 litre tank on the hill would fill from the pipeline.",
  target: 80000,
  head: "development",
  status: "waiting",
  by: "Junaid",
  asked: hoursAgo(20),
  closes: inDays(40),
  yes: ["Imran"],
});
await ask({
  kind: "help",
  title: "Help for my neighbour's eye operation",
  private: "Sample only: an elderly neighbour in Pewe needs a cataract operation, about ₹12,000. Her son works away.",
  head: "zakat",
  status: "waiting",
  by: "Sana",
  asked: hoursAgo(5),
});

/* ------------------------------------------------------------ money received, in date order */
const gifts = [
  // days ago, from, amount, method, ask, head
  [158, "Rashid", 10000, "bank", ration, "donation"],
  [157, "Faisal", 20000, "bank", ration, "donation"],
  [156, "Sana", 5000, "upi", ration, "donation"],
  [155, "A well-wisher in Mumbai (sample)", 15000, "cash", ration, "donation"],
  [154, "Zaid", 6200, "upi", ration, "donation"],
  [152, "Mariam", 5000, "upi", ration, "donation"],
  [60, "Ayaan", 2500, "upi", null, "zakat"],
  [40, "Huda", 500, "cash", null, "donation"],
  [8, "Rashid", 3000, "bank", hospital, "zakat"],
  [7, "Faisal", 10000, "bank", hospital, "zakat"],
  [6, "Ayaan", 5000, "upi", hospital, "zakat"],
  [6, "Nadeem", 2000, "upi", hospital, "zakat"],
  [6, "Rashid", 10000, "bank", roof, "development"],
  [5, "Faisal", 25000, "bank", roof, "development"],
  [5, "Sana", 2000, "upi", hospital, "zakat"],
  [4, "Zaid", 1500, "upi", hospital, "zakat"],
  [4, "A well-wisher in Mumbai (sample)", 15000, "cash", roof, "development"],
  [3, "Mariam", 1000, "cash", hospital, "zakat"],
  [3, "Sana", 5000, "upi", roof, "development"],
  [2, "Tariq", 1000, "upi", hospital, "zakat"],
  [2, "Mariam", 2000, "upi", roof, "development"],
  [1, "Junaid", 1000, "upi", hospital, "zakat"],
  [1, "Zaid", 5000, "upi", roof, "development"],
];
let rno = 0;
for (const [ago, from, amount, method, askId, head] of gifts) {
  const on = daysAgo(ago);
  const fy = fyOf(on);
  rno += 1;
  const member = id[from.split(" ")[0]] ?? null;
  const who = member ? people.find((x) => x[0].startsWith(from))[0] : from;
  await sql`
    INSERT INTO erp_money_in (receipt_no, fy, on_date, from_name, from_place, amount_paise, head, method, reference, note,
                              member_id, ask_id, created_by, created_at)
    VALUES (${`R/${fy}/${String(rno).padStart(4, "0")}`}, ${fy}, ${on}, ${who}, null, ${rs(amount)}, ${head}, ${method},
            ${method === "cash" ? null : `SAMPLE${String(100000 + rno)}`}, ${askId ? "Given through the members' portal" : null},
            ${member}, ${askId}, ${id.Imran}, ${hoursAgo(ago * 24)})`;
}
await sql`INSERT INTO erp_counter (kind, fy, last_no) VALUES ('R', ${fyOf(daysAgo(0))}, ${rno})`;

/* ------------------------------------------------------------ money paid */
const huda = await sql`
  INSERT INTO erp_family (name, place, phone, people, notes, member_id, created_by)
  VALUES ('Huda (sample)', 'Pewe', '910000000009', 5, 'Sample family for the demo.', ${id.Huda}, ${id.Shakeel}) RETURNING id`;
const fyNow = fyOf(daysAgo(0));
await sql`
  INSERT INTO erp_money_out (voucher_no, fy, on_date, paid_to, amount_paise, head, purpose, purpose_other, method, reference, note,
                             ask_id, created_by)
  VALUES (${`P/${fyNow}/0001`}, ${fyNow}, ${daysAgo(131)}, 'Guhagar wholesale market (sample)', ${rs(58400)}, 'donation', 'other',
          'Ration kits for 40 families', 'bank', 'SAMPLE900001', 'For the ration kits collection', ${ration}, ${id.Imran})`;
await sql`
  INSERT INTO erp_money_out (voucher_no, fy, on_date, paid_to, amount_paise, head, purpose, method, reference, note, family_id,
                             created_by)
  VALUES (${`P/${fyNow}/0002`}, ${fyNow}, ${daysAgo(38)}, 'Huda (sample)', ${rs(6000)}, 'zakat', 'medical', 'upi', 'SAMPLE900002',
          'Hospital bill, Chiplun', ${huda[0].id}, ${id.Imran})`;
await sql`INSERT INTO erp_counter (kind, fy, last_no) VALUES ('P', ${fyNow}, 2)`;

/* ------------------------------------------------------------ "I sent it", waiting for the Treasurer */
await sql`
  INSERT INTO erp_pledge (member_id, ask_id, amount_paise, head, method, reference, sent_on, show_name, created_at)
  VALUES (${id.Junaid}, ${hospital}, ${rs(2000)}, 'zakat', 'upi', '629044172213', ${daysAgo(0)}, true, ${hoursAgo(3)}),
         (${id.Ayaan}, ${roof}, ${rs(5000)}, 'development', 'upi', '630155283324', ${daysAgo(0)}, false, ${hoursAgo(1)})`;

/* ------------------------------------------------------------ what everyone has seen happen */
const feed = [
  [24 * 158, "live", ration, "New collection: Ration kits for 40 families before the monsoon, for ₹60,000"],
  [24 * 152, "target", ration, "Ration kits for 40 families before the monsoon reached its target of ₹60,000"],
  [24 * 130, "closed", ration,
    "Closed: Ration kits for 40 families before the monsoon. ₹61,200 raised. 40 kits bought at the Guhagar wholesale market for ₹58,400 and given out."],
  [24 * 8, "live", hospital, "New Zakat appeal: Hospital costs for a family in Pewe, for ₹40,000"],
  [24 * 7, "gift", hospital, "Faisal gave ₹10,000 for Hospital costs for a family in Pewe"],
  [24 * 6, "live", roof, "New collection: Roof repair for the Pewe primary school, for ₹1,50,000"],
  [24 * 5, "gift", roof, "Received ₹25,000 for Roof repair for the Pewe primary school"],
  [24 * 4, "gift", roof, "Received ₹15,000 for Roof repair for the Pewe primary school"],
  [24 * 3, "gift", roof, "Sana gave ₹5,000 for Roof repair for the Pewe primary school"],
  [30, "gift", hospital, "Received ₹1,000 for Hospital costs for a family in Pewe"],
  [20, "gift", roof, "Received ₹5,000 for Roof repair for the Pewe primary school"],
];
for (const [h, kind, askId, line] of feed)
  await sql`INSERT INTO erp_feed (at, kind, ask_id, line) VALUES (${hoursAgo(h)}, ${kind}, ${askId}, ${line})`;

/* ------------------------------------------------------------ meetings and notices */
await sql`
  INSERT INTO erp_meeting (on_date, kind, title, body, for_website, created_by)
  VALUES (${nextSaturday()}, 'meeting', 'General body meeting: the members'' portal',
          ${"1. The members' portal: every member's own number and page\n2. The money rules sheet\n3. Water tank for Bhoiwadi"},
          true, ${id.Nadeem}),
         (${daysAgo(130)}, 'notice', 'Ration kits given to 40 families',
          'Thank you to everyone who gave. The kits were given out before the rains; the bill is with the Treasurer.', true, ${id.Nadeem}),
         (${daysAgo(30)}, 'notice', 'Zakat committee visits',
          'The Zakat committee visits families who have asked for help on the first Sunday of every month.', true, ${id.Shakeel})`;

/* ------------------------------------------------------------ a message for the office */
await sql`INSERT INTO erp_member_message (member_id, body, at) VALUES (${id.Mariam}, 'My new mobile number is 91000 00099 (sample).', ${hoursAgo(26)})`;

const counts = await sql`
  SELECT (SELECT count(*) FROM erp_user) AS people, (SELECT count(*) FROM erp_ask) AS asks,
         (SELECT count(*) FROM erp_money_in) AS receipts, (SELECT sum(amount_paise) / 100 FROM erp_money_in WHERE ask_id = ${hospital}) AS hospital,
         (SELECT sum(amount_paise) / 100 FROM erp_money_in WHERE ask_id = ${roof}) AS roof,
         (SELECT sum(amount_paise) / 100 FROM erp_money_in WHERE ask_id = ${ration}) AS ration`;
console.log("demo filled:", counts[0]);
