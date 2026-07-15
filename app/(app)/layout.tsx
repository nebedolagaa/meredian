import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils/dates";
import { BottomNav } from "@/components/layout/BottomNav";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { Toaster } from "@/components/ui/Toaster";
import { GuidedTour } from "@/components/tour/GuidedTour";
import { ExerciseProfileProvider } from "@/components/exercises/ExerciseProfileProvider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, unit_preference, sex, height_cm")
    .eq("id", user.id)
    .single();

  if (profile && !profile.onboarding_completed) redirect("/onboarding");

  // These reads are independent of each other — run them in parallel.
  // Separate selects (training_level, weight) also mean a missing column from
  // an unapplied migration can't break the whole app shell.
  const [
    { data: levelRow },
    { data: lastWeight },
    { data: plans },
    { count: pendingToday },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("training_level")
      .eq("id", user.id)
      .single(),
    // Latest logged body weight anchors exercise weight recommendations.
    supabase
      .from("body_measurements")
      .select("weight_kg")
      .eq("user_id", user.id)
      .order("measured_on", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workout_plans")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: false }),
    // "You're expected today" dot on the Today tab.
    supabase
      .from("workout_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("scheduled_date", todayISO())
      .in("status", ["planned", "in_progress"]),
  ]);

  return (
    <ExerciseProfileProvider
      profile={{
        unit: profile?.unit_preference ?? "kg",
        sex: profile?.sex ?? null,
        heightCm: profile?.height_cm ?? null,
        weightKg: lastWeight?.weight_kg ?? null,
        trainingLevel: levelRow?.training_level ?? null,
      }}
    >
      <div className="min-h-dvh pb-16">
        <div className="mx-auto w-full max-w-sm px-4 md:max-w-2xl">
          {children}
        </div>
        <BottomNav
          plans={plans ?? []}
          hasPendingToday={(pendingToday ?? 0) > 0}
        />
        <InstallBanner />
        <Toaster />
        <GuidedTour />
      </div>
    </ExerciseProfileProvider>
  );
}
