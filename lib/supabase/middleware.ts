import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";
import {
  SUPABASE_URL,
  SUPABASE_KEY,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Without credentials there is no session to refresh — let requests through
  // so the dev server doesn't crash on every request with an opaque error.
  if (!isSupabaseConfigured) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/signup");
  // Public routes reachable without a session (password recovery flow,
  // OAuth callback).
  const isPublicRoute =
    isAuthRoute ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/update-password") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/share/");

  // Redirect responses must carry the refreshed session cookies, otherwise the
  // browser keeps its expired tokens and every follow-up request redirects
  // again — an infinite reload loop.
  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  // Unauthenticated users trying to reach app routes -> login
  if (!user && !isPublicRoute && pathname !== "/") {
    return redirectTo("/login");
  }

  // Authenticated users on the login/signup screens -> dashboard.
  // (The password recovery routes stay reachable while signed in.)
  if (user && isAuthRoute) {
    return redirectTo("/dashboard");
  }

  return supabaseResponse;
}
