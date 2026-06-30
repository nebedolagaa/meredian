import Link from "next/link";
import { TrendingDown, TrendingUp, Minus, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Wordmark } from "@/components/layout/Wordmark";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WeekThread, type ThreadDay } from "@/components/thread/WeekThread";
import { ExerciseRow } from "@/components/session/ExerciseRow";
import { LogNowButton } from "@/components/session/LogNowButton";
import { InsightCard } from "@/components/insight/InsightCard";
import { StreakCard } from "@/components/streak/StreakCard";
import { GoalRing } from "@/components/dashboard/GoalRing";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { OnboardingCard } from "@/components/onboarding/OnboardingCard";
import { SessionReminder } from "@/components/pwa/SessionReminder";
import { getAnalyticsData } from "@/lib/data/analytics";
import { getUserPreferences } from "@/lib/data/preferences";
import { weekDays, toISODate, todayISO } from "@/lib/utils/dates";
import type { InsightType } from "@/lib/utils/insights";

export const dynamic = "force-dynamic";

const insightIcon = {
  positive: TrendingUp,
  negative: TrendingDown,
  neutral: Minus,
} as const;

interface PlanExerciseRow {
  id: string;
  order_index: number;
  target_sets: number;
  target_reps: number;
  target_weight: number;
  exercises: { name: string } | null;
}

export default async function DashboardPage() {
  const supabase = createClient();
  const t = await getTranslations("dashboard");
  const tStatus = await getTranslations("status");
  const tInsights = await getTranslations("insights");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const days = weekDays();
  const weekStart = toISODate(days[0]);
  const weekEnd = toISODate(days[6]);
  const today = todayISO();

  // Sessions for the current week.
  const { data: weekSessions } = await supabase
    .from("workout_sessions")
    .select("id, scheduled_date, status, plan_id, workout_plans(name)")
    .eq("user_id", user.id)
    .gte("scheduled_date", weekStart)
    .lte("scheduled_date", weekEnd);

  const byDate = new Map(
    (weekSessions ?? []).map((s) => [s.scheduled_date, s]),
  );

  const threadDays: ThreadDay[] = days.map((d) => {
    const iso = toISODate(d);
    const session = byDate.get(iso);
    let status: ThreadDay["status"];
    if (iso === today) {
      status = "today";
    } else if (!session) {
      status = "rest";
    } else if (session.status === "completed") {
      status = "done";
    } else if (iso < today) {
      status = "missed";
    } else {
      status = "planned";
    }
    return { date: iso, dayNumber: d.getDate(), status };
  });

  const totalThisWeek = (weekSessions ?? []).length;
  const keptThisWeek = (weekSessions ?? []).filter(
    (s) => s.status === "completed",
  ).length;

  // Today's session (most relevant): today's, else next upcoming planned.
  const todaySession =
    byDate.get(today) ??
    (weekSessions ?? [])
      .filter((s) => s.scheduled_date >= today && s.status !== "completed")
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0];

  let planExercises: PlanExerciseRow[] = [];
  if (todaySession?.plan_id) {
    const { data } = await supabase
      .from("plan_exercises")
      .select(
        "id, order_index, target_sets, target_reps, target_weight, exercises(name)",
      )
      .eq("plan_id", todaySession.plan_id)
      .order("order_index", { ascending: true });
    planExercises = (data ?? []) as unknown as PlanExerciseRow[];
  }

  const { unit, weeklyGoal } = await getUserPreferences(supabase, user.id);
  const { insights, streak } = await getAnalyticsData(
    supabase,
    user.id,
    weeklyGoal,
  );
  const topInsight = insights[0];

  // Onboarding: show a starter-plan card when the user has no plans yet.
  const { count: planCount } = await supabase
    .from("workout_plans")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const hasNoPlans = (planCount ?? 0) === 0;

  // Most recent active plan, used for the one-tap "log a workout now" action.
  const { data: latestPlan } = await supabase
    .from("workout_plans")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Reminders preference (opt-in browser notification).
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("reminders_enabled")
    .eq("id", user.id)
    .single();
  const remindersEnabled = profileRow?.reminders_enabled ?? false;

  const planName =
    (todaySession?.workout_plans as { name: string } | null)?.name ??
    t("session");

  return (
    <div className="flex flex-col gap-6">
      {remindersEnabled && todaySession?.scheduled_date === today && (
        <SessionReminder enabled planName={planName} />
      )}
      <div className="flex items-center justify-between pt-6">
        <Wordmark className="!flex-row gap-2" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/settings"
            className="text-xs text-bone-dim hover:text-bone"
          >
            {t("settings")}
          </Link>
        </div>
      </div>

      {/* Week thread */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle>{t("thisWeek")}</CardTitle>
            <p className="font-num text-xs tabular-nums text-bone-dim">
              {t("sessionsKept", { kept: keptThisWeek, total: totalThisWeek })}
            </p>
          </div>
          <GoalRing
            value={keptThisWeek}
            goal={weeklyGoal}
            label={t("goalProgress", { kept: keptThisWeek, goal: weeklyGoal })}
          />
        </CardHeader>
        <CardContent>
          <WeekThread days={threadDays} />
        </CardContent>
      </Card>

      <StreakCard streak={streak} />

      {hasNoPlans && <OnboardingCard />}

      {/* Today's session */}
      {todaySession ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{planName}</CardTitle>
              <p className="font-num text-xs tabular-nums text-bone-dim">
                {todaySession.scheduled_date}
              </p>
            </div>
            <Badge
              variant={todaySession.status === "completed" ? "moss" : "steel"}
            >
              {tStatus(todaySession.status)}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {planExercises.length === 0 ? (
              <p className="text-sm text-bone-dim">{t("noExercises")}</p>
            ) : (
              <div className="divide-y divide-panel-border">
                {planExercises.map((pe) => (
                  <ExerciseRow
                    key={pe.id}
                    name={pe.exercises?.name ?? t("exercise")}
                    targetSets={pe.target_sets}
                    targetReps={pe.target_reps}
                    targetWeight={pe.target_weight}
                    unit={unit}
                  />
                ))}
              </div>
            )}

            {todaySession.status !== "completed" && (
              <Button asChild className="mt-4">
                <Link href={`/session/${todaySession.id}`}>
                  {todaySession.status === "in_progress"
                    ? t("continue")
                    : t("startSession")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-bone-dim">{t("noSessionScheduled")}</p>
            {latestPlan && (
              <LogNowButton planId={latestPlan.id} className="w-full" />
            )}
            <Button asChild variant="outline" size="sm">
              <Link href="/plans">{t("goToPlans")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Insight */}
      {topInsight && (
        <InsightCard
          type={topInsight.type as InsightType}
          message={tInsights(topInsight.messageKey, topInsight.params)}
          icon={insightIcon[topInsight.type]}
        />
      )}

      <div className="flex justify-center pb-4">
        <Link href="/calendar" className="text-xs text-steel hover:underline">
          {t("openFullCalendar")}
        </Link>
      </div>
    </div>
  );
}
