import { MinutesView } from "./minutes-view";

/**
 * The minutes, live, on a link-only page.
 *
 * Public in the sense that the link opens for anyone who has it — the
 * committee shares it on WhatsApp and it works — but deliberately not
 * findable: it is absent from the site navigation, excluded in robots.ts,
 * and carries a noindex tag of its own. It names every member of the
 * committee, so it should stay that way.
 */
export const metadata = {
  title: "Minutes of the Management Committee",
  robots: { index: false, follow: false, nocache: true },
};

export default function MinutesPage() {
  return <MinutesView />;
}
