# Minutes of Meeting — print sheet

Renders the Management Committee minutes on the Society letterhead and
prints to A4 PDF.

**This route is not on the public site.** It names every member of the
committee, so it is gated behind `ALLOW_INTERNAL_DOCS` and returns 404
wherever that flag is absent — which includes Vercel.

## Regenerating, or writing the next set

1. Edit the constants at the top of `page.tsx` — `MEETING`, `ROLL`,
   `PRESENT`, `IN_ATTENDANCE`, `ABSENT`, `APPOINTMENTS`, `DECISIONS`,
   `RESPONSIBILITIES`, `ACTIONS`. The layout follows the data; nothing
   below those needs touching.
2. Build and serve with the flag on:

   ```bash
   ALLOW_INTERNAL_DOCS=1 npm run build
   ALLOW_INTERNAL_DOCS=1 npm start
   ```

3. Print `http://localhost:3000/mom` to PDF — either from the browser
   (A4, background graphics on, margins 14/13/12 mm) or with Playwright.

## A note on "Present" and "In attendance"

Formal minutes separate the two. Someone who joined only to lead the dua,
or any guest, is *in attendance* and is not counted toward the committee
roll. Keeping that separation is what makes the numbers reconcile against
the committee's own strength.
