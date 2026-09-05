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

English throughout, written the way Pewe actually talks — *sadaqah*, *masjid*,
*kabrastan*, *gram panchayat*, *taluka* kept as they are. Every major heading
carries a Hinglish line under it (*Paisa kahan gaya*, *Zakat aur madad*,
*Gaon ke kaam*). One version, no toggle.

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
