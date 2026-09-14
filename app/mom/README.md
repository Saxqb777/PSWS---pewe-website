# Minutes of Meeting — print sheet

Renders the Management Committee minutes on the Society letterhead and
prints to A4 PDF.

**This route is not on the public site.** It names every member of the
committee, so it is gated behind `ALLOW_INTERNAL_DOCS` and returns 404
wherever that flag is absent — which includes Vercel.

Two versions come off the same layout:

| Route | |
|---|---|
| `/mom` | English |
| `/mom/hi` | Hinglish — Hindi/Urdu in Roman letters, as the committee speaks |

## Regenerating, or writing the next set

1. Edit `content.ts` — the `EN` and `HI` objects share one shape, so
   anything added to one needs the other. `sheet.tsx` renders either and
   should not need touching.
2. Build and serve with the flag on:

   ```bash
   ALLOW_INTERNAL_DOCS=1 npm run build
   ALLOW_INTERNAL_DOCS=1 npm start
   ```

3. Print `http://localhost:3000/mom` and `/mom/hi` to PDF — from the
   browser (A4, background graphics on, margins 14/13/12 mm) or with
   Playwright.

## Two habits worth keeping

**Say who was there, and only who was there.** The first draft of these
minutes carried a name that turned out not to have attended at all. Names
in a permanent record should come from the attendance itself, not from who
one assumes was present.

**Record what has not been settled.** Where the meeting's own headcount did
not match the names, the minutes say so under "To be settled" and carry it
as an action, rather than quietly picking a number. A minute that admits a
gap is worth more than one that hides it.
