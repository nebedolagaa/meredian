"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { safeActionError } from "@/lib/utils/errors";
import { uniquePlanSlug } from "@/lib/data/planSlug";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

interface TemplateItem {
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

interface PlanTemplate {
  id: string;
  /** Default English plan name used when the plan is created. */
  planName: string;
  items: TemplateItem[];
}

// Preset programs. Targets are in kg; the user adjusts them afterwards.
const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: "full_body",
    planName: "Full Body",
    items: [
      { name: "Squat", sets: 3, reps: 5, weight: 40 },
      { name: "Bench Press", sets: 3, reps: 5, weight: 30 },
      { name: "Barbell Row", sets: 3, reps: 8, weight: 30 },
      { name: "Overhead Press", sets: 3, reps: 8, weight: 20 },
      { name: "Romanian Deadlift", sets: 3, reps: 8, weight: 40 },
    ],
  },
  {
    id: "upper",
    planName: "Upper Body",
    items: [
      { name: "Bench Press", sets: 4, reps: 6, weight: 30 },
      { name: "Barbell Row", sets: 4, reps: 6, weight: 30 },
      { name: "Overhead Press", sets: 3, reps: 8, weight: 20 },
      { name: "Pull-Up", sets: 3, reps: 8, weight: 0 },
      { name: "Bicep Curl", sets: 3, reps: 10, weight: 10 },
    ],
  },
  {
    id: "lower",
    planName: "Lower Body",
    items: [
      { name: "Squat", sets: 4, reps: 6, weight: 40 },
      { name: "Romanian Deadlift", sets: 3, reps: 8, weight: 40 },
      { name: "Leg Press", sets: 3, reps: 10, weight: 80 },
      { name: "Lunge", sets: 3, reps: 10, weight: 20 },
      { name: "Calf Raise", sets: 3, reps: 15, weight: 40 },
    ],
  },
  {
    id: "push",
    planName: "Push Day",
    items: [
      { name: "Bench Press", sets: 4, reps: 6, weight: 30 },
      { name: "Overhead Press", sets: 3, reps: 8, weight: 20 },
      { name: "Incline Bench Press", sets: 3, reps: 8, weight: 25 },
      { name: "Triceps Pushdown", sets: 3, reps: 12, weight: 15 },
    ],
  },
  {
    id: "pull",
    planName: "Pull Day",
    items: [
      { name: "Deadlift", sets: 3, reps: 5, weight: 60 },
      { name: "Barbell Row", sets: 4, reps: 6, weight: 30 },
      { name: "Pull-Up", sets: 3, reps: 8, weight: 0 },
      { name: "Bicep Curl", sets: 3, reps: 12, weight: 10 },
    ],
  },
];

/**
 * Create a workout plan from a preset template. Reuses existing global/own
 * exercises by name and creates any missing ones as user-owned.
 */
export async function createPlanFromTemplate(
  templateId: string,
): Promise<{ error?: string; id?: string }> {
  try {
    const template = PLAN_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return { error: "Unknown template." };

    const { supabase, user } = await requireUser();

    const names = template.items.map((i) => i.name);
    const { data: existing } = await supabase
      .from("exercises")
      .select("id, name, user_id")
      .in("name", names);

    const idByName = new Map<string, string>();
    for (const row of existing ?? []) {
      if (!idByName.has(row.name)) idByName.set(row.name, row.id);
    }

    const missing = names.filter((n) => !idByName.has(n));
    if (missing.length > 0) {
      const { data: created, error } = await supabase
        .from("exercises")
        .insert(missing.map((name) => ({ name, user_id: user.id })))
        .select("id, name");
      if (error)
        return { error: safeActionError("createPlanFromTemplate", error) };
      for (const row of created ?? []) idByName.set(row.name, row.id);
    }

    const slug = await uniquePlanSlug(supabase, user.id, template.planName);
    const { data: plan, error: planError } = await supabase
      .from("workout_plans")
      .insert({ name: template.planName, slug, user_id: user.id })
      .select("id")
      .single();
    if (planError)
      return { error: safeActionError("createPlanFromTemplate", planError) };

    const rows = template.items
      .map((item, index) => ({
        plan_id: plan.id,
        exercise_id: idByName.get(item.name)!,
        order_index: index,
        target_sets: item.sets,
        target_reps: item.reps,
        target_weight: item.weight,
      }))
      .filter((r) => r.exercise_id);

    if (rows.length > 0) {
      const { error } = await supabase.from("plan_exercises").insert(rows);
      if (error)
        return { error: safeActionError("createPlanFromTemplate", error) };
    }

    revalidatePath("/plans");
    revalidatePath("/dashboard");
    return { id: plan.id };
  } catch (e) {
    return { error: safeActionError("createPlanFromTemplate", e) };
  }
}
