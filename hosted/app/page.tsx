import { redirect } from "next/navigation";
import { currentUser } from "./auth-provider";
export const dynamic = "force-dynamic";
export default async function Home() {
  redirect(await currentUser() ? "/tracker.html" : "/login");
}
