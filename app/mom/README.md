# Minutes of Meeting

One layout, `sheet.tsx`, fed by `content.ts`, reached three ways.

| Route | What it is |
|---|---|
| `/minutes` | **The live page.** Public in the sense that the link opens for anyone who has it. Carries the site's own chrome, an English ⇄ Urdu-English toggle and a Print button. |
| `/mom` | The bare A4 sheet, English — for rendering a PDF headlessly. |
| `/mom/hi` | The bare A4 sheet, Urdu-English. |

## Shared by link, not found by search

`/minutes` names every member of the committee. It is kept out of sight
three ways, and all three should stay:

1. It is **not in the site navigation** (`components/site-header.tsx`).
2. It carries `robots: { index: false, follow: false, nocache: true }`.
3. It is disallowed in `app/robots.ts`.

The bare `/mom` routes are additionally gated behind `ALLOW_INTERNAL_DOCS`
and 404 wherever that flag is absent, which includes Vercel.

## Editing the minutes

`content.ts` holds `EN` and `HI`, which share one shape — anything added
to one needs the other, or TypeScript will say so. `sheet.tsx` renders
either and should not need touching. Push, and the live page changes.

## Getting a PDF

From the page: open `/minutes` and press **Print / Save PDF**. The chrome
drops out and the A4 sheet prints on its own.

Headlessly, from `/mom`:

```bash
ALLOW_INTERNAL_DOCS=1 npm run build
ALLOW_INTERNAL_DOCS=1 npm start
# then render /mom and /mom/hi with Playwright at A4, printBackground: true
```

## Two habits worth keeping

**Say who was there, and only who was there.** The first draft of these
minutes carried a name that turned out not to have attended at all. Names
in a permanent record should come from the attendance itself, not from who
one assumes was present.

**Keep the record to what the meeting decided.** Where an earlier draft
explained why a seat changed hands, or how someone accepted a post, the
committee took it out. A minute records what was resolved; the
circumstances around it are not the record's business.
