import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import {
  type SessionSummary,
  type ExerciseHistory,
  generateInsights,
  type Insight,
} from "@/lib/utils/insights";
import { setVolume } from "@/lib/utils/volume";
import {
  computePersonalRecords,
  computeRecordTimeline,
  estimateOneRepMax,
  type PersonalRecord,
  type RecordEvent,
} from "@/lib/utils/records";
import { computeStreak, type StreakResult } from "@/lib/utils/streak";
import { todayISO } from "@/lib/utils/dates";
import { DEFAULT_WEEKLY_GOAL } from "@/lib/data/preferences";
import type { PrimaryMuscle } from "@/lib/types/database";

type Supa = SupabaseClient<Database>;

interface LogRow {
  session_id: string;
  set_number: number;
  actual_reps: number | null;
  actual_weight: number | null;
  completed: boolean;
  plan_exercises: {
    target_sets: number;
    exercises: {
      name: string;
      muscle_group: string | null;
      primary_muscle: string | null;
    } | null;
  } | null;
}

interface SessionRow {
  id: string;
  scheduled_date: string;
  status: string;
  plan_id: string | null;
}

export interface AnalyticsData {
  sessions: SessionSummary[];
  history: ExerciseHistory[];
  insights: Insight[];
  /** Progress per completed session, ordered oldest -> newest. */
  progressSeries: { date: string; progress: number; planned: number }[];
  /** Completed sessions per week for the last 8 weeks, oldest -> newest. */
  frequencySeries: { week: string; count: number }[];
  /** Completed volume split by muscle group, largest first. */
  muscleVolume: { group: string; volume: number }[];
  /** Completed volume by fine-grained muscle, normalized 0-1 for the body map heat-map. */
  muscleIntensity: Partial<Record<PrimaryMuscle, number>>;
  exerciseNames: string[];
  records: PersonalRecord[];
  /** Chronological log of new personal-best 1RMs, newest first. */
  recordTimeline: RecordEvent[];
  /** Weekly-goal streak summary for the retention card. */
  streak: StreakResult;
  /** ISO dates of completed sessions over the last 52 weeks (for the heatmap). */
  completedDates: string[];
}

