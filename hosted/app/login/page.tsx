import { redirect } from "next/navigation";
import AuthScreen from "../auth-screen";
import { authConfigured,currentUser } from "../auth-provider";
export const dynamic = "force-dynamic";
export default async function Login() {
  if (await currentUser()) redirect("/tracker.html");
  return <AuthScreen mode="login" configured={authConfigured()}/>;
}
