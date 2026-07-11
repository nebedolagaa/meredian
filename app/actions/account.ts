"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeActionError } from "@/lib/utils/errors";

/**
 * Permanently delete the signed-in user's account and all their data.
 * Deleting the auth user cascades to profiles and every owned row via FKs.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY to be set on the server.
 */
export async function deleteAccount(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "Account deletion isn't configured on the server (missing service role key).",
    };
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    // Supabase may return a generic 500 "Database error deleting user" when
    // DB FKs block the auth user deletion.
    if (
      error.code === "unexpected_failure" ||
      error.status === 500 ||
      error.message.toLowerCase().includes("database error deleting user")
    ) {
      // Log the real cause server-side; the FK/cascade detail is internal
      // infrastructure and must not leak to the client.
      console.error("[deleteAccount] likely FK cascade issue", error);
    }
    return { error: safeActionError("deleteAccount", error) };
  }

  await supabase.auth.signOut();
  redirect("/login");
}
