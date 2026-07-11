"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { WeightUnit, Sex, GoalType } from "@/lib/types/database";
import {
  displayNameSchema,
  bodyGoalSchema,
  firstError,
} from "@/lib/validation/schemas";
import { safeActionError } from "@/lib/utils/errors";

export interface BodyGoalInput {
  sex: Sex | null;
  heightCm: number | null;
  goalType: GoalType | null;
  goalWeightKg: number | null;
}

/** Update the body profile and weight goal captured during onboarding. */
export async function updateBodyGoal(
  input: BodyGoalInput,
): Promise<{ error?: string }> {
  const parsed = bodyGoalSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed) };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { error } = await supabase
      .from("profiles")
      .update({
        sex: parsed.data.sex,
        height_cm: parsed.data.heightCm,
        goal_type: parsed.data.goalType,
        goal_weight_kg: parsed.data.goalWeightKg,
      })
      .eq("id", user.id);

    if (error) return { error: safeActionError("updateBodyGoal", error) };
    revalidatePath("/profile");
    revalidatePath("/analytics");
    return {};
  } catch (e) {
    return { error: safeActionError("updateBodyGoal", e) };
  }
}

export async function updateDisplayName(
  name: string,
): Promise<{ error?: string }> {
  const parsed = displayNameSchema.safeParse(name);
  if (!parsed.success) {
    return { error: "Please enter a name between 1 and 60 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data })
    .eq("id", user.id);

  if (error) return { error: safeActionError("updateDisplayName", error) };
  revalidatePath("/profile");
  return {};
}

export async function updateUnitPreference(
  unit: WeightUnit,
): Promise<{ error?: string }> {
  if (unit !== "kg" && unit !== "lb") return { error: "Invalid unit" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { error } = await supabase
      .from("profiles")
      .update({ unit_preference: unit })
      .eq("id", user.id);

    if (error) return { error: safeActionError("updateUnitPreference", error) };
    revalidatePath("/", "layout");
    return {};
  } catch (e) {
    return { error: safeActionError("updateUnitPreference", e) };
  }
}

export async function updateRestSeconds(
  seconds: number,
): Promise<{ error?: string }> {
  const value = Math.max(0, Math.min(900, Math.round(seconds)));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ rest_seconds: value })
    .eq("id", user.id);

  if (error) return { error: safeActionError("updateRestSeconds", error) };
  revalidatePath("/profile");
  return {};
}

export async function updateRemindersEnabled(
  enabled: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ reminders_enabled: enabled })
    .eq("id", user.id);

  if (error) return { error: safeActionError("updateRemindersEnabled", error) };
  revalidatePath("/profile");
  return {};
}

export async function updateWeeklyGoal(
  goal: number,
): Promise<{ error?: string }> {
  const value = Math.max(1, Math.min(14, Math.round(goal)));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ weekly_goal: value })
    .eq("id", user.id);

  if (error) return { error: safeActionError("updateWeeklyGoal", error) };
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  return {};
}
