import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPreferences } from "@/lib/data/preferences";
import {
  SessionRunner,
  type RunnerExercise,
} from "@/components/session/SessionRunner";
import type { SetState } from "@/components/session/SetInput";

export const dynamic = "force-dynamic";

interface PlanExerciseRow {
  id: string;
  order_index: number;
  target_sets: number;
  target_reps: number;
  target_weight: number;
  exercises: { name: string } | null;
}

export default async function SessionPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const t = await getTranslations("session");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const prefs = user
    ? await getUserPreferences(supabase, user.id)
    : { unit: "kg" as const, restSeconds: 90 };

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id, plan_id, status, scheduled_date, workout_plans(name)")
    .eq("id", params.id)
    .single();

  if (!session) notFound();

  const planName =
    (session.workout_plans as { name: string } | null)?.name ?? t("session");

  // Plan exercises (targets).
  let planExercises: PlanExerciseRow[] = [];
  if (session.plan_id) {
    const { data } = await supabase
      .from("plan_exercises")
      .select(
        "id, order_index, target_sets, target_reps, target_weight, exercises(name)",
      )
      .eq("plan_id", session.plan_id)
      .order("order_index", { ascending: true });
    planExercises = (data ?? []) as unknown as PlanExerciseRow[];
  }

  // Existing logs (resume / view completed).
  const { data: logs } = await supabase
    .from("session_logs")
    .select(
      "plan_exercise_id, set_number, actual_reps, actual_weight, completed, rpe, note",
    )
    .eq("session_id", session.id);

  type LogRow = NonNullable<typeof logs>[number];
  const logMap = new Map<string, LogRow>();
  for (const log of logs ?? []) {
    logMap.set(`${log.plan_exercise_id}-${log.set_number}`, log);
  }

  // Prior performance for these exercises (completed sessions only). Used to
  // show "last time" and to detect new personal records on finish.
  const peIds = planExercises.map((pe) => pe.id);
  const lastResultByPe = new Map<string, { weight: number; reps: number }>();
  const lastRpeByPe = new Map<string, number>();
  const priorBestByPe = new Map<string, number>();
  if (peIds.length > 0) {
    const since = new Date();
    since.setDate(since.getDate() - 365);
    const { data: priorLogs } = await supabase
      .from("session_logs")
      .select(
        "plan_exercise_id, actual_reps, actual_weight, rpe, workout_sessions!inner(scheduled_date, status)",
      )
      .in("plan_exercise_id", peIds)
      .eq("completed", true)
      .eq("workout_sessions.status", "completed")
      .neq("session_id", session.id)
      .gte("workout_sessions.scheduled_date", since.toISOString().slice(0, 10));

    interface PriorRow {
      plan_exercise_id: string | null;
      actual_reps: number | null;
      actual_weight: number | null;
      rpe: number | null;
      workout_sessions: { scheduled_date: string } | null;
    }
    // Track the most recent dated top set per exercise, and the all-time best.
    const latestDateByPe = new Map<string, string>();
    for (const row of (priorLogs ?? []) as unknown as PriorRow[]) {
      const pe = row.plan_exercise_id;
      const w = row.actual_weight;
      if (!pe || w == null) continue;
      priorBestByPe.set(pe, Math.max(priorBestByPe.get(pe) ?? 0, w));
      const date = row.workout_sessions?.scheduled_date ?? "";
      const latest = latestDateByPe.get(pe);
      if (!latest || date > latest) {
        latestDateByPe.set(pe, date);
        lastResultByPe.set(pe, { weight: w, reps: row.actual_reps ?? 0 });
        if (row.rpe != null) lastRpeByPe.set(pe, row.rpe);
      } else if (date === latest) {
        const cur = lastResultByPe.get(pe);
        if (!cur || w > cur.weight) {
          lastResultByPe.set(pe, { weight: w, reps: row.actual_reps ?? 0 });
          if (row.rpe != null) lastRpeByPe.set(pe, row.rpe);
        }
      }
    }
  }

  const exercises: RunnerExercise[] = planExercises.map((pe) => {
    const last = lastResultByPe.get(pe.id) ?? null;
    const sets: SetState[] = Array.from(
      { length: pe.target_sets },
      (_, i): SetState => {
        const setNumber = i + 1;
        const existing = logMap.get(`${pe.id}-${setNumber}`);
        return {
          set_number: setNumber,
          reps: existing?.actual_reps ?? last?.reps ?? pe.target_reps,
          weight: existing?.actual_weight ?? last?.weight ?? pe.target_weight,
          completed: existing?.completed ?? false,
          rpe: existing?.rpe ?? null,
          note: existing?.note ?? null,
        };
      },
    );
    return {
      plan_exercise_id: pe.id,
      name: pe.exercises?.name ?? t("exercise"),
      target_sets: pe.target_sets,
      target_reps: pe.target_reps,
      target_weight: pe.target_weight,
      sets,
      lastResult: last,
      lastRpe: lastRpeByPe.get(pe.id) ?? null,
      priorBest: priorBestByPe.get(pe.id) ?? null,
    };
  });

  return (
    <SessionRunner
      sessionId={session.id}
      planName={planName}
      date={session.scheduled_date}
      status={session.status}
      exercises={exercises}
      unit={prefs.unit}
      restSeconds={prefs.restSeconds}
    />
  );
}
