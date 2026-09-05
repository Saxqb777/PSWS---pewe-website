import { Container } from "@/components/ui/primitives";
import { LoginForm } from "@/components/login-form";
import { Seal } from "@/components/seal";
import { SOCIETY } from "@/lib/site";

export const metadata = { title: "Members' Portal" };

export default function LoginPage() {
  return (
    <div className="border-b-2 border-ink bg-paper-2">
      <Container className="py-16 sm:py-24">
        <div className="mx-auto max-w-md">
          <div className="border border-ink bg-paper">
            <div className="jali-band" />
            <div className="px-7 py-8 sm:px-9">
              <div className="flex items-center gap-4">
                <Seal size={50} />
                <div>
                  <div className="label label-brass">Members' Portal</div>
                  <div className="display mt-1 text-[19px] leading-tight">{SOCIETY.shortName} Office</div>
                </div>
              </div>

              <p className="mt-6 text-[15.5px] leading-[1.7] text-ink-2">
                The office side of the Society — the roll, the ledger, the
                welfare queue, the quotation comparisons and the scorecards.
              </p>

              <LoginForm />
            </div>
            <div className="arcade-band" />
          </div>

          <p className="mx-auto mt-6 max-w-md border border-rule-strong bg-paper px-4 py-3 text-[13.5px] leading-relaxed text-ink-2">
            <strong className="font-semibold">Prototype.</strong> There is no
            real authentication here. Pick a role and press the button — the
            password field is ignored. In the finished system this is a phone
            number and a one-time code, and the role comes from the member's own
            record.
          </p>
        </div>
      </Container>
    </div>
  );
}
