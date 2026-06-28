"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export interface PlanExerciseInput {
  exercise_id: string;
  target_sets: number;
  target_reps: number;
  target_weight: number;
}

export interface SavePlanResult {
  error?: string;
  id?: string;
}

/**
 * Create or update a plan together with its ordered exercises.
 * When `planId` is provided, the plan's exercises are fully replaced.
 */
export async function savePlan(
  planId: string | null,
  name: string,
  exercises: PlanExerciseInput[],
): Promise<SavePlanResult> {
  try {
    const { supabase, user } = await requireUser();

    if (!name.trim()) return { error: "Plan name is required." };

    let id = planId;

    if (id) {
      const { error } = await supabase
        .from("workout_plans")
        .update({ name: name.trim() })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) return { error: error.message };

      // Replace existing plan exercises.
      const { error: delError } = await supabase
        .from("plan_exercises")
        .delete()
        .eq("plan_id", id);
      if (delError) return { error: delError.message };
    } else {
      const { data, error } = await supabase
        .from("workout_plans")
        .insert({ name: name.trim(), user_id: user.id })
        .select("id")
        .single();
      if (error) return { error: error.message };
      id = data.id;
    }

    if (exercises.length > 0) {
      const rows = exercises.map((e, index) => ({
        plan_id: id!,
        exercise_id: e.exercise_id,
        order_index: index,
        target_sets: e.target_sets,
        target_reps: e.target_reps,
        target_weight: e.target_weight,
      }));
      const { error } = await supabase.from("plan_exercises").insert(rows);
      if (error) return { error: error.message };
    }

    revalidatePath("/plans");
    return { id: id! };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deletePlan(planId: string): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("workout_plans")
      .delete()
      .eq("id", planId)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidatePath("/plans");
    redirect("/plans");
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/**
 * Duplicate a plan (with all its exercises) as a new template.
 */
export async function duplicatePlan(
  planId: string,
): Promise<{ error?: string; id?: string }> {
  try {
    const { supabase, user } = await requireUser();

    const { data: plan, error: planError } = await supabase
      .from("workout_plans")
      .select("name")
      .eq("id", planId)
      .eq("user_id", user.id)
      .single();
    if (planError) return { error: planError.message };

    const { data: created, error: createError } = await supabase
      .from("workout_plans")
      .insert({ name: `${plan.name} (copy)`, user_id: user.id })
      .select("id")
      .single();
    if (createError) return { error: createError.message };

    const { data: exercises, error: exError } = await supabase
      .from("plan_exercises")
      .select(
        "exercise_id, order_index, target_sets, target_reps, target_weight",
      )
      .eq("plan_id", planId);
    if (exError) return { error: exError.message };

    if (exercises && exercises.length > 0) {
      const { error: insError } = await supabase.from("plan_exercises").insert(
        exercises.map((e) => ({
          plan_id: created.id,
          exercise_id: e.exercise_id,
          order_index: e.order_index,
          target_sets: e.target_sets,
          target_reps: e.target_reps,
          target_weight: e.target_weight,
        })),
      );
      if (insError) return { error: insError.message };
    }

    revalidatePath("/plans");
    return { id: created.id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
