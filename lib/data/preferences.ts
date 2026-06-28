import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WeightUnit } from "@/lib/types/database";

type Supa = SupabaseClient<Database>;

export interface UserPreferences {
  unit: WeightUnit;
  restSeconds: number;
}

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
  };
}
