"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Check,
  ChevronsDownUp,
  Flag,
  Flame,
  MoreVertical,
  Share2,
  Trash2,
  SkipForward,
  Trophy,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  ChevronDown,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast/store";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  SetInput,
  type SetState,
  type SetInputMode,
} from "@/components/session/SetInput";
import { RestTimer } from "@/components/session/RestTimer";
import { PlateCalculator } from "@/components/session/PlateCalculator";
import { RescheduleControl } from "@/components/session/RescheduleControl";
import { CountUp } from "@/components/ui/CountUp";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  completeSession,
  startSession,
  deleteSession,
  setSessionStatus,
  updateSessionNotes,
  swapPlanExercise,
  type LogInput,
} from "@/app/actions/sessions";
import { totalVolume } from "@/lib/utils/volume";
import { haptic } from "@/lib/utils/haptics";
import { playFeedbackSound } from "@/lib/utils/sound";
import { fireConfetti } from "@/lib/utils/confetti";
import {
  recommendProgression,
  type ProgressionResult,
} from "@/lib/utils/progression";
import { estimateOneRepMax } from "@/lib/utils/records";
import { durationMinutes, formatDuration } from "@/lib/utils/duration";
import {
  formatVolume,
  toDisplayWeight,
  toKg,
  unitLabel,
  type WeightUnit,
} from "@/lib/utils/units";

export interface RunnerExercise {
  plan_exercise_id: string;
  exercise_id?: string | null;
  primary_muscle?: string | null;
  equipment?: string | null;
  superset_group?: number | null;
  name: string;
  target_sets: number;
  target_reps: number;
  target_weight: number;
  rest_seconds?: number | null;
  sets: SetState[];
  lastResult?: { weight: number; reps: number } | null;
  lastRpe?: number | null;
  priorBest?: number | null;
}

export interface SessionRunnerProps {
  sessionId: string;
  planName: string;
  /** ISO date — used for logic (reschedule control). */
  date: string;
  /** Localized date for display; falls back to the ISO date. */
  dateLabel?: string;
  status: string;
  exercises: RunnerExercise[];
  unit?: WeightUnit;
  restSeconds?: number;
  notes?: string | null;
  /** When the session actually started (ISO timestamp) — drives duration. */
  startedAt?: string | null;
}

interface SessionDraft {
  v: 1;
  notes: string;
  sets: Record<string, SetState[]>;
}

const draftKey = (sessionId: string) => `meredian.sessionDraft.${sessionId}`;

function loadDraft(sessionId: string): SessionDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionDraft;
    return parsed && parsed.v === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function clearDraft(sessionId: string) {
  try {
    localStorage.removeItem(draftKey(sessionId));
  } catch {
    // ignore
  }
}

/** Warm-up ramp: fraction of the working weight × reps. */
const WARMUP_STEPS = [
  { fraction: 0.4, reps: 8 },
  { fraction: 0.6, reps: 5 },
  { fraction: 0.8, reps: 3 },
];

function roundToPlate(kg: number): number {
  return Math.max(0, Math.round(kg / 2.5) * 2.5);
}

const restTimerKey = (planExerciseId: string) =>
  `meredian.restTimer.${planExerciseId}`;

