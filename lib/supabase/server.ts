import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";
import { SUPABASE_URL, SUPABASE_KEY } from "@/lib/supabase/config";

export async function createClient(options?: { rememberSession?: boolean }) {
  const cookieStore = await cookies();
  // When `rememberSession` is false, strip persistence so auth cookies become
  // session cookies that the browser clears once it's closed ("Remember me" off).
  const rememberSession = options?.rememberSession ?? true;

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
            const finalOptions = rememberSession
              ? cookieOptions
              : { ...cookieOptions, maxAge: undefined, expires: undefined };
            cookieStore.set(name, value, finalOptions);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if middleware refreshes sessions.
        }
      },
    },
  });
}
