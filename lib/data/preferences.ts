import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WeightUnit } from "@/lib/types/database";

type Supa = SupabaseClient<Database>;

export interface UserPreferences {
  unit: WeightUnit;
  restSeconds: number;
  weeklyGoal: number;
}

export const DEFAULT_WEEKLY_GOAL = 3;

/**
 * Read the current user's display preferences, falling back to defaults.
 */
export async function getUserPreferences(
  supabase: Supa,
  userId: string,
): Promise<UserPreferences> {
  const { data } = await supabase
    .from("profiles")
    .select("unit_preference, rest_seconds")
    .eq("id", userId)
    .single();

  return {
    unit: data?.unit_preference ?? "kg",
    restSeconds: data?.rest_seconds ?? 90,
    weeklyGoal: await getWeeklyGoal(supabase, userId),
  };
}

/**
 * Read the weekly session goal. Queried separately and defensively so a missing
 * `weekly_goal` column (before migration 0009 is applied) can't break the rest
 * of the preferences read — it simply falls back to the default.
 */
export async function getWeeklyGoal(
  supabase: Supa,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("profiles")
    .select("weekly_goal")
    .eq("id", userId)
    .single();

  if (error || data?.weekly_goal == null) return DEFAULT_WEEKLY_GOAL;
  return data.weekly_goal;
}
