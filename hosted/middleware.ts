import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "cloudflare:workers";

// Refresh once before rendering and forward new cookies to both routes and browser.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({request});
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) return response;
  const client = createServerClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions:{httpOnly:true,sameSite:"lax",path:"/",secure:env.SUPABASE_COOKIE_SECURE !== "false"},
    cookies:{
      getAll:() => request.cookies.getAll(),
      setAll:entries => {
        entries.forEach(({name,value}) => request.cookies.set(name,value));
        response = NextResponse.next({request});
        entries.forEach(({name,value,options}) => response.cookies.set(name,value,options));
        response.headers.set("Cache-Control","private, no-store");
      },
    },
  });
  try { await client.auth.getUser(); } catch { /* Protected routes still validate and deny invalid sessions. */ }
  return response;
}
export const config = {matcher:["/((?!_next|favicon|.*\\.(?:js|css|svg|png)$).*)"]};
