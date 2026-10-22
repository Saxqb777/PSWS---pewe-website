import { requireUser } from "@/lib/erp/auth";
import { knownNames } from "@/lib/erp/data";
import { todayIST } from "@/lib/erp/labels";
import { MoneyInForm } from "@/components/erp/money-forms";
import { PageHead } from "@/components/erp/ui";
import { saveMoneyIn } from "../../actions";
import { portalOn } from "@/lib/erp/flags";
import { publicAsks } from "@/lib/erp/portal";

export const metadata = { title: "Money received" };

export default async function NewMoneyIn() {
  await requireUser("editor");
  const [names, asks] = await Promise.all([knownNames("in"), portalOn() ? publicAsks("live") : Promise.resolve(null)]);
  return (
    <>
      <PageHead title="Money received" sub="A receipt number is given when you save." back={{ href: "/erp/money", label: "Money" }} />
      <MoneyInForm
        action={saveMoneyIn.bind(null, null)}
        initial={{ on_date: todayIST() }}
        names={names}
        submit="Save and make the receipt"
        asks={asks?.map((a) => ({ id: a.id, title: a.title }))}
      />
    </>
  );
}
