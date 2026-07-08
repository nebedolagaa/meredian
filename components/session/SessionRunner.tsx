"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Flag,
  MoreVertical,
  Trash2,
  SkipForward,
  CalendarClock,
  Trophy,
  TrendingUp,
  TrendingDown,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/PageHeader";
import { SetInput, type SetState } from "@/components/session/SetInput";
import { RestTimer } from "@/components/session/RestTimer";
import { PlateCalculator } from "@/components/session/PlateCalculator";
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
  rescheduleSession,
  setSessionStatus,
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
import {
  formatVolume,
  toDisplayWeight,
  unitLabel,
  type WeightUnit,
} from "@/lib/utils/units";

export interface RunnerExercise {
  plan_exercise_id: string;
  name: string;
  target_sets: number;
  target_reps: number;
  target_weight: number;
  sets: SetState[];
  lastResult?: { weight: number; reps: number } | null;
  lastRpe?: number | null;
  priorBest?: number | null;
}

export interface SessionRunnerProps {
  sessionId: string;
  planName: string;
  date: string;
  status: string;
  exercises: RunnerExercise[];
  unit?: WeightUnit;
  restSeconds?: number;
}

export function SessionRunner({
  sessionId,
  planName,
  date,
  status,
  exercises: initial,
  unit = "kg",
  restSeconds = 90,
}: SessionRunnerProps) {
  const router = useRouter();
  const t = useTranslations("session");
  const tProg = useTranslations("progression");
  const tStatus = useTranslations("status");
  const [exercises, setExercises] = useState<RunnerExercise[]>(initial);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [newPRs, setNewPRs] = useState<string[]>([]);
  const [manageOpen, setManageOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(date);
  const [busy, setBusy] = useState(false);
  const completed = status === "completed";
  const startRestRef = useRef<(() => void) | null>(null);

  // Keep the screen awake while a workout is actively in progress.
  useEffect(() => {
    if (status !== "in_progress") return;
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
  }, [status]);

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
        startRestRef.current?.();
        haptic("success");
        playFeedbackSound("tap");
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

  function bumpWeight(exId: string, delta: number) {
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
                      weight: Math.max(0, +(s.weight + delta).toFixed(2)),
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

  // Progression recommendations are derived from prior performance (props), so
  // compute them once from the initial data rather than on every set edit.
  const recById = useMemo(() => {
    const map = new Map<string, ProgressionResult>();
    for (const ex of initial) {
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

  async function onStart() {
    await startSession(sessionId);
    router.refresh();
  }

  async function onFinish() {
    setError(null);
    setFinishing(true);
    const prs = detectPRs();
    const result = await completeSession(sessionId, allLogs);
    setFinishing(false);
    if (result.error) {
      setError(result.error);
      return;
    }
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
    const result = await completeSession(sessionId, allLogs);
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
    setManageOpen(false);
    router.push("/dashboard");
    router.refresh();
  }

  async function onReschedule() {
    setBusy(true);
    const result = await rescheduleSession(sessionId, rescheduleDate);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setManageOpen(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5 pb-28">
      <PageHeader
        title={planName}
        subtitle={date}
        backHref="/dashboard"
        action={
          <div className="flex items-center gap-2">
            <Badge variant={completed ? "moss" : "steel"}>
              {tStatus(status)}
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

      {status === "planned" && (
        <Button onClick={onStart} variant="outline">
          {t("startSession")}
        </Button>
      )}

      <div className="flex flex-col gap-5">
        {exercises.map((ex) => {
          const rec = recById.get(ex.plan_exercise_id);
          const workingWeight =
            ex.sets.find((s) => !s.completed)?.weight ?? ex.target_weight;
          const bestE1rm = Math.max(
            0,
            ...ex.sets
              .filter((s) => s.completed && s.weight > 0)
              .map((s) => estimateOneRepMax(s.weight, s.reps)),
          );
          return (
            <div
              key={ex.plan_exercise_id}
              className="rounded-2xl border border-panel-border bg-graphite p-4"
            >
              <div className="mb-2 flex flex-col gap-0.5">
                <h3 className="text-lg font-semibold text-bone">{ex.name}</h3>
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
                {!completed && (
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
                    onChange={(patch) =>
                      updateSet(ex.plan_exercise_id, s.set_number, patch)
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}

        {exercises.length === 0 && (
          <p className="rounded-2xl border border-dashed border-panel-border py-8 text-center text-sm text-bone-dim">
            {t("noExercises")}
          </p>
        )}
      </div>

      {exercises.length > 0 && (
        <div className="flex justify-center">
          <RestTimer
            defaultSeconds={restSeconds}
            registerStart={(fn) => (startRestRef.current = fn)}
          />
        </div>
      )}

      {error && <p className="text-sm text-clay">{error}</p>}

      {completed && exercises.length > 0 && (
        <Button onClick={onSaveChanges} disabled={finishing} variant="outline">
          {finishing ? t("saving") : t("saveChanges")}
        </Button>
      )}

      {/* Sticky finish bar */}
      {!completed && exercises.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-panel-border bg-carbon/95 backdrop-blur">
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
              </span>
            </div>
            <Button onClick={onFinish} disabled={finishing}>
              <Flag className="h-4 w-4" />
              {finishing ? t("saving") : t("finishWorkout")}
            </Button>
          </div>
        </div>
      )}

      {/* Manage sheet */}
      <Sheet open={manageOpen} onOpenChange={setManageOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{t("manage")}</SheetTitle>
            <SheetDescription>
              {planName} · {date}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-bone-dim">{t("reschedule")}</label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="font-num tabular-nums"
                />
                <Button
                  onClick={onReschedule}
                  disabled={busy}
                  variant="outline"
                >
                  <CalendarClock className="h-4 w-4" />
                  {t("move")}
                </Button>
              </div>
            </div>

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
              {planName} · {date}
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

          <Button
            className="mt-6 w-full"
            onClick={() => {
              setSummaryOpen(false);
              router.push("/dashboard");
              router.refresh();
            }}
          >
            {t("backToDashboard")}
          </Button>
        </SheetContent>
      </Sheet>
    </div>
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
