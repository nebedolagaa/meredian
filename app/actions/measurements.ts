"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toKg } from "@/lib/utils/units";
import { measurementSchema, firstError } from "@/lib/validation/schemas";
import { safeActionError } from "@/lib/utils/errors";
import type { WeightUnit } from "@/lib/types/database";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

/**
 * Record a body-weight measurement. The value is entered in the user's unit
 * and stored in kilograms.
 */
export async function addMeasurement(
  weightValue: number,
  unit: WeightUnit,
  measuredOn: string,
  note?: string,
): Promise<{ error?: string }> {
  try {
    const weightKg = toKg(weightValue, unit);
    const parsed = measurementSchema.safeParse({ weightKg, measuredOn, note });
    if (!parsed.success) return { error: firstError(parsed) };

    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("body_measurements").insert({
      user_id: user.id,
      measured_on: parsed.data.measuredOn,
      weight_kg: parsed.data.weightKg,
      note: parsed.data.note ?? null,
    });
    if (error) return { error: safeActionError("addMeasurement", error) };

    revalidatePath("/analytics");
    return {};
  } catch (e) {
    return { error: safeActionError("addMeasurement", e) };
  }
}

export async function deleteMeasurement(
  id: string,
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("body_measurements")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: safeActionError("deleteMeasurement", error) };

    revalidatePath("/analytics");
    return {};
  } catch (e) {
    return { error: safeActionError("deleteMeasurement", e) };
  }
}
