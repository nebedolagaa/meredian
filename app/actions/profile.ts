"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { WeightUnit } from "@/lib/types/database";
import { displayNameSchema } from "@/lib/validation/schemas";
import { safeActionError } from "@/lib/utils/errors";

export async function updateDisplayName(
  name: string,
): Promise<{ error?: string }> {
  const parsed = displayNameSchema.safeParse(name);
  if (!parsed.success) {
    return { error: "Please enter a name between 1 and 60 characters." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data })
    .eq("id", user.id);

  if (error) return { error: safeActionError("updateDisplayName", error) };
  revalidatePath("/settings");
  return {};
}

export async function updateUnitPreference(
  unit: WeightUnit,
): Promise<{ error?: string }> {
  if (unit !== "kg" && unit !== "lb") return { error: "Invalid unit" };

  try {
    const supabase = createClient();
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

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ rest_seconds: value })
    .eq("id", user.id);

  if (error) return { error: safeActionError("updateRestSeconds", error) };
  revalidatePath("/settings");
  return {};
}

export async function updateRemindersEnabled(
  enabled: boolean,
): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ reminders_enabled: enabled })
    .eq("id", user.id);

  if (error) return { error: safeActionError("updateRemindersEnabled", error) };
  revalidatePath("/settings");
  return {};
}

export async function updateWeeklyGoal(
  goal: number,
): Promise<{ error?: string }> {
  const value = Math.max(1, Math.min(14, Math.round(goal)));

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ weekly_goal: value })
    .eq("id", user.id);

  if (error) return { error: safeActionError("updateWeeklyGoal", error) };
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  return {};
}
