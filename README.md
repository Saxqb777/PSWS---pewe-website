# Pewe Social Welfare Society — website & office prototype

A working **prototype** of the public site and the office (ERP) side for
Pewe Social Welfare Society, At & Post Pewe, Taluka Guhagar, Dist. Ratnagiri.

Every screen is built and clickable. **Nothing is connected to a database.**
Each action button opens a panel explaining exactly what it will do once it is
wired up — so the whole feature list stays legible while the back end doesn't
exist yet.

---

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

## What's in it

**Public site — one home page and three others.** The home page carries
everything and leads to the rest; a sticky section bar follows you down it so
you always know where you are.

| | |
|---|---|
| `/` | Hero · Urgent · Our work · Campaigns · Figures · Projects · Zakat · Notices · Sponsors · Contact |
| `/about` | The Society, committee, how it grew |
| `/projects` | Every work, with its full quotation comparison |
| `/accounts` | Ledger, charts, audit filings |
| `/login` | Members' portal (fake — pick a role, any password) |

Giving is a panel that slides in from anywhere, not a page you navigate away to.

**Office (ERP)** at `/erp` — Dashboard, Donations ledger, Campaigns,
Zakat requests, Projects & quotations, Members, Scorecards, Notices,
Sponsors, Reports & audit.

## Language

English throughout, written the way Pewe actually talks — *masjid* is never
used (see the rules below), but *kabrastan*, *gram panchayat*, *taluka*,
*nakad* stand as they are. Every major heading carries a Hinglish line under
it (*Paisa kahan gaya*, *Zakat aur madad*, *Gaon ke kaam*). One version, no
toggle.

## The members' gate

The front page is open to anyone. Everything behind it — The Society,
Projects, Accounts, the members' portal — is held behind one shared
password while it is being built, by `middleware.ts`.

`/minutes` stays open, because the committee shares that link on purpose.

**The password is not in this repository, and must never be put in it.**
This repository is public. `lib/gate.ts` holds only a SHA-256 digest of the
password, as a fallback so the gate works the moment it is deployed.

To make the gate properly strong, set an environment variable in the Vercel
project settings:

```
SITE_PASSWORD = <the password the committee shares>
```

With it set, nothing about the password can be worked out from this
repository at all, and it can be changed at any time without a commit —
Settings → Environment Variables → edit → redeploy.

Entering the password sets an httpOnly cookie that lasts 30 days. A `DELETE`
to `/api/enter` clears it, which is worth wiring to a button if the portal
is ever opened on a shared phone.

To open a path to the public, add it to `isOpenPath()` in `lib/gate.ts`.

## Member contact form

Action 2 of the minutes of 13 September 2026 asked the General Secretary to
collect the committee's contact details. `/kyc` is that form.

| Route | |
|---|---|
| `/kyc` | The form. **Open by link** — it is shared in the WhatsApp group so members are not sent hunting for a password. |
| `/kyc/report` | The record, on the Society's letterhead. **Held behind the members' password**, because it carries seventeen people's phone numbers. |

The name is a list you can type into: typing narrows it, but only a name on
it is accepted, so nobody who was not elected can be entered and a stranger
with the link has no name to submit as.

**Details given once stand.** A member who has filled the form is not on the
list any more, and the server refuses a second attempt even if one is forced
past the page — the insert does nothing and the page says to ask the General
Secretary. A correction is his to make, not whoever fills the form last.

It stores a name, a mobile number, a Gmail address, and the country and
city the member works in — the committee is spread between the village,
Mumbai and the Gulf, so where somebody is matters for calling a meeting.
Nothing else, and **no identity documents** — no Aadhaar, no PAN, no bank
details. If the bank asks for KYC of that kind, it does not belong on this
site.

Country is picked from a list (`lib/countries.ts`), with India and the Gulf
at the top, and then a state and a city from `lib/places.ts` — India by its
thirty-six states and union territories, the UAE by its seven emirates,
Saudi Arabia and Oman by region. Countries with no state list ask only for
a city. Cities are suggested and never insisted upon; states are strict,
because a typed state is how one place ends up in the record three ways. Picking it sets the dialling code shown against the mobile
field, so members type only their national number and the record holds all
seventeen the same way — a code and a number, not `+91 98…` from one and
`0098…` from the next. Whatever is typed is reduced to digits, and a
leading zero or a repeated country code is dropped.

**If a member is somewhere not on the list, the form cannot be filled.**
Add the country to `lib/countries.ts` and push.

City is typed, with common answers suggested, and tidied — trimmed and
capitalised unless it already carries capitals, so `india` and `INDIA` do
not end up as two different answers.

### Wiring it up

The store is a Neon Postgres database. Set the connection string in the
Vercel project settings:

```
DATABASE_URL = postgresql://…
```

It is never committed — this repository is public. Without it the form says
it could not save and the report says the record cannot be read, rather
than breaking.

The table:

```sql
CREATE TABLE kyc_submission (
  id           bigserial PRIMARY KEY,
  member_slug  text        NOT NULL UNIQUE,
  member_name  text        NOT NULL,
  phone        text        NOT NULL,
  gmail        text        NOT NULL,
  phone_cc     text        NOT NULL DEFAULT '91',
  work_country text        NOT NULL DEFAULT '',
  work_state   text        NOT NULL DEFAULT '',
  work_city    text        NOT NULL DEFAULT '',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
```

