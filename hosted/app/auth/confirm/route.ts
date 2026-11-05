import { NextResponse } from "next/server";
import { authClient, authConfigured } from "../../auth-provider";
import { safeReturnPath } from "../../auth-input";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = () => NextResponse.redirect(new URL("/login?error=invalid_link",url.origin));
  if (!authConfigured()) return fail();
  try {
    const client = await authClient();
    const code = url.searchParams.get("code");
    const hash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");
    const result = code ? await client.auth.exchangeCodeForSession(code)
      : hash && (type === "email" || type === "signup" || type === "recovery")
        ? await client.auth.verifyOtp({token_hash:hash,type}) : null;
    if (!result || result.error) return fail();
    const next = type === "recovery" ? "/reset-password" : safeReturnPath(url.searchParams.get("next"));
    const response = NextResponse.redirect(new URL(next,url.origin));
    response.headers.set("Cache-Control","no-store");
    response.headers.set("Referrer-Policy","no-referrer");
    return response;
  } catch { return fail(); }
}