export async function getAnalyticsData(
  supabase: Supa,
  userId: string,
  weeklyGoal: number = DEFAULT_WEEKLY_GOAL,
): Promise<AnalyticsData> {
  // Sessions in the last ~60 days.
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const sinceISO = since.toISOString().slice(0, 10);

  const { data: sessionRows } = await supabase
    .from("workout_sessions")
    .select("id, scheduled_date, status, plan_id")
    .eq("user_id", userId)
    .gte("scheduled_date", sinceISO)
    .order("scheduled_date", { ascending: true });

  const sessions = (sessionRows ?? []) as SessionRow[];
  const sessionIds = sessions.map((s) => s.id);

  // Planned sets per plan (sum of target_sets across plan exercises).
  const planIds = Array.from(
    new Set(sessions.map((s) => s.plan_id).filter((x): x is string => !!x)),
  );
  const plannedSetsByPlan = new Map<string, number>();
  const plannedVolumeByPlan = new Map<string, number>();
  if (planIds.length > 0) {
    const { data: planEx } = await supabase
      .from("plan_exercises")
      .select("plan_id, target_sets, target_reps, target_weight")
      .in("plan_id", planIds);
    for (const row of planEx ?? []) {
      plannedSetsByPlan.set(
        row.plan_id,
        (plannedSetsByPlan.get(row.plan_id) ?? 0) + row.target_sets,
      );
      plannedVolumeByPlan.set(
        row.plan_id,
        (plannedVolumeByPlan.get(row.plan_id) ?? 0) +
          row.target_sets * row.target_reps * row.target_weight,
      );
    }
  }

  // Logs for these sessions, joined to exercise name.
  let logs: LogRow[] = [];
  if (sessionIds.length > 0) {
    const { data: logRows } = await supabase
      .from("session_logs")
      .select(
        "session_id, set_number, actual_reps, actual_weight, completed, plan_exercises(target_sets, exercises(name, muscle_group, primary_muscle))",
      )
      .in("session_id", sessionIds);
    logs = (logRows ?? []) as unknown as LogRow[];
  }

  // Aggregate per session.
  const volumeBySession = new Map<string, number>();
  const completedSetsBySession = new Map<string, number>();
  // exerciseName -> sessionId -> max weight
  const exerciseSessionMax = new Map<string, Map<string, number>>();

  for (const log of logs) {
    if (log.completed) {
      volumeBySession.set(
        log.session_id,
        (volumeBySession.get(log.session_id) ?? 0) +
          setVolume(log.actual_reps, log.actual_weight),
      );
      completedSetsBySession.set(
        log.session_id,
        (completedSetsBySession.get(log.session_id) ?? 0) + 1,
      );
    }
    const name = log.plan_exercises?.exercises?.name;
    if (name && log.actual_weight != null) {
      let perSession = exerciseSessionMax.get(name);
      if (!perSession) {
        perSession = new Map();
        exerciseSessionMax.set(name, perSession);
      }
      perSession.set(
        log.session_id,
        Math.max(perSession.get(log.session_id) ?? 0, log.actual_weight),
      );
    }
  }

  const summaries: SessionSummary[] = sessions.map((s) => {
    const actualVolume = volumeBySession.get(s.id) ?? 0;
    const plannedVolume = s.plan_id
      ? (plannedVolumeByPlan.get(s.plan_id) ?? 0)
      : 0;
    const progress =
      plannedVolume > 0
        ? Math.round((actualVolume / plannedVolume) * 100)
        : actualVolume > 0
          ? 100
          : 0;
    return {
      date: s.scheduled_date,
      volume: actualVolume,
      progress,
      plannedSets: s.plan_id ? (plannedSetsByPlan.get(s.plan_id) ?? 0) : 0,
      completedSets: completedSetsBySession.get(s.id) ?? 0,
      completed: s.status === "completed",
    };
  });

  const orderedSessionIds = sessions.map((s) => s.id);
  const history: ExerciseHistory[] = Array.from(
    exerciseSessionMax.entries(),
  ).map(([name, perSession]) => ({
    name,
    maxWeights: orderedSessionIds
      .filter((id) => perSession.has(id))
      .map((id) => perSession.get(id)!),
  }));

  const completedSummaries = summaries.filter((s) => s.completed);
  const progressSeries = sessions
    .filter((s) => s.status === "completed")
    .map((s) => {
      const actualVolume = volumeBySession.get(s.id) ?? 0;
      const plannedVolume = s.plan_id
        ? (plannedVolumeByPlan.get(s.plan_id) ?? 0)
        : 0;
      const progress =
        plannedVolume > 0
          ? Math.round((actualVolume / plannedVolume) * 100)
          : actualVolume > 0
            ? 100
            : 0;
      return {
        date: s.scheduled_date,
        progress,
        planned: 100,
      };
    });

  // Weekly-goal streak over a longer window than the 60-day analytics view so
  // longest-streak detection isn't artificially capped.
  const streakSince = new Date();
  streakSince.setDate(streakSince.getDate() - 52 * 7);
  const { data: streakRows } = await supabase
    .from("workout_sessions")
    .select("scheduled_date")
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("scheduled_date", streakSince.toISOString().slice(0, 10));
  const streak = computeStreak(
    (streakRows ?? []).map((r) => r.scheduled_date),
    weeklyGoal,
    todayISO(),
  );

  const insights = generateInsights({
    sessions: completedSummaries,
    history,
    streakWeeks: streak.current,
  });

  // Training frequency: completed sessions per week (Mon-start), last 8 weeks.
  const weekStart = (dateStr: string): string => {
    const d = new Date(`${dateStr}T00:00:00`);
    const day = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - day);
    return d.toISOString().slice(0, 10);
  };
  const freqByWeek = new Map<string, number>();
  for (const s of completedSummaries) {
    const wk = weekStart(s.date);
    freqByWeek.set(wk, (freqByWeek.get(wk) ?? 0) + 1);
  }
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
  const frequencySeries: { week: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i * 7);
    const wk = d.toISOString().slice(0, 10);
    frequencySeries.push({ week: wk, count: freqByWeek.get(wk) ?? 0 });
  }

  // Completed volume by muscle group.
  const volumeByMuscle = new Map<string, number>();
  for (const log of logs) {
    if (!log.completed) continue;
    const group = log.plan_exercises?.exercises?.muscle_group;
    if (!group) continue;
    volumeByMuscle.set(
      group,
      (volumeByMuscle.get(group) ?? 0) +
        setVolume(log.actual_reps, log.actual_weight),
    );
  }
  const muscleVolume = Array.from(volumeByMuscle.entries())
    .map(([group, volume]) => ({ group, volume }))
    .sort((a, b) => b.volume - a.volume);

  // Completed volume by fine-grained muscle (for the body map heat-map),
  // normalized against the largest muscle's volume so fills scale 0-1.
  const volumeByPrimaryMuscle = new Map<string, number>();
  for (const log of logs) {
    if (!log.completed) continue;
    const muscle = log.plan_exercises?.exercises?.primary_muscle;
    if (!muscle) continue;
    volumeByPrimaryMuscle.set(
      muscle,
      (volumeByPrimaryMuscle.get(muscle) ?? 0) +
        setVolume(log.actual_reps, log.actual_weight),
    );
  }
  const maxPrimaryVolume = Math.max(
    0,
    ...Array.from(volumeByPrimaryMuscle.values()),
  );
  const muscleIntensity: Partial<Record<PrimaryMuscle, number>> = {};
  if (maxPrimaryVolume > 0) {
    for (const [muscle, volume] of Array.from(volumeByPrimaryMuscle)) {
      muscleIntensity[muscle as PrimaryMuscle] = volume / maxPrimaryVolume;
    }
  }

  const records = computePersonalRecords(
    logs
      .filter((l) => l.completed && l.actual_weight != null)
      .map((l) => ({
        name: l.plan_exercises?.exercises?.name ?? "",
        weight: l.actual_weight ?? 0,
        reps: l.actual_reps ?? 0,
      }))
      .filter((l) => l.name),
  );

  const sessionDateById = new Map(sessions.map((s) => [s.id, s.scheduled_date]));
  const recordTimeline = computeRecordTimeline(
    logs
      .filter((l) => l.completed && l.actual_weight != null)
      .map((l) => ({
        name: l.plan_exercises?.exercises?.name ?? "",
        weight: l.actual_weight ?? 0,
        reps: l.actual_reps ?? 0,
        date: sessionDateById.get(l.session_id) ?? "",
      }))
      .filter((l) => l.name && l.date)
      .sort((a, b) => a.date.localeCompare(b.date)),
  );

  return {
    sessions: summaries,
    history,
    insights,
    progressSeries,
    frequencySeries,
    muscleVolume,
    muscleIntensity,
    exerciseNames: Array.from(exerciseSessionMax.keys()).sort(),
    records,
    recordTimeline,
    streak,
    completedDates: (streakRows ?? []).map((r) => r.scheduled_date),
  };
}

