// Scheduled edge function: send a web-push reminder to every user who has a
// planned session today and at least one push subscription.
//
// Deploy & schedule (run from the repo root):
//   supabase functions deploy send-reminders
//   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com CRON_SECRET=...
// Then schedule it (SQL editor, pg_cron + pg_net enabled), e.g. daily at 08:00 UTC:
//   select cron.schedule('send-reminders', '0 8 * * *', $$
//     select net.http_post(
//       url := 'https://<project-ref>.functions.supabase.co/send-reminders',
//       headers := jsonb_build_object(
//         'Authorization', 'Bearer <anon-key>',
//         'x-cron-secret', '<same value as the CRON_SECRET secret>'
//       )
//     );
//   $$);
//
// JWT verification stays ON (default) so the function can't be invoked by
// someone who doesn't even have the anon key; CRON_SECRET is a second,
// harder-to-guess check so the anon key alone (public in the client bundle)
// isn't enough to trigger it on demand.
//
// Generate VAPID keys once with: npx web-push generate-vapid-keys
// The public key also goes into .env.local as NEXT_PUBLIC_VAPID_PUBLIC_KEY.
// Generate CRON_SECRET once with: openssl rand -hex 32

/// <reference path="../types.d.ts" />

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

interface SessionRow {
  user_id: string;
  workout_plans: { name: string } | null;
  profiles: { reminders_enabled: boolean | null } | null;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@meredian.fit";

  if (!vapidPublic || !vapidPrivate) {
    return new Response("VAPID keys are not configured", { status: 500 });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const today = new Date().toISOString().slice(0, 10);

  // Users with a planned (not yet completed) session today + reminders on.
  const { data: sessionRows, error } = await admin
    .from("workout_sessions")
    .select(
      "user_id, workout_plans(name), profiles!workout_sessions_user_id_fkey(reminders_enabled)",
    )
    .eq("scheduled_date", today)
    // Only "planned": someone mid-workout doesn't need a "time to train".
    .eq("status", "planned");
  if (error) return new Response(error.message, { status: 500 });
  const sessions = (sessionRows ?? []) as unknown as SessionRow[];

  const planByUser = new Map<string, string>();
  for (const s of sessions) {
    if (s.profiles?.reminders_enabled === false) continue;
    if (!planByUser.has(s.user_id)) {
      planByUser.set(s.user_id, s.workout_plans?.name ?? "Workout");
    }
  }
  if (planByUser.size === 0) return new Response("no sessions today");

  const { data: subRows } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", Array.from(planByUser.keys()));
  const subs = (subRows ?? []) as unknown as SubscriptionRow[];

  let sent = 0;
  const staleIds: string[] = [];
  await Promise.all(
    subs.map(async (sub) => {
      const plan = planByUser.get(sub.user_id) ?? "Workout";
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: "Today's session",
            body: `${plan} is scheduled for today. Time to train.`,
            url: "/dashboard",
          }),
        );
        sent++;
      } catch (e) {
        // 404/410 mean the subscription is gone — clean it up.
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) staleIds.push(sub.id);
      }
    }),
  );

  if (staleIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", staleIds);
  }

  return new Response(`sent ${sent}, cleaned ${staleIds.length}`);
});
