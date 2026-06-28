"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { WeightUnit } from "@/lib/types/database";

export async function updateDisplayName(
  name: string,
): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name.trim() })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}

export async function updateUnitPreference(
  unit: WeightUnit,
): Promise<{ error?: string }> {
  if (unit !== "kg" && unit !== "lb") return { error: "Invalid unit" };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ unit_preference: unit })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return {};
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

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}
