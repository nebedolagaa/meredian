"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

    if (error) return { error: error.message };
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    return { id: data.id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function startSession(sessionId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("workout_sessions")
      .update({ status: "in_progress" })
      .eq("id", sessionId);
    if (error) return { error: error.message };
    revalidatePath(`/session/${sessionId}`);
    revalidatePath("/dashboard");
    return { id: sessionId };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export interface LogInput {
  plan_exercise_id: string;
  set_number: number;
  actual_reps: number | null;
  actual_weight: number | null;
  completed: boolean;
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
    const { supabase } = await requireUser();

    // Clear existing logs for this session, then insert fresh.
    const { error: delError } = await supabase
      .from("session_logs")
      .delete()
      .eq("session_id", sessionId);
    if (delError) return { error: delError.message };

    if (logs.length > 0) {
      const { error: insError } = await supabase.from("session_logs").insert(
        logs.map((l) => ({
          session_id: sessionId,
          plan_exercise_id: l.plan_exercise_id,
          set_number: l.set_number,
          actual_reps: l.actual_reps,
          actual_weight: l.actual_weight,
          completed: l.completed,
        })),
      );
      if (insError) return { error: insError.message };
    }

    const { error: updError } = await supabase
      .from("workout_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    if (updError) return { error: updError.message };

    revalidatePath("/dashboard");
    revalidatePath("/analytics");
    revalidatePath("/calendar");
    return { id: sessionId };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteSession(sessionId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("workout_sessions")
      .delete()
      .eq("id", sessionId);
    if (error) return { error: error.message };
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
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
    const { supabase } = await requireUser();
    if (!scheduledDate) return { error: "A date is required." };
    const { error } = await supabase
      .from("workout_sessions")
      .update({ scheduled_date: scheduledDate })
      .eq("id", sessionId);
    if (error) return { error: error.message };
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    revalidatePath(`/session/${sessionId}`);
    return { id: sessionId };
  } catch (e) {
    return { error: (e as Error).message };
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
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("workout_sessions")
      .update({
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", sessionId);
    if (error) return { error: error.message };
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    revalidatePath(`/session/${sessionId}`);
    return { id: sessionId };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
