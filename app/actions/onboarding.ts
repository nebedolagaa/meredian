"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { safeActionError } from "@/lib/utils/errors";
import { onboardingSchema, firstError } from "@/lib/validation/schemas";
import { todayISO } from "@/lib/utils/dates";
import { uniquePlanSlug } from "@/lib/data/planSlug";
async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export interface OnboardingInput {
  unit: "kg" | "lb";
  sex: "male" | "female" | null;
  weightKg: number;
  heightCm: number;
  goalType: "lose_weight" | "gain_muscle" | "burn_fat";
  goalWeightKg: number;
  trainingLevel:
    | "beginner"
    | "intermediate"
    | "advanced"
    | "professional"
    | null;
}

/**
 * Persist the onboarding wizard answers: profile fields (unit, sex, height,
 * goal) plus the starting body weight as the first body_measurements row.
 */
export async function completeOnboarding(
  input: OnboardingInput,
): Promise<{ error?: string }> {
  try {
    const parsed = onboardingSchema.safeParse(input);
    if (!parsed.success) return { error: firstError(parsed) };

    const { supabase, user } = await requireUser();

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        unit_preference: parsed.data.unit,
        sex: parsed.data.sex,
        height_cm: parsed.data.heightCm,
        goal_type: parsed.data.goalType,
        goal_weight_kg: parsed.data.goalWeightKg,
        training_level: parsed.data.trainingLevel,
        onboarding_completed: true,
      })
      .eq("id", user.id);
    if (profileError)
      return { error: safeActionError("completeOnboarding", profileError) };

    // Starting weight becomes the first point of the weight-tracking series.
    const { error: weightError } = await supabase
      .from("body_measurements")
      .insert({
        user_id: user.id,
        measured_on: todayISO(),
        weight_kg: parsed.data.weightKg,
      });
    if (weightError)
      return { error: safeActionError("completeOnboarding", weightError) };

    // No revalidatePath here on purpose: it would re-render /onboarding on the
    // server, which redirects completed users to /dashboard and would skip the
    // final wizard step. The wizard calls router.refresh() when leaving.
    return {};
  } catch (e) {
    return { error: safeActionError("completeOnboarding", e) };
  }
}

// Sensible full-body starter (targets in kg; users adjust afterwards).
const STARTER = [
  { name: "Squat", sets: 3, reps: 5, weight: 40 },
  { name: "Bench Press", sets: 3, reps: 5, weight: 30 },
  { name: "Barbell Row", sets: 3, reps: 8, weight: 30 },
  { name: "Overhead Press", sets: 3, reps: 8, weight: 20 },
  { name: "Romanian Deadlift", sets: 3, reps: 8, weight: 40 },
] as const;

/**
 * Create a ready-to-use full-body plan for a new user. Reuses global/own
 * exercises by name and creates any that are missing as user-owned.
 */
export async function createStarterPlan(): Promise<{
  error?: string;
  id?: string;
}> {
  try {
    const { supabase, user } = await requireUser();

    // Resolve exercise ids by name (global rows have user_id null).
    const names = STARTER.map((s) => s.name);
    const { data: existing } = await supabase
      .from("exercises")
      .select("id, name, user_id")
      .in("name", names);

    const idByName = new Map<string, string>();
    for (const row of existing ?? []) {
      // Prefer an existing row; global (null user_id) or the user's own.
      if (!idByName.has(row.name)) idByName.set(row.name, row.id);
    }

    // Create any missing exercises as user-owned.
    const missing = names.filter((n) => !idByName.has(n));
    if (missing.length > 0) {
      const { data: created, error } = await supabase
        .from("exercises")
        .insert(missing.map((name) => ({ name, user_id: user.id })))
        .select("id, name");
      if (error) return { error: safeActionError("createStarterPlan", error) };
      for (const row of created ?? []) idByName.set(row.name, row.id);
    }

    // Create the plan.
    const starterSlug = await uniquePlanSlug(
      supabase,
      user.id,
      "Full Body Starter",
    );
    const { data: plan, error: planError } = await supabase
      .from("workout_plans")
      .insert({
        name: "Full Body Starter",
        slug: starterSlug,
        user_id: user.id,
      })
      .select("id")
      .single();
    if (planError)
      return { error: safeActionError("createStarterPlan", planError) };

    const rows = STARTER.map((s, index) => ({
      plan_id: plan.id,
      exercise_id: idByName.get(s.name)!,
      order_index: index,
      target_sets: s.sets,
      target_reps: s.reps,
      target_weight: s.weight,
    })).filter((r) => r.exercise_id);

    if (rows.length > 0) {
      const { error } = await supabase.from("plan_exercises").insert(rows);
      if (error) return { error: safeActionError("createStarterPlan", error) };
    }

    revalidatePath("/plans");
    revalidatePath("/dashboard");
    return { id: plan.id };
  } catch (e) {
    return { error: safeActionError("createStarterPlan", e) };
  }
}
