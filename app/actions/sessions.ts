"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isoDateSchema, sessionLogsSchema } from "@/lib/validation/schemas";
import { todayISO } from "@/lib/utils/dates";
import { safeActionError } from "@/lib/utils/errors";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export interface ActionResult {
  error?: string;
  id?: string;
}

/**
 * Create a planned session for a plan on a date.
 */
export async function createSession(
  planId: string | null,
  scheduledDate: string,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    if (!isoDateSchema.safeParse(scheduledDate).success) {
      return { error: "A valid date is required." };
    }
    if (planId) {
      const { data: plan } = await supabase
        .from("workout_plans")
        .select("id")
        .eq("id", planId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!plan) return { error: "Plan not found." };
    }
    const { data, error } = await supabase
      .from("workout_sessions")
      .insert({
        plan_id: planId,
        user_id: user.id,
        scheduled_date: scheduledDate,
        status: "planned",
      })
      .select("id")
      .single();

    if (error) return { error: safeActionError("createSession", error) };
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    return { id: data.id };
  } catch (e) {
    return { error: safeActionError("createSession", e) };
  }
}

export async function startSession(sessionId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("workout_sessions")
      .update({ status: "in_progress" })
      .eq("id", sessionId)
      .eq("user_id", user.id);
    if (error) return { error: safeActionError("startSession", error) };
    revalidatePath(`/session/${sessionId}`);
    revalidatePath("/dashboard");
    return { id: sessionId };
  } catch (e) {
    return { error: safeActionError("startSession", e) };
  }
}

/**
 * Create and immediately start a session for today from an existing plan.
 * Powers the dashboard "log a workout now" quick action (ad-hoc logging).
 */
export async function logWorkoutNow(planId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { data: plan } = await supabase
      .from("workout_plans")
      .select("id")
      .eq("id", planId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!plan) return { error: "Plan not found." };
    const { data, error } = await supabase
      .from("workout_sessions")
      .insert({
        plan_id: planId,
        user_id: user.id,
        scheduled_date: todayISO(),
        status: "in_progress",
      })
      .select("id")
      .single();

    if (error) return { error: safeActionError("logWorkoutNow", error) };
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    return { id: data.id };
  } catch (e) {
    return { error: safeActionError("logWorkoutNow", e) };
  }
}

export interface LogInput {
  plan_exercise_id: string;
  set_number: number;
  actual_reps: number | null;
  actual_weight: number | null;
  completed: boolean;
  rpe: number | null;
  note: string | null;
}

/**
 * Persist all set logs for a session and mark it completed.
 * Replaces any existing logs for the session (idempotent finish).
 */
export async function completeSession(
  sessionId: string,
  logs: LogInput[],
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    // Defence in depth: confirm the session belongs to the caller before
    // touching its logs (session_logs has no user_id column to scope on).
    const { data: session } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!session) return { error: "Session not found." };

    const parsed = sessionLogsSchema.safeParse(logs);
    if (!parsed.success) return { error: "Invalid session data." };
    const safeLogs = parsed.data;

    // Clear existing logs for this session, then insert fresh.
    const { error: delError } = await supabase
      .from("session_logs")
      .delete()
      .eq("session_id", sessionId);
    if (delError)
      return { error: safeActionError("completeSession", delError) };

    if (safeLogs.length > 0) {
      const { error: insError } = await supabase.from("session_logs").insert(
        safeLogs.map((l) => ({
          session_id: sessionId,
          plan_exercise_id: l.plan_exercise_id,
          set_number: l.set_number,
          actual_reps: l.actual_reps,
          actual_weight: l.actual_weight,
          completed: l.completed,
          rpe: l.rpe,
          note: l.note,
        })),
      );
      if (insError)
        return { error: safeActionError("completeSession", insError) };
    }

    const { error: updError } = await supabase
      .from("workout_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("user_id", user.id);
    if (updError)
      return { error: safeActionError("completeSession", updError) };

    revalidatePath("/dashboard");
    revalidatePath("/analytics");
    revalidatePath("/calendar");
    return { id: sessionId };
  } catch (e) {
    return { error: safeActionError("completeSession", e) };
  }
}

export async function deleteSession(sessionId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("workout_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", user.id);
    if (error) return { error: safeActionError("deleteSession", error) };
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    return {};
  } catch (e) {
    return { error: safeActionError("deleteSession", e) };
  }
}

/**
 * Move a session to a different date.
 */
export async function rescheduleSession(
  sessionId: string,
  scheduledDate: string,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    if (!isoDateSchema.safeParse(scheduledDate).success) {
      return { error: "A valid date is required." };
    }
    const { error } = await supabase
      .from("workout_sessions")
      .update({ scheduled_date: scheduledDate })
      .eq("id", sessionId)
      .eq("user_id", user.id);
    if (error) return { error: safeActionError("rescheduleSession", error) };
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    revalidatePath(`/session/${sessionId}`);
    return { id: sessionId };
  } catch (e) {
    return { error: safeActionError("rescheduleSession", e) };
  }
}

/**
 * Mark a session as skipped (or reopen it back to planned).
 */
export async function setSessionStatus(
  sessionId: string,
  status: "planned" | "in_progress" | "completed" | "skipped",
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("workout_sessions")
      .update({
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", sessionId)
      .eq("user_id", user.id);
    if (error) return { error: safeActionError("setSessionStatus", error) };
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    revalidatePath(`/session/${sessionId}`);
    return { id: sessionId };
  } catch (e) {
    return { error: safeActionError("setSessionStatus", e) };
  }
}