export function SessionRunner({
  sessionId,
  planName,
  date,
  dateLabel,
  status,
  exercises: initial,
  unit = "kg",
  restSeconds = 90,
  notes,
  startedAt,
}: SessionRunnerProps) {
  const router = useRouter();
  const t = useTranslations("session");
  const tProg = useTranslations("progression");
  const tStatus = useTranslations("status");
  const tToast = useTranslations("toast");
  const [exercises, setExercises] = useState<RunnerExercise[]>(initial);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [newPRs, setNewPRs] = useState<string[]>([]);
  const [manageOpen, setManageOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [sessionNotes, setSessionNotes] = useState(notes ?? "");
  const [started, setStarted] = useState(false);
  const [swapFor, setSwapFor] = useState<RunnerExercise | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const completed = status === "completed";
  const inProgress = !completed && (started || status === "in_progress");
  const startRestRefs = useRef<Map<string, () => void>>(new Map());
  const restoredRef = useRef(false);
  const displayDate = dateLabel ?? date;

  const setInputMode = (ex: RunnerExercise): SetInputMode =>
    ex.equipment === "bodyweight" ? "bodyweight" : "weight";

  // Restore an unsent draft (the browser may have unloaded the PWA mid-set).
  // localStorage is client-only, so this runs after hydration; the state
  // update is deferred a tick to keep the effect body synchronous-free.
  useEffect(() => {
    if (completed) {
      // Finished elsewhere (or revisited later): the draft is obsolete —
      // clean it up so meredian.sessionDraft.* keys don't accumulate.
      clearDraft(sessionId);
      restoredRef.current = true;
      return;
    }
    const draft = loadDraft(sessionId);
    if (!draft) {
      restoredRef.current = true;
      return;
    }
    const id = window.setTimeout(() => {
      setExercises((exs) =>
        exs.map((ex) => {
          const saved = draft.sets[ex.plan_exercise_id];
          // The draft may hold MORE sets than the server-built list (warm-ups
          // are client-only until finish) — a superset draft wins.
          return saved && saved.length >= ex.sets.length
            ? { ...ex, sets: saved }
            : ex;
        }),
      );
      if (draft.notes) setSessionNotes(draft.notes);
      restoredRef.current = true;

      // Jump back to where the workout left off: the first exercise that
      // still has an open set.
      const firstOpen = Object.entries(draft.sets).find(([, sets]) =>
        sets.some((s) => !s.completed),
      );
      const hasProgress = Object.values(draft.sets).some((sets) =>
        sets.some((s) => s.completed),
      );
      if (hasProgress) {
        const targetId = firstOpen?.[0];
        requestAnimationFrame(() => {
          document
            .getElementById(targetId ? `ex-${targetId}` : "session-finish-bar")
            ?.scrollIntoView({ block: "center", behavior: "smooth" });
        });
      }
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave every edit so nothing is lost until the session is finished.
  useEffect(() => {
    if (completed || !restoredRef.current) return;
    try {
      const draft: SessionDraft = {
        v: 1,
        notes: sessionNotes,
        sets: Object.fromEntries(
          exercises.map((ex) => [ex.plan_exercise_id, ex.sets]),
        ),
      };
      localStorage.setItem(draftKey(sessionId), JSON.stringify(draft));
    } catch {
      // Quota errors are non-fatal — worst case the draft is stale.
    }
  }, [exercises, sessionNotes, completed, sessionId]);

  // Keep the screen awake while a workout is actively in progress.
  useEffect(() => {
    if (!inProgress) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let lock: WakeLockSentinel | null = null;
    let released = false;

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        // Ignore: wake lock may be denied (e.g. low battery) — non-critical.
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !released) request();
    };

    request();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisibility);
      lock?.release().catch(() => {});
    };
  }, [inProgress]);

  function updateSet(
    exId: string,
    setNumber: number,
    patch: Partial<SetState>,
  ) {
    // Auto-start the rest timer when a set is freshly marked complete.
    if (patch.completed === true) {
      const ex = exercises.find((e) => e.plan_exercise_id === exId);
      const prev = ex?.sets.find((s) => s.set_number === setNumber);
      if (prev && !prev.completed) {
        startRestRefs.current.get(exId)?.();
        haptic("success");
        playFeedbackSound("tap");
        // First completed set implicitly starts the session — no extra tap.
        if (!completed && !started && status === "planned") {
          setStarted(true);
          startSession(sessionId).catch(() => {});
        }
        // Collapse the card once its last set is done.
        if (
          ex &&
          ex.sets.every((s) =>
            s.set_number === setNumber ? true : s.completed,
          )
        ) {
          setCollapsedIds((prevIds) => new Set(prevIds).add(exId));
        }
      }
    }
    setExercises((exs) =>
      exs.map((ex) =>
        ex.plan_exercise_id !== exId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s) =>
                s.set_number === setNumber ? { ...s, ...patch } : s,
              ),
            },
      ),
    );
  }

  function toggleDetails(exId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(exId)) next.delete(exId);
      else next.add(exId);
      return next;
    });
  }

  function toggleCollapsed(exId: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(exId)) next.delete(exId);
      else next.add(exId);
      return next;
    });
  }

  function bumpWeight(exId: string, displayDelta: number) {
    // The delta arrives in the user's display unit (kg or lb).
    const deltaKg = toKg(displayDelta, unit);
    setExercises((exs) =>
      exs.map((ex) =>
        ex.plan_exercise_id !== exId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s) =>
                s.completed
                  ? s
                  : {
                      ...s,
                      weight: Math.max(0, +(s.weight + deltaKg).toFixed(2)),
                    },
              ),
            },
      ),
    );
  }

  // Set every incomplete set to a specific weight (used by the progression
  // suggestion's "apply" action).
  function applyWeight(exId: string, kg: number) {
    setExercises((exs) =>
      exs.map((ex) =>
        ex.plan_exercise_id !== exId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s) =>
                s.completed ? s : { ...s, weight: kg },
              ),
            },
      ),
    );
  }

  // Prepend a 40/60/80% ramp before the working sets.
  function addWarmup(exId: string) {
    setExercises((exs) =>
      exs.map((ex) => {
        if (ex.plan_exercise_id !== exId) return ex;
        const working =
          ex.sets.find((s) => !s.completed)?.weight ?? ex.target_weight;
        if (working <= 0) return ex;
        const warmups: SetState[] = WARMUP_STEPS.map((step, i) => ({
          set_number: i + 1,
          reps: step.reps,
          weight: roundToPlate(working * step.fraction),
          completed: false,
          rpe: null,
          note: null,
        }));
        const renumbered = ex.sets.map((s, i) => ({
          ...s,
          set_number: warmups.length + i + 1,
        }));
        return { ...ex, sets: [...warmups, ...renumbered] };
      }),
    );
    haptic("tap");
  }

  // Progression recommendations are derived from prior performance (props), so
  // compute them once from the initial data rather than on every set edit.
  const recById = useMemo(() => {
    const map = new Map<string, ProgressionResult>();
    for (const ex of initial) {
      // Bodyweight moves have no weight field to apply a suggestion to (see
      // setInputMode below) — don't recommend a weight bump for them.
      if (ex.equipment === "bodyweight") continue;
      const rec = recommendProgression({
        lastWeight: ex.lastResult?.weight ?? null,
        lastReps: ex.lastResult?.reps ?? null,
        lastRpe: ex.lastRpe ?? null,
        targetReps: ex.target_reps,
      });
      if (rec) map.set(ex.plan_exercise_id, rec);
    }
    return map;
  }, [initial]);

  // Consecutive exercises sharing a non-null superset_group render together
  // with a single rest timer for the whole group.
  const exerciseGroups = useMemo(() => {
    const groups: { group: number | null; items: RunnerExercise[] }[] = [];
    for (const ex of exercises) {
      const last = groups[groups.length - 1];
      const g = ex.superset_group ?? null;
      if (last && g !== null && last.group === g) last.items.push(ex);
      else groups.push({ group: g, items: [ex] });
    }
    return groups;
  }, [exercises]);

  const allLogs = useMemo<LogInput[]>(
    () =>
      exercises.flatMap((ex) =>
        ex.sets.map((s) => ({
          plan_exercise_id: ex.plan_exercise_id,
          set_number: s.set_number,
          actual_reps: s.reps,
          actual_weight: s.weight,
          completed: s.completed,
          rpe: s.rpe,
          note: s.note,
        })),
      ),
    [exercises],
  );

  // Exercises where a completed set beat the prior heaviest weight.
  function detectPRs(): string[] {
    const prs: string[] = [];
    for (const ex of exercises) {
      const prior = ex.priorBest ?? 0;
      const best = Math.max(
        0,
        ...ex.sets.filter((s) => s.completed).map((s) => s.weight),
      );
      if (best > 0 && best > prior) prs.push(ex.name);
    }
    return prs;
  }

  const completedVolume = useMemo(
    () =>
      totalVolume(
        allLogs.map((l) => ({
          actual_reps: l.actual_reps,
          actual_weight: l.actual_weight,
          completed: l.completed,
        })),
      ),
    [allLogs],
  );

  const completedSets = allLogs.filter((l) => l.completed).length;
  const totalSets = allLogs.length;

  // "Exercise 3 of 6" — the first exercise that still has open sets.
  const currentExerciseIndex = useMemo(() => {
    const i = exercises.findIndex((ex) => ex.sets.some((s) => !s.completed));
    return i === -1 ? exercises.length : i + 1;
  }, [exercises]);

  async function onFinish() {
    setError(null);
    setFinishing(true);
    const prs = detectPRs();
    const result = await completeSession(sessionId, allLogs, sessionNotes);
    setFinishing(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    clearDraft(sessionId);
    setDurationMin(durationMinutes(startedAt, new Date().toISOString()));
    setNewPRs(prs);
    setSummaryOpen(true);
    if (prs.length > 0) {
      haptic("celebrate");
      playFeedbackSound("celebrate");
      fireConfetti();
    } else {
      haptic("success");
      playFeedbackSound("success");
    }
  }

  async function onSaveChanges() {
    setError(null);
    setFinishing(true);
    const result = await completeSession(sessionId, allLogs, sessionNotes);
    setFinishing(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function onDelete() {
    setBusy(true);
    const result = await deleteSession(sessionId);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    clearDraft(sessionId);
    router.push("/dashboard");
    router.refresh();
  }

  async function onSkip() {
    setBusy(true);
    const result = await setSessionStatus(sessionId, "skipped");
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    clearDraft(sessionId);
    setManageOpen(false);
    router.push("/dashboard");
    router.refresh();
  }

  async function shareSummary() {
    const lines = [
      `${planName} — ${displayDate}`,
      t("shareVolume", {
        volume: formatVolume(completedVolume, unit),
        unit: unitLabel(unit),
      }),
      t("setsDone", { done: completedSets, total: totalSets }),
    ];
    if (durationMin != null)
      lines.push(t("shareDuration", { duration: formatDuration(durationMin) }));
    if (newPRs.length > 0)
      lines.push(`${t("newPR", { count: newPRs.length })} ${newPRs.join(", ")}`);
    lines.push("💪 Meredian");
    const text = lines.join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch {
      // Share sheet dismissed — fall through to the clipboard.
    }
    try {
      await navigator.clipboard.writeText(text);
      toast(tToast("summaryCopied"));
    } catch {
      // No clipboard access — show the text so it can be copied by hand.
      toast(text, { duration: 0 });
    }
  }

  function renderExercise(ex: RunnerExercise, options: { withTimer: boolean }) {
    const rec = recById.get(ex.plan_exercise_id);
    const mode = setInputMode(ex);
    const workingWeight =
      ex.sets.find((s) => !s.completed)?.weight ?? ex.target_weight;
    const bestE1rm = Math.max(
      0,
      ...ex.sets
        .filter((s) => s.completed && s.weight > 0)
        .map((s) => estimateOneRepMax(s.weight, s.reps)),
    );
    const doneSets = ex.sets.filter((s) => s.completed).length;
    const allDone = doneSets === ex.sets.length && ex.sets.length > 0;
    const collapsed = !completed && collapsedIds.has(ex.plan_exercise_id);
    const hasWarmup = ex.sets.length > ex.target_sets;

    if (collapsed) {
      return (
        <div key={ex.plan_exercise_id} id={`ex-${ex.plan_exercise_id}`}>
          <button
            type="button"
            onClick={() => toggleCollapsed(ex.plan_exercise_id)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-panel-border bg-graphite p-4 text-left transition-colors hover:border-steel/40"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              {allDone && (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-moss/15 text-moss">
                  <Check className="h-4 w-4" />
                </span>
              )}
              <span className="truncate font-semibold text-bone">
                {ex.name}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2 font-num text-xs tabular-nums text-bone-dim">
              {t("setsDone", { done: doneSets, total: ex.sets.length })}
              <ChevronDown className="h-4 w-4" />
            </span>
          </button>
          {/* Keep a (visually idle-hidden) timer mounted so the rest started
              by the final set survives the auto-collapse. */}
          {!completed && options.withTimer && (
            <RestTimer
              defaultSeconds={ex.rest_seconds ?? restSeconds}
              storageKey={restTimerKey(ex.plan_exercise_id)}
              hideIdle
              registerStart={(fn) =>
                startRestRefs.current.set(ex.plan_exercise_id, fn)
              }
            />
          )}
        </div>
      );
    }

    return (
      <div
        key={ex.plan_exercise_id}
        id={`ex-${ex.plan_exercise_id}`}
        className="rounded-2xl border border-panel-border bg-graphite p-4"
      >
        <div className="mb-2 flex flex-col gap-0.5">
          <div className="flex items-center justify-between gap-2">
            {/* Name links to the exercise's PR + progress page. */}
            <Link
              href={`/exercise/${encodeURIComponent(ex.name)}`}
              className="min-w-0 truncate text-lg font-semibold text-bone transition-colors hover:text-steel"
            >
              {ex.name}
            </Link>
            <div className="flex shrink-0 items-center gap-0.5">
              {!completed && ex.exercise_id && (
                <button
                  type="button"
                  aria-label={t("replaceExercise")}
                  onClick={() => setSwapFor(ex)}
                  className="rounded-md p-1 text-bone-dim transition-colors hover:text-bone"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </button>
              )}
              {!completed && allDone && (
                <button
                  type="button"
                  aria-label={t("collapseExercise")}
                  onClick={() => toggleCollapsed(ex.plan_exercise_id)}
                  className="rounded-md p-1 text-bone-dim transition-colors hover:text-bone"
                >
                  <ChevronsDownUp className="h-4 w-4" />
                </button>
              )}
              {(bestE1rm > 0 || workingWeight > 0) && (
                <button
                  type="button"
                  aria-label={t("exerciseDetails")}
                  aria-expanded={expandedIds.has(ex.plan_exercise_id)}
                  onClick={() => toggleDetails(ex.plan_exercise_id)}
                  className="rounded-md p-1 text-bone-dim transition-colors hover:text-bone"
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      expandedIds.has(ex.plan_exercise_id) && "rotate-180",
                    )}
                  />
                </button>
              )}
            </div>
          </div>
          <p className="font-num text-xs tabular-nums text-bone-dim">
            {t("target", {
              sets: ex.target_sets,
              reps: ex.target_reps,
              weight: ex.target_weight,
              unit: unitLabel(unit),
            })}
          </p>
          {ex.lastResult && (
            <p className="font-num text-xs tabular-nums text-steel">
              {t("lastTime", {
                weight: toDisplayWeight(ex.lastResult.weight, unit),
                unit: unitLabel(unit),
                reps: ex.lastResult.reps,
              })}
            </p>
          )}
          {expandedIds.has(ex.plan_exercise_id) && (
            <>
              {bestE1rm > 0 && (
                <p className="font-num text-xs tabular-nums text-moss">
                  {t("e1rm", {
                    weight: toDisplayWeight(bestE1rm, unit),
                    unit: unitLabel(unit),
                  })}
                </p>
              )}
              <div className="mt-1">
                <PlateCalculator weightKg={workingWeight} unit={unit} />
              </div>
            </>
          )}
          {!completed && rec && (
            <ProgressionBanner
              rec={rec}
              label={tProg(rec.reasonKey)}
              suggestedLabel={tProg("suggested", {
                weight: toDisplayWeight(rec.suggestedWeightKg, unit),
                unit: unitLabel(unit),
              })}
              applyLabel={tProg("apply", {
                weight: toDisplayWeight(rec.suggestedWeightKg, unit),
                unit: unitLabel(unit),
              })}
              onApply={() =>
                applyWeight(ex.plan_exercise_id, rec.suggestedWeightKg)
              }
            />
          )}
          {!completed && mode === "weight" && (
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => bumpWeight(ex.plan_exercise_id, -2.5)}
                className="rounded-lg border border-panel-border px-2 py-0.5 font-num text-xs tabular-nums text-bone-dim transition-colors hover:text-bone"
              >
                -2.5
              </button>
              <button
                type="button"
                onClick={() => bumpWeight(ex.plan_exercise_id, 2.5)}
                className="rounded-lg border border-panel-border px-2 py-0.5 font-num text-xs tabular-nums text-bone-dim transition-colors hover:text-bone"
              >
                +2.5{unitLabel(unit)}
              </button>
              {!hasWarmup && doneSets === 0 && workingWeight > 0 && (
                <button
                  type="button"
                  onClick={() => addWarmup(ex.plan_exercise_id)}
                  className="flex items-center gap-1 rounded-lg border border-panel-border px-2 py-0.5 text-xs text-bone-dim transition-colors hover:text-bone"
                >
                  <Flame className="h-3 w-3" />
                  {t("addWarmup")}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="divide-y divide-panel-border">
          {ex.sets.map((s) => (
            <SetInput
              key={s.set_number}
              set={s}
              targetReps={ex.target_reps}
              targetWeight={ex.target_weight}
              unit={unit}
              mode={mode}
              onChange={(patch) =>
                updateSet(ex.plan_exercise_id, s.set_number, patch)
              }
            />
          ))}
        </div>
        {!completed && options.withTimer && (
          <div className="mt-2 flex justify-center">
            <RestTimer
              defaultSeconds={ex.rest_seconds ?? restSeconds}
              storageKey={restTimerKey(ex.plan_exercise_id)}
              registerStart={(fn) =>
                startRestRefs.current.set(ex.plan_exercise_id, fn)
              }
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-28">
      <PageHeader
        title={planName}
        subtitle={displayDate}
        backHref="/dashboard"
        action={
          <div className="flex items-center gap-2">
            <Badge variant={completed ? "moss" : "steel"}>
              {tStatus(
                inProgress && status === "planned" ? "in_progress" : status,
              )}
            </Badge>
            <button
              type="button"
              aria-label={t("manage")}
              onClick={() => setManageOpen(true)}
              className="rounded-lg border border-panel-border p-2 text-bone-dim transition-colors hover:text-bone"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <div className="flex flex-col gap-5">
        {exerciseGroups.map((group, gi) =>
          group.items.length > 1 ? (
            <div
              key={`group-${gi}`}
              className="flex flex-col gap-3 rounded-2xl border border-steel/30 p-2"
            >
              <span className="flex items-center gap-1.5 px-2 pt-1 text-[10px] font-medium uppercase tracking-wide text-steel">
                <ArrowLeftRight className="h-3 w-3" />
                {t("superset")}
              </span>
              {group.items.map((ex) =>
                renderExercise(ex, { withTimer: false }),
              )}
              {/* One shared rest timer per superset — rest after the round. */}
              {!completed && (
                <div className="flex justify-center pb-1">
                  <RestTimer
                    defaultSeconds={
                      group.items[0].rest_seconds ?? restSeconds
                    }
                    storageKey={restTimerKey(
                      group.items[0].plan_exercise_id,
                    )}
                    registerStart={(fn) => {
                      for (const ex of group.items) {
                        startRestRefs.current.set(ex.plan_exercise_id, fn);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            renderExercise(group.items[0], { withTimer: true })
          ),
        )}

        {exercises.length === 0 && (
          <p className="rounded-2xl border border-dashed border-panel-border py-8 text-center text-sm text-bone-dim">
            {t("noExercises")}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-clay">{error}</p>}

      {completed && exercises.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-bone-dim" htmlFor="session-notes">
            {t("sessionNotes")}
          </label>
          <Textarea
            id="session-notes"
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder={t("sessionNotesPlaceholder")}
          />
          <Button onClick={onSaveChanges} disabled={finishing} variant="outline">
            {finishing ? t("saving") : t("saveChanges")}
          </Button>
        </div>
      )}

      {/* Sticky finish bar */}
      {!completed && exercises.length > 0 && (
        <div
          id="session-finish-bar"
          className="fixed inset-x-0 bottom-16 z-30 border-t border-panel-border bg-carbon/95 backdrop-blur"
        >
          {/* Thin session progress along the bar's top edge */}
          <div className="absolute inset-x-0 top-[-1px] h-0.5 bg-panel-border">
            <div
              className="h-full bg-moss transition-[width] duration-300"
              style={{
                width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="mx-auto flex max-w-sm items-center justify-between gap-3 px-4 py-3 md:max-w-2xl">
            <div className="flex flex-col">
              <span className="font-num text-sm tabular-nums text-bone">
                {t("volume", {
                  volume: formatVolume(completedVolume, unit),
                  unit: unitLabel(unit),
                })}
              </span>
              <span className="font-num text-[10px] tabular-nums text-bone-dim">
                {t("setsDone", { done: completedSets, total: totalSets })}
                {" · "}
                {t("exerciseOf", {
                  current: Math.min(currentExerciseIndex, exercises.length),
                  total: exercises.length,
                })}
              </span>
            </div>
            <Button onClick={onFinish} disabled={finishing}>
              <Flag className="h-4 w-4" />
              {finishing ? t("saving") : t("finishWorkout")}
            </Button>
          </div>
        </div>
      )}

      {/* Exercise swap sheet — keyed so its state resets per exercise */}
      <SwapExerciseSheet
        key={swapFor?.plan_exercise_id ?? "none"}
        exercise={swapFor}
        onClose={() => setSwapFor(null)}
        onSwapped={(slotId, candidate) => {
          // Patch local state too: `exercises` was seeded from props and a
          // router.refresh() alone won't reach it.
          setExercises((exs) =>
            exs.map((ex) =>
              ex.plan_exercise_id !== slotId
                ? ex
                : {
                    ...ex,
                    name: candidate.name,
                    exercise_id: candidate.id,
                    equipment: candidate.equipment,
                  },
            ),
          );
          setSwapFor(null);
          router.refresh();
        }}
      />

      {/* Manage sheet */}
      <Sheet open={manageOpen} onOpenChange={setManageOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{t("manage")}</SheetTitle>
            <SheetDescription>
              {planName} · {displayDate}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 flex flex-col gap-4">
            <RescheduleControl
              sessionId={sessionId}
              initialDate={date}
              onDone={() => {
                setManageOpen(false);
                router.refresh();
              }}
            />

            {!completed && (
              <Button onClick={onSkip} disabled={busy} variant="outline">
                <SkipForward className="h-4 w-4" />
                {t("skipSession")}
              </Button>
            )}

            <Button onClick={onDelete} disabled={busy} variant="destructive">
              <Trash2 className="h-4 w-4" />
              {t("deleteSession")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Completion summary */}
      <Sheet
        open={summaryOpen}
        onOpenChange={(o) => {
          setSummaryOpen(o);
          if (!o) {
            router.push("/dashboard");
            router.refresh();
          }
        }}
      >
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-moss" />
              {t("sessionComplete")}
            </SheetTitle>
            <SheetDescription>
              {planName} · {displayDate}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <SummaryStat
              label={t("totalVolume")}
              value={`${formatVolume(completedVolume, unit)} ${unitLabel(unit)}`}
            />
            <div className="flex flex-col gap-1 rounded-2xl border border-panel-border bg-graphite p-4">
              <span className="text-xs text-bone-dim">
                {t("setsCompleted")}
              </span>
              <span className="font-num text-xl tabular-nums text-bone">
                <CountUp value={completedSets} />/{totalSets}
              </span>
            </div>
            {durationMin != null && (
              <SummaryStat
                label={t("duration")}
                value={formatDuration(durationMin)}
              />
            )}
          </div>

          {newPRs.length > 0 && (
            <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-moss/40 bg-moss/10 p-4">
              <div className="flex items-center gap-2 text-moss">
                <Trophy className="h-5 w-5" />
                <span className="text-sm font-semibold">
                  {t("newPR", { count: newPRs.length })}
                </span>
              </div>
              <ul className="flex flex-col gap-0.5 pl-7">
                {newPRs.map((name) => (
                  <li key={name} className="text-sm text-bone">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-1.5">
            <label className="text-xs text-bone-dim" htmlFor="finish-notes">
              {t("sessionNotes")}
            </label>
            <Textarea
              id="finish-notes"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder={t("sessionNotesPlaceholder")}
            />
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Button variant="outline" onClick={shareSummary}>
              <Share2 className="h-4 w-4" />
              {t("shareWorkout")}
            </Button>
            <Button
              className="w-full"
              onClick={async () => {
                if (sessionNotes.trim() !== (notes ?? "").trim()) {
                  await updateSessionNotes(sessionId, sessionNotes);
                }
                setSummaryOpen(false);
                router.push("/dashboard");
                router.refresh();
              }}
            >
              {t("backToDashboard")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

interface SwapCandidate {
  id: string;
  name: string;
  equipment: string | null;
}

const KNOWN_EQUIPMENT = new Set([
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "bodyweight",
]);

/**
 * Pick a similar exercise (same primary muscle) to replace the current one —
 * the machine is taken, gear is missing, etc. Updates the plan slot, so
 * already-logged sets stay attached. Note: the slot's PAST logs move with it
 * too (history resolves names through the slot) — the sheet says so.
 */
function SwapExerciseSheet({
  exercise,
  onClose,
  onSwapped,
}: {
  exercise: RunnerExercise | null;
  onClose: () => void;
  onSwapped: (slotId: string, candidate: SwapCandidate) => void;
}) {
  const t = useTranslations("session");
  const tEquip = useTranslations("exerciseCatalog.equipment");
  const supabase = useMemo(() => createClient(), []);
  const [candidates, setCandidates] = useState<SwapCandidate[] | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No sync setState here: the sheet remounts per exercise (keyed), so
  // `candidates` already starts as null while loading.
  const load = useCallback(async () => {
    if (!exercise) return;
    let query = supabase
      .from("exercises")
      .select("id, name, equipment")
      .neq("id", exercise.exercise_id ?? "")
      .order("name")
      .limit(12);
    if (exercise.primary_muscle) {
      query = query.eq("primary_muscle", exercise.primary_muscle);
    }
    const { data } = await query;
    setCandidates((data ?? []) as SwapCandidate[]);
  }, [supabase, exercise]);

  useEffect(() => {
    if (!exercise) return;
    const id = window.setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [exercise, load]);

  async function pick(candidate: SwapCandidate) {
    if (!exercise) return;
    setSwapping(true);
    setError(null);
    const result = await swapPlanExercise(
      exercise.plan_exercise_id,
      candidate.id,
    );
    setSwapping(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSwapped(exercise.plan_exercise_id, candidate);
  }

  return (
    <Sheet open={!!exercise} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{t("replaceExercise")}</SheetTitle>
          <SheetDescription>
            {exercise?.name} — {t("replaceExerciseDesc")}{" "}
            {t("replaceExerciseHistoryNote")}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 flex max-h-[50dvh] flex-col gap-2 overflow-y-auto">
          {candidates === null ? (
            <p className="py-6 text-center text-sm text-bone-dim">…</p>
          ) : candidates.length === 0 ? (
            <p className="py-6 text-center text-sm text-bone-dim">
              {t("noAlternatives")}
            </p>
          ) : (
            candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={swapping}
                onClick={() => pick(c)}
                className="flex items-center justify-between gap-3 rounded-xl border border-panel-border bg-carbon p-3 text-left transition-colors hover:border-steel/40 disabled:opacity-50"
              >
                <span className="truncate text-sm text-bone">{c.name}</span>
                {c.equipment && (
                  <span className="shrink-0 rounded-full bg-graphite px-2 py-0.5 text-[10px] text-bone-dim">
                    {KNOWN_EQUIPMENT.has(c.equipment)
                      ? tEquip(c.equipment)
                      : c.equipment}
                  </span>
                )}
              </button>
            ))
          )}
          {error && <p className="text-sm text-clay">{error}</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-panel-border bg-graphite p-4">
      <span className="text-xs text-bone-dim">{label}</span>
      <span className="font-num text-xl tabular-nums text-bone">{value}</span>
    </div>
  );
}

function ProgressionBanner({
  rec,
  label,
  suggestedLabel,
  applyLabel,
  onApply,
}: {
  rec: ProgressionResult;
  label: string;
  suggestedLabel: string;
  applyLabel: string;
  onApply: () => void;
}) {
  const tone =
    rec.action === "increase"
      ? {
          box: "border-moss/40 bg-moss/10",
          Icon: TrendingUp,
          accent: "text-moss",
        }
      : rec.action === "deload"
        ? {
            box: "border-clay/40 bg-clay/10",
            Icon: TrendingDown,
            accent: "text-clay",
          }
        : {
            box: "border-panel-border bg-carbon",
            Icon: RotateCcw,
            accent: "text-bone-dim",
          };
  const Icon = tone.Icon;

  return (
    <div
      className={cn(
        "mt-2 flex items-center gap-2.5 rounded-xl border px-3 py-2",
        tone.box,
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", tone.accent)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs font-medium text-bone">{label}</span>
        <span className="font-num text-[11px] tabular-nums text-bone-dim">
          {suggestedLabel}
        </span>
      </div>
      {rec.action !== "hold" && (
        <button
          type="button"
          onClick={onApply}
          className={cn(
            "shrink-0 rounded-lg border px-2.5 py-1 font-num text-[11px] font-medium tabular-nums transition-colors",
            rec.action === "increase"
              ? "border-moss/50 text-moss hover:bg-moss/15"
              : "border-clay/50 text-clay hover:bg-clay/15",
          )}
        >
          {applyLabel}
        </button>
      )}
    </div>
  );
}
