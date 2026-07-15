"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toKg } from "@/lib/utils/units";
import { measurementSchema, firstError } from "@/lib/validation/schemas";
import { safeActionError } from "@/lib/utils/errors";
import type { WeightUnit } from "@/lib/types/database";

async function requireUser() {
  const supabase = await createClient();
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
export interface GirthsInput {
  waistCm?: number | null;
  chestCm?: number | null;
  armCm?: number | null;
}

export async function addMeasurement(
  weightValue: number,
  unit: WeightUnit,
  measuredOn: string,
  note?: string,
  girths?: GirthsInput,
): Promise<{ error?: string }> {
  try {
    const weightKg = toKg(weightValue, unit);
    const parsed = measurementSchema.safeParse({
      weightKg,
      measuredOn,
      note,
      waistCm: girths?.waistCm ?? null,
      chestCm: girths?.chestCm ?? null,
      armCm: girths?.armCm ?? null,
    });
    if (!parsed.success) return { error: firstError(parsed) };

    const { supabase, user } = await requireUser();
    const base = {
      user_id: user.id,
      measured_on: parsed.data.measuredOn,
      weight_kg: parsed.data.weightKg,
      note: parsed.data.note ?? null,
    };
    let { error } = await supabase.from("body_measurements").insert({
      ...base,
      waist_cm: parsed.data.waistCm ?? null,
      chest_cm: parsed.data.chestCm ?? null,
      arm_cm: parsed.data.armCm ?? null,
    });
    // Fall back for a database without migration 0019 (no girth columns).
    if (error) {
      ({ error } = await supabase.from("body_measurements").insert(base));
    }
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
