import { authClient, authConfigured, currentUser } from "../../../auth-provider";
import { authActions, validateAuthInput, type AuthAction } from "../../../auth-input";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body,{status,headers:{"Cache-Control":"no-store"}});

export async function POST(request: Request, context: {params:Promise<{action:string}>}) {
  const {action} = await context.params;
  if (!authActions.has(action)) return json({error_code:"not_found"},404);
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return json({error_code:"invalid_origin"},403);
  if ((request.headers.get("Content-Type") || "").split(";")[0] !== "application/json") return json({error_code:"invalid_request"},415);
  if (!authConfigured()) return json({error_code:"not_configured"},503);
  const raw = await request.text();
  if (!raw || new TextEncoder().encode(raw).byteLength > 4096) return json({error_code:"invalid_request"},400);
  let values: ReturnType<typeof validateAuthInput>;
  try { values = validateAuthInput(action as AuthAction,JSON.parse(raw)); }
  catch(error) { return json({error_code:error instanceof SyntaxError ? "invalid_request" : (error as Error).message},400); }
  try {
    const client = await authClient();
    if (action === "login") {
      const {data,error} = await client.auth.signInWithPassword({email:values.email!,password:values.password!});
      if (error || !data.user?.email_confirmed_at) return json({error_code:error?.code === "email_not_confirmed" ? "email_not_confirmed" : "invalid_credentials"},401);
      return json({redirect:"/tracker.html"});
    }
    if (action === "register") {
      const {error} = await client.auth.signUp({email:values.email!,password:values.password!, options:{emailRedirectTo:`${new URL(request.url).origin}/auth/confirm`}});
      if (error && error.code !== "user_already_exists") return json({error_code:error.status === 429 ? "rate_limited" : error.code === "email_address_not_authorized" ? "email_unavailable" : "signup_failed"},error.status === 429 ? 429 : 400);
      // Never disclose whether an address is already registered.
      return json({message_code:"check_email"});
    }
    if (action === "forgot") {
      const {error} = await client.auth.resetPasswordForEmail(values.email!, {redirectTo:`${new URL(request.url).origin}/auth/confirm?next=/reset-password`});
      if (error) return json({error_code:error.status === 429 ? "rate_limited" : "request_failed"},error.status === 429 ? 429 : 400);
      return json({message_code:"reset_sent"});
    }
    if (action === "reset") {
      if (!await currentUser()) return json({error_code:"session_expired"},401);
      const {error} = await client.auth.updateUser({password:values.password!});
      if (error) return json({error_code:"reset_failed"},400);
      await client.auth.signOut({scope:"local"});
      return json({redirect:"/login?updated=1"});
    }
    const {error} = await client.auth.signOut({scope:"local"});
    if (error) return json({error_code:"request_failed"},400);
    return json({redirect:"/login"});
  } catch { return json({error_code:"request_failed"},503); }
}