/**
 * Lean reader for the dashboard: weekly-goal streak + top insight only.
 * Skips the records/muscle/frequency work (and their joins) that the full
 * analytics page needs — the dashboard is the most-hit route in the app.
 */
export async function getDashboardData(
  supabase: Supa,
  userId: string,
  weeklyGoal: number = DEFAULT_WEEKLY_GOAL,
): Promise<{ streak: StreakResult; insights: Insight[] }> {
  // Streak from completed dates only (52 weeks, single light column).
  const streakSince = new Date();
  streakSince.setDate(streakSince.getDate() - 52 * 7);
  const { data: streakRows } = await supabase
    .from("workout_sessions")
    .select("scheduled_date")
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("scheduled_date", streakSince.toISOString().slice(0, 10));
  const streak = computeStreak(
    (streakRows ?? []).map((r) => r.scheduled_date),
    weeklyGoal,
    todayISO(),
  );

  // Insights need the last ~30 days of sessions + logs (lean join: name only).
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const { data: sessionRows } = await supabase
    .from("workout_sessions")
    .select("id, scheduled_date, status, plan_id")
    .eq("user_id", userId)
    .gte("scheduled_date", since.toISOString().slice(0, 10))
    .order("scheduled_date", { ascending: true });
  const sessions = (sessionRows ?? []) as SessionRow[];
  const sessionIds = sessions.map((s) => s.id);

  const planIds = Array.from(
    new Set(sessions.map((s) => s.plan_id).filter((x): x is string => !!x)),
  );
  const plannedSetsByPlan = new Map<string, number>();
  const plannedVolumeByPlan = new Map<string, number>();
  if (planIds.length > 0) {
    const { data: planEx } = await supabase
      .from("plan_exercises")
      .select("plan_id, target_sets, target_reps, target_weight")
      .in("plan_id", planIds);
    for (const row of planEx ?? []) {
      plannedSetsByPlan.set(
        row.plan_id,
        (plannedSetsByPlan.get(row.plan_id) ?? 0) + row.target_sets,
      );
      plannedVolumeByPlan.set(
        row.plan_id,
        (plannedVolumeByPlan.get(row.plan_id) ?? 0) +
          row.target_sets * row.target_reps * row.target_weight,
      );
    }
  }

  interface LeanLogRow {
    session_id: string;
    actual_reps: number | null;
    actual_weight: number | null;
    completed: boolean;
    plan_exercises: { exercises: { name: string } | null } | null;
  }
  let logs: LeanLogRow[] = [];
  if (sessionIds.length > 0) {
    const { data: logRows } = await supabase
      .from("session_logs")
      .select(
        "session_id, actual_reps, actual_weight, completed, plan_exercises(exercises(name))",
      )
      .in("session_id", sessionIds);
    logs = (logRows ?? []) as unknown as LeanLogRow[];
  }

  const volumeBySession = new Map<string, number>();
  const completedSetsBySession = new Map<string, number>();
  const exerciseSessionMax = new Map<string, Map<string, number>>();
  for (const log of logs) {
    if (log.completed) {
      volumeBySession.set(
        log.session_id,
        (volumeBySession.get(log.session_id) ?? 0) +
          setVolume(log.actual_reps, log.actual_weight),
      );
      completedSetsBySession.set(
        log.session_id,
        (completedSetsBySession.get(log.session_id) ?? 0) + 1,
      );
    }
    const name = log.plan_exercises?.exercises?.name;
    if (name && log.actual_weight != null) {
      let perSession = exerciseSessionMax.get(name);
      if (!perSession) {
        perSession = new Map();
        exerciseSessionMax.set(name, perSession);
      }
      perSession.set(
        log.session_id,
        Math.max(perSession.get(log.session_id) ?? 0, log.actual_weight),
      );
    }
  }

  const summaries: SessionSummary[] = sessions.map((s) => {
    const actualVolume = volumeBySession.get(s.id) ?? 0;
    const plannedVolume = s.plan_id
      ? (plannedVolumeByPlan.get(s.plan_id) ?? 0)
      : 0;
    const progress =
      plannedVolume > 0
        ? Math.round((actualVolume / plannedVolume) * 100)
        : actualVolume > 0
          ? 100
          : 0;
    return {
      date: s.scheduled_date,
      volume: actualVolume,
      progress,
      plannedSets: s.plan_id ? (plannedSetsByPlan.get(s.plan_id) ?? 0) : 0,
      completedSets: completedSetsBySession.get(s.id) ?? 0,
      completed: s.status === "completed",
    };
  });

  const orderedSessionIds = sessions.map((s) => s.id);
  const history: ExerciseHistory[] = Array.from(
    exerciseSessionMax.entries(),
  ).map(([name, perSession]) => ({
    name,
    maxWeights: orderedSessionIds
      .filter((id) => perSession.has(id))
      .map((id) => perSession.get(id)!),
  }));

  const insights = generateInsights({
    sessions: summaries.filter((s) => s.completed),
    history,
    streakWeeks: streak.current,
  });

  return { streak, insights };
}

