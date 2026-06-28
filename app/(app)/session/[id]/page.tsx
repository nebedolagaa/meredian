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
      "plan_exercise_id, set_number, actual_reps, actual_weight, completed",
    )
    .eq("session_id", session.id);

  type LogRow = NonNullable<typeof logs>[number];
  const logMap = new Map<string, LogRow>();
  for (const log of logs ?? []) {
    logMap.set(`${log.plan_exercise_id}-${log.set_number}`, log);
  }

  const exercises: RunnerExercise[] = planExercises.map((pe) => {
    const sets: SetState[] = Array.from(
      { length: pe.target_sets },
      (_, i): SetState => {
        const setNumber = i + 1;
        const existing = logMap.get(`${pe.id}-${setNumber}`);
        return {
          set_number: setNumber,
          reps: existing?.actual_reps ?? pe.target_reps,
          weight: existing?.actual_weight ?? pe.target_weight,
          completed: existing?.completed ?? false,
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
