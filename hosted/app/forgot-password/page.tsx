import AuthScreen from "../auth-screen";
import { authConfigured } from "../auth-provider";
export const dynamic = "force-dynamic";
export default function Forgot() { return <AuthScreen mode="forgot" configured={authConfigured()}/>; }
