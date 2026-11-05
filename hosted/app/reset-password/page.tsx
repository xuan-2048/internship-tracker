import { redirect } from "next/navigation";
import AuthScreen from "../auth-screen";
import { authConfigured,currentUser } from "../auth-provider";
export const dynamic = "force-dynamic";
export default async function Reset() {
  if (!await currentUser()) redirect("/login?error=invalid_link");
  return <AuthScreen mode="reset" configured={authConfigured()}/>;
}
