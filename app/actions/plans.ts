"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { savePlanSchema, firstError } from "@/lib/validation/schemas";
import { safeActionError } from "@/lib/utils/errors";

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

    const parsed = savePlanSchema.safeParse({ name, exercises });
    if (!parsed.success) return { error: firstError(parsed) };
    const cleanName = parsed.data.name;

    let id = planId;

    if (id) {
      const { error } = await supabase
        .from("workout_plans")
        .update({ name: cleanName })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) return { error: safeActionError("savePlan", error) };

      // Replace existing plan exercises.
      const { error: delError } = await supabase
        .from("plan_exercises")
        .delete()
        .eq("plan_id", id);
      if (delError) return { error: safeActionError("savePlan", delError) };
    } else {
      const { data, error } = await supabase
        .from("workout_plans")
        .insert({ name: cleanName, user_id: user.id })
        .select("id")
        .single();
      if (error) return { error: safeActionError("savePlan", error) };
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
      if (error) return { error: safeActionError("savePlan", error) };
    }

    revalidatePath("/plans");
    return { id: id! };
  } catch (e) {
    return { error: safeActionError("savePlan", e) };
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
    if (error) return { error: safeActionError("deletePlan", error) };
    revalidatePath("/plans");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: safeActionError("deletePlan", e) };
  }
}

/** Toggle a plan between active and archived. */
export async function setPlanArchived(
  planId: string,
  archived: boolean,
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("workout_plans")
      .update({ is_archived: archived })
      .eq("id", planId)
      .eq("user_id", user.id);
    if (error) return { error: safeActionError("setPlanArchived", error) };
    revalidatePath("/plans");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: safeActionError("setPlanArchived", e) };
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
    if (planError)
      return { error: safeActionError("duplicatePlan", planError) };

    const { data: created, error: createError } = await supabase
      .from("workout_plans")
      .insert({ name: `${plan.name} (copy)`, user_id: user.id })
      .select("id")
      .single();
    if (createError)
      return { error: safeActionError("duplicatePlan", createError) };

    const { data: exercises, error: exError } = await supabase
      .from("plan_exercises")
      .select(
        "exercise_id, order_index, target_sets, target_reps, target_weight",
      )
      .eq("plan_id", planId);
    if (exError) return { error: safeActionError("duplicatePlan", exError) };

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
      if (insError)
        return { error: safeActionError("duplicatePlan", insError) };
    }

    revalidatePath("/plans");
    return { id: created.id };
  } catch (e) {
    return { error: safeActionError("duplicatePlan", e) };
  }
}
