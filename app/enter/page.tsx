import Link from "next/link";
import { Seal } from "@/components/seal";
import { SOCIETY } from "@/lib/site";

export const metadata = {
  title: "Under development",
  robots: { index: false, follow: false },
};

export default async function EnterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; wrong?: string }>;
}) {
  const { next = "/erp", wrong } = await searchParams;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-paper-2">
      <div className="bg-ink text-paper">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 py-2.5 sm:px-8">
          <p className="text-[12.5px] leading-tight">
            <span className="font-semibold uppercase tracking-[0.12em] text-brass-light">
              Under development
            </span>
            <span className="mx-2 opacity-40">|</span>
            The rest of the site is still being built.
          </p>
          <p className="num hidden text-[12.5px] opacity-70 sm:block">{SOCIETY.website}</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-14 sm:py-20">
        <div className="w-full max-w-md">
          <div className="border border-ink bg-paper">
            <div className="jali-band" />

            <div className="px-6 py-8 sm:px-9 sm:py-10">
              <div className="flex items-center gap-4">
                <Seal size={52} />
                <div className="min-w-0">
                  <div className="label label-brass">{SOCIETY.shortName} Members</div>
                  <div className="display mt-1 text-[20px] leading-tight">
                    {SOCIETY.name}
                  </div>
                </div>
              </div>

              <h1 className="display mt-7 text-[25px] leading-[1.18]">
                This part of the site is still being built.
              </h1>
              <p className="mt-3 text-[15.5px] leading-[1.7] text-ink-2">
                Members of the Society can look at what is being built as it is
                pushed. Enter the password the committee shared.
              </p>

              <form method="POST" action="/api/enter" className="mt-7">
                <input type="hidden" name="next" value={next} />

                <label htmlFor="password" className="label block">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoFocus
                  autoComplete="current-password"
                  className="mt-2 w-full border border-ink bg-paper px-4 py-3 text-[16px] text-ink outline-none focus:ring-2 focus:ring-brass"
                />

                {wrong && (
                  <p className="mt-3 border-l-2 border-maroon bg-maroon-tint px-3 py-2 text-[13.5px] text-ink-2">
                    That password is not right. Ask the General Secretary.
                  </p>
                )}

                <button
                  type="submit"
                  className="mt-5 w-full bg-maroon px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-paper transition-colors hover:bg-maroon-dark"
                >
                  Enter
                </button>
              </form>
            </div>

            <div className="arcade-band" />
          </div>

          <p className="mt-6 text-center text-[13.5px] leading-relaxed text-ink-2">
            The front page is open to everybody.{" "}
            <Link href="/" className="text-maroon underline underline-offset-2">
              Go back to it
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
