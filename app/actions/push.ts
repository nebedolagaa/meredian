"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeActionError } from "@/lib/utils/errors";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

// Real browser push services only. Without this allow-list a malicious
// endpoint (e.g. an internal/metadata address) would get fetched server-side
// by the send-reminders edge function — an SSRF vector.
const ALLOWED_PUSH_HOSTS = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
];

function isAllowedPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (ALLOWED_PUSH_HOSTS.includes(url.hostname) ||
        url.hostname.endsWith(".notify.windows.com"))
    );
  } catch {
    return false;
  }
}

const subscriptionSchema = z.object({
  endpoint: z
    .string()
    .url()
    .max(2000)
    .refine(isAllowedPushEndpoint, "Unrecognized push endpoint."),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
});

/**
 * Store this browser's web-push subscription so the scheduled reminder
 * function can reach the user when the app is closed.
 */
export async function savePushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<{ error?: string }> {
  try {
    const parsed = subscriptionSchema.safeParse(input);
    if (!parsed.success) return { error: "Invalid subscription." };

    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint: parsed.data.endpoint,
          p256dh: parsed.data.p256dh,
          auth: parsed.data.auth,
        },
        { onConflict: "endpoint" },
      );
    if (error) return { error: safeActionError("savePushSubscription", error) };
    return {};
  } catch (e) {
    return { error: safeActionError("savePushSubscription", e) };
  }
}

/** Remove this browser's subscription (reminders switched off). */
export async function deletePushSubscription(
  endpoint: string,
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);
    if (error)
      return { error: safeActionError("deletePushSubscription", error) };
    return {};
  } catch (e) {
    return { error: safeActionError("deletePushSubscription", e) };
  }
}
