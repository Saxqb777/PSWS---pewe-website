import { redirect } from "next/navigation";

/** The old members' portal link: the office now has its own sign-in. */
export default function LoginPage() {
  redirect("/erp/login");
}
