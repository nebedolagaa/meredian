import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPreferences, getProfileSex } from "@/lib/data/preferences";
import { PlanBuilder } from "@/components/session/PlanBuilder";

export const dynamic = "force-dynamic";

interface PlanExerciseRow {
  id: string;
  exercise_id: string | null;
  order_index: number;
  target_sets: number;
  target_reps: number;
  target_weight: number;
  exercises: {
    name: string;
    muscle_group: string | null;
    description: string | null;
  } | null;
}

export default async function EditPlanPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const t = await getTranslations("planBuilder");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const prefs = user
    ? await getUserPreferences(supabase, user.id)
    : { unit: "kg" as const, restSeconds: 90 };

  // Body-map figure follows the profile sex; male by default.
  const sex = user ? await getProfileSex(supabase, user.id) : "male";

  const { data: plan } = await supabase
    .from("workout_plans")
    .select("id, name")
    .eq("id", params.id)
    .single();

  if (!plan) notFound();

  const { data: planExercises } = await supabase
    .from("plan_exercises")
    .select(
      "id, exercise_id, order_index, target_sets, target_reps, target_weight, exercises(name, muscle_group, description)",
    )
    .eq("plan_id", plan.id)
    .order("order_index", { ascending: true });

  const rows = ((planExercises ?? []) as unknown as PlanExerciseRow[]).map(
    (pe, i) => ({
      key: `existing-${pe.id}-${i}`,
      exercise_id: pe.exercise_id ?? "",
      name: pe.exercises?.name ?? t("exercise"),
      muscle_group: pe.exercises?.muscle_group ?? null,
      description: pe.exercises?.description ?? null,
      target_sets: pe.target_sets,
      target_reps: pe.target_reps,
      target_weight: pe.target_weight,
    }),
  );

  return (
    <PlanBuilder
      initial={{ id: plan.id, name: plan.name, rows }}
      unit={prefs.unit}
      sex={sex}
    />
  );
}
