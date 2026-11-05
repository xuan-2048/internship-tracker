import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "cloudflare:workers";

export function authConfigured() {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY);
}

export async function authClient() {
  if (!authConfigured()) throw new Error("AUTH_NOT_CONFIGURED");
  const store = await cookies();
  return createServerClient(env.SUPABASE_URL!, env.SUPABASE_PUBLISHABLE_KEY!, {
    cookieOptions: {httpOnly:true, sameSite:"lax", path:"/", secure:env.SUPABASE_COOKIE_SECURE !== "false"},
    cookies: {
      getAll: () => store.getAll(),
      setAll: entries => {
        for (const {name,value,options} of entries) {
          // Server-rendered pages cannot persist refreshed cookies; API requests can.
          try { store.set(name,value,options); } catch { /* A route handler refreshes on the next API request. */ }
        }
      },
    },
  });
}

export async function currentUser() {
  if (!authConfigured()) return null;
  try {
    const client = await authClient();
    // Validate against the provider, never trust a user ID supplied by a cookie.
    const {data,error} = await client.auth.getUser();
    if (error || !data.user || !data.user.email_confirmed_at) return null;
    return {id:data.user.id, email:data.user.email ?? "", ownerId:`supabase:${data.user.id}`};
  } catch { return null; }
}
