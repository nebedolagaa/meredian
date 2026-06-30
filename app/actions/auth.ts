"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  signInSchema,
  signUpSchema,
  emailSchema,
  passwordSchema,
  firstError,
} from "@/lib/validation/schemas";
import { rateLimit, clientIp } from "@/lib/utils/rateLimit";

export interface AuthResult {
  error?: string;
  success?: string;
}

function siteOrigin(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  // Fail closed: never derive the redirect origin from request headers, which are
  // attacker-controlled and could turn reset/confirm links into an open-redirect
  // or token-leak vector (host-header injection).
  if (!envUrl) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be set for auth email redirects.",
    );
  }
  return envUrl.replace(/\/$/, "");
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const parsed = signInSchema.safeParse({ email, password });
  if (!parsed.success) return { error: firstError(parsed) };

  const limit = rateLimit(`signin:${clientIp()}`, 10, 5 * 60_000);
  if (!limit.ok) {
    return { error: "Too many attempts. Please try again in a few minutes." };
  }

  const remember = formData.get("remember") != null;
  const supabase = createClient({ rememberSession: remember });
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();

  const parsed = signUpSchema.safeParse({ email, password, displayName });
  if (!parsed.success) return { error: firstError(parsed) };

  const limit = rateLimit(`signup:${clientIp()}`, 5, 60 * 60_000);
  if (!limit.ok) {
    return { error: "Too many attempts. Please try again later." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: displayName || parsed.data.email.split("@")[0] },
    },
  });

  if (error) return { error: error.message };

  // When email confirmation is enabled, no session is created until the user
  // confirms. Surface that instead of redirecting into a guarded route.
  if (!data.session) {
    return { success: "confirmEmail" };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Send a password reset email. The link returns the user to /update-password.
 */
export async function requestPasswordReset(
  formData: FormData,
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { error: firstError(parsed) };

  // Throttle per IP. When exceeded, return the same neutral message so the
  // limiter can't be used to probe which addresses are registered.
  const limit = rateLimit(`reset:${clientIp()}`, 5, 15 * 60_000);
  if (!limit.ok) {
    return { success: "If that email exists, a reset link is on its way." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteOrigin()}/update-password`,
  });
  if (error) return { error: error.message };
  return { success: "If that email exists, a reset link is on its way." };
}

/**
 * Update the signed-in user's password (used on the recovery page and in settings).
 */
export async function updatePassword(formData: FormData): Promise<AuthResult> {
  const password = String(formData.get("password") ?? "");
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { error: firstError(parsed) };

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { success: "Password updated." };
}

/**
 * Change the password from Settings. Unlike the recovery flow, this requires the
 * user to re-authenticate with their current password before the change is made.
 */
export async function changePassword(formData: FormData): Promise<AuthResult> {
  const currentPassword = String(formData.get("current_password") ?? "");
  const password = String(formData.get("password") ?? "");

  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { error: firstError(parsed) };
  if (!currentPassword) return { error: "Current password is required." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not authenticated" };

  // Re-authenticate: verify the current password before allowing the change.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) return { error: "Current password is incorrect." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { error: "Could not update password. Please try again." };
  revalidatePath("/", "layout");
  return { success: "Password updated." };
}

/**
 * Change the signed-in user's email. Requires re-authentication with the current
 * password; Supabase then sends a confirmation message to the new address.
 */
export async function updateEmail(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const currentPassword = String(formData.get("current_password") ?? "");
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { error: firstError(parsed) };
  if (!currentPassword) return { error: "Current password is required." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not authenticated" };

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) return { error: "Current password is incorrect." };

  const { error } = await supabase.auth.updateUser(
    { email: parsed.data },
    { emailRedirectTo: `${siteOrigin()}/settings` },
  );
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: "Check your inbox to confirm the new email." };
}