The roll lives in `lib/kyc.ts`. When the committee changes, change it there —
the slugs are what rows are keyed on, so keep existing ones as they are.

## Compliance rules — READ BEFORE EDITING COPY

These come from the office and are not stylistic preferences. Breaking them
creates a real problem at audit.

**1. Never name a religious structure.**
PSWS is a registered *social welfare* body and cannot fund religious
structures. The word for one must not appear anywhere on this site. Building
work is described as *community building*, *social structure*, *repair and
maintenance*.

The hero is a photograph of the village, chosen by the owner in full
knowledge that the building in it carries domes. The rule above is about
words and about what the Society claims to fund — not about whether the
village may be shown. The drawn alternative is still in the code
(`components/konkan-engraving.tsx`, `heroMode: "engraving"`) and has no
dome or finial, should that decision ever be revisited.

**2. Domestic contributions only (FCRA).**
The Society does not receive foreign-sourced funds. Payment channels are
Cash, GPay, PhonePe, Bank Transfer and Cheque — no international wire.
Members working abroad give through their own Indian accounts or through
family, and the giving panel says so.

**3. Giving vocabulary.**
"Zakat", "donation", "charity" and "collection" are fine. Do **not** use
*sadaqah* or *chanda*.

**4. Religious activity belongs to a separate trust.**
Building collection, imam salaries and religious education sit with the Pewe
Jama-tul-Muslimeen Deeni Thali Fund — a different entity with its own books.
That will be its own site. Do not mix the two here.

## Real, provisional, and invented

| | |
|---|---|
| **Real** | Name in three scripts, F/3584/RTG, MH/5602/RTG, est. 2015, the address, the phone, the seal |
| **Provisional** | The eleven-year collection series, the works and their costs, this year's totals. Given verbally by the office, not yet audited. Shown under a brass "pending audit" rule everywhere they appear |
| **Invented** | Every member, receipt, application, quotation and vendor |

The office separately stated an eleven-year total nearer ₹3 crore, which does
not reconcile with the year-by-year figures (~₹2.19 crore). Both are recorded
in `lib/mock-data.ts` and the site shows the series, never an unsourced total.
Replace when Irfan's statements arrive.

---

## Swapping in the real photographs

The hero currently shows a drawn engraving of the view at Pewe — the masjid, the
ridge, the paddy and the palms — in the Society's own palette. It is a
placeholder with the same depth-layer rig the photographs will use.

To switch to photographs, put the files in `public/images/hero/` and change one
line in `lib/site.ts`:

**Option A — one photograph** (simplest)

```
public/images/hero/hero.jpg
```
```ts
heroMode: "photo-flat"
```

**Option B — layered, with parallax** (what the engraving is doing now)

```
public/images/hero/sky.png      distant sky and cloud
public/images/hero/ridge.png    the Sahyadri hills behind
public/images/hero/masjid.png   the masjid itself
public/images/hero/fore.png     palms and boundary wall in front
```
```ts
heroMode: "photo"
```

Transparent PNGs work best for the middle layers. A wide landscape shot is the
important one — everything else is optional.

---

## Deploying to Vercel

1. Go to **vercel.com** and sign in with GitHub.
2. **Add New → Project** → import `Saxqb777/PSWS---pewe-website`.
3. Leave every setting as it is — Next.js is detected automatically.
4. **Deploy.**

After that, every push to this branch redeploys in about forty seconds and gets
its own preview URL.

---

## Where things live

| Path | What it is |
|---|---|
| `lib/site.ts` | Real Society details from the letterhead, and the hero mode switch |
| `lib/mock-data.ts` | **All invented sample data.** Replace with real queries later |
| `lib/format.ts` | Indian money formatting (₹12,50,000 — lakh grouping, not thousands) |
| `app/globals.css` | The whole design system: palette, type, jali and arcade motifs |
| `components/konkan-engraving.tsx` | The drawn hero plate, in named layers |
| `components/hero.tsx` | The depth/parallax rig — drives engraving or photographs |
| `components/proto-action.tsx` | The "not connected yet" button and panel |
| `components/section-nav.tsx` | The sticky "where am I" bar on the home page |
| `components/give-panel.tsx` | The slide-in giving panel |
| `app/(site)/` | Public pages |
| `app/erp/` | Office pages |

## The design

Heritage / archival. Cream paper, ink brown-black, deep maroon, brass.
Newsreader for headings, IBM Plex Sans for text, IBM Plex Mono for money.

Two motifs are traced from the masjid itself: the **jali** lattice on the corner
pillar, and the **arcade** of small arches under the roofline. They are used as
section rules throughout.

Deliberately absent: gradient text, glowing blobs, glassmorphism, drop shadows,
rounded-pill buttons.

On a phone the hero picture gets its own band at the top with nothing covering
it, and the text sits on paper underneath — text never floats on the picture.
Heights use `dvh`, so the hero does not jump when the browser bar hides.

## Real vs invented

**Real** (from the letterhead and seal): the name in three scripts, registration
numbers F/3584/RTG and MH/5602/RTG, founded 2015, the address, the phone number,
`www.pewe-sws.org`, and the Society seal.

**Invented**: every member, amount, receipt, application, quotation, vendor,
project and notice. No real person or transaction appears anywhere.