export interface ExerciseSeriesPoint {
  date: string;
  /** Heaviest completed set that day (kg). */
  weight: number;
  /** Best estimated 1RM that day (kg). */
  e1rm: number;
  /** Total completed volume that day (kg). */
  volume: number;
}

/**
 * Per-exercise daily series (max weight, best e1RM, total volume) for the
 * metric switcher on the exercise page. Ordered oldest -> newest.
 */
export async function getExerciseSeries(
  supabase: Supa,
  userId: string,
  exerciseName: string,
): Promise<ExerciseSeriesPoint[]> {
  const { data: sessionRows } = await supabase
    .from("workout_sessions")
    .select("id, scheduled_date, status")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("scheduled_date", { ascending: true });

  const sessions = (sessionRows ?? []) as {
    id: string;
    scheduled_date: string;
  }[];
  if (sessions.length === 0) return [];

  const ids = sessions.map((s) => s.id);
  const { data: logRows } = await supabase
    .from("session_logs")
    .select(
      "session_id, actual_reps, actual_weight, completed, plan_exercises(exercises(name))",
    )
    .in("session_id", ids);

  interface SeriesLogRow {
    session_id: string;
    actual_reps: number | null;
    actual_weight: number | null;
    completed: boolean;
    plan_exercises: { exercises: { name: string } | null } | null;
  }
  const logs = (logRows ?? []) as unknown as SeriesLogRow[];
  const dateById = new Map(sessions.map((s) => [s.id, s.scheduled_date]));
  const byDate = new Map<string, ExerciseSeriesPoint>();

  for (const log of logs) {
    if (!log.completed || log.actual_weight == null) continue;
    if (log.plan_exercises?.exercises?.name !== exerciseName) continue;
    const date = dateById.get(log.session_id);
    if (!date) continue;
    const point = byDate.get(date) ?? { date, weight: 0, e1rm: 0, volume: 0 };
    const reps = log.actual_reps ?? 0;
    point.weight = Math.max(point.weight, log.actual_weight);
    point.e1rm = Math.max(
      point.e1rm,
      estimateOneRepMax(log.actual_weight, reps),
    );
    point.volume += log.actual_weight * reps;
    byDate.set(date, point);
  }

  return Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

/**
 * Per-exercise actual weight over time for the progress chart.
 * Returns points ordered oldest -> newest with the max weight that day.
 */
export async function getExerciseProgress(
  supabase: Supa,
  userId: string,
  exerciseName: string,
): Promise<{ date: string; weight: number }[]> {
  const { data: sessionRows } = await supabase
    .from("workout_sessions")
    .select("id, scheduled_date, status")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("scheduled_date", { ascending: true });

  const sessions = (sessionRows ?? []) as {
    id: string;
    scheduled_date: string;
  }[];
  if (sessions.length === 0) return [];

  const ids = sessions.map((s) => s.id);
  const { data: logRows } = await supabase
    .from("session_logs")
    .select(
      "session_id, actual_weight, completed, plan_exercises(exercises(name))",
    )
    .in("session_id", ids);

  const logs = (logRows ?? []) as unknown as LogRow[];
  const dateById = new Map(sessions.map((s) => [s.id, s.scheduled_date]));
  const maxByDate = new Map<string, number>();

  for (const log of logs) {
    if (!log.completed || log.actual_weight == null) continue;
    if (log.plan_exercises?.exercises?.name !== exerciseName) continue;
    const date = dateById.get(log.session_id);
    if (!date) continue;
    maxByDate.set(date, Math.max(maxByDate.get(date) ?? 0, log.actual_weight));
  }

  return Array.from(maxByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, weight]) => ({ date, weight }));
}
