"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { InfoHint } from "@/components/ui/InfoHint";
import { computeDelta } from "@/lib/utils/delta";
import {
  toDisplayWeight,
  toKg,
  unitLabel,
  type WeightUnit,
} from "@/lib/utils/units";

export interface SetState {
  set_number: number;
  reps: number;
  weight: number;
  completed: boolean;
  rpe: number | null;
  note: string | null;
}

/** Bodyweight moves don't log a load — the weight column disappears. */
export type SetInputMode = "weight" | "bodyweight";

const RPE_CHIPS = [6, 7, 8, 9, 10];

function Pill({
  actual,
  target,
  unit,
}: {
  actual: number;
  target: number;
  unit: string;
}) {
  const d = computeDelta(actual, target);
  if (d.direction === "on-target") return null;
  const positive = d.direction === "over";
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 font-num text-[10px] tabular-nums",
        positive ? "bg-moss/15 text-moss" : "bg-clay/15 text-clay",
      )}
    >
      {d.value > 0 ? "+" : ""}
      {d.value}
      {unit}
    </span>
  );
}

function Stepper({
  ariaLabel,
  onClick,
  children,
}: {
  ariaLabel: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="flex h-10 w-6 shrink-0 items-center justify-center rounded-lg border border-panel-border text-bone-dim transition-colors hover:text-bone active:bg-carbon"
    >
      {children}
    </button>
  );
}

export function SetInput({
  set,
  targetReps,
  targetWeight,
  unit = "kg",
  mode = "weight",
  onChange,
}: {
  set: SetState;
  targetReps: number;
  targetWeight: number;
  unit?: WeightUnit;
  mode?: SetInputMode;
  onChange: (patch: Partial<SetState>) => void;
}) {
  const t = useTranslations("session");
  const [expanded, setExpanded] = useState(false);
  const displayWeight = toDisplayWeight(set.weight, unit);
  const hasDetails = set.rpe != null || (set.note ?? "").length > 0;
  const open = expanded || hasDetails;

  // Weight steps in the user's display unit so +2.5 means "+2.5 lb" for
  // lb users, not a mislabelled +2.5 kg.
  const stepWeight = (delta: number) =>
    onChange({
      weight: toKg(
        Math.max(0, Math.round((displayWeight + delta) * 10) / 10),
        unit,
      ),
    });

  return (
    <div className="flex flex-col py-2">
      <div className="flex items-center gap-1.5">
        <span className="w-5 shrink-0 font-num text-xs tabular-nums text-bone-dim">
          {String(set.set_number).padStart(2, "0")}
        </span>

        <div className="flex flex-1 items-center gap-1">
          <Stepper
            ariaLabel={`Set ${set.set_number} reps -1`}
            onClick={() => onChange({ reps: Math.max(0, set.reps - 1) })}
          >
            <Minus className="h-3.5 w-3.5" />
          </Stepper>
          <Input
            type="number"
            inputMode="numeric"
            aria-label={`Set ${set.set_number} reps`}
            value={set.reps}
            onChange={(e) => onChange({ reps: Number(e.target.value) || 0 })}
            className="h-10 min-w-0 font-num tabular-nums"
          />
          <Stepper
            ariaLabel={`Set ${set.set_number} reps +1`}
            onClick={() => onChange({ reps: set.reps + 1 })}
          >
            <Plus className="h-3.5 w-3.5" />
          </Stepper>

          {mode === "weight" ? (
            <>
              <span className="px-0.5 text-xs text-bone-dim">×</span>
              <Stepper
                ariaLabel={`Set ${set.set_number} weight -2.5`}
                onClick={() => stepWeight(-2.5)}
              >
                <Minus className="h-3.5 w-3.5" />
              </Stepper>
              <Input
                type="number"
                inputMode="decimal"
                step={0.5}
                aria-label={`Set ${set.set_number} weight`}
                value={displayWeight}
                onChange={(e) =>
                  onChange({ weight: toKg(Number(e.target.value) || 0, unit) })
                }
                className="h-10 min-w-0 font-num tabular-nums"
              />
              <Stepper
                ariaLabel={`Set ${set.set_number} weight +2.5`}
                onClick={() => stepWeight(2.5)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Stepper>
            </>
          ) : (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-graphite px-2 py-1 text-[10px] uppercase tracking-wide text-bone-dim">
              {t("bodyweight")}
              <InfoHint text={t("bodyweightHint")} />
            </span>
          )}
        </div>

        <button
          type="button"
          aria-label={t("setDetails")}
          aria-expanded={open}
          onClick={() => setExpanded((v) => !v)}
          className="rounded-md p-1 text-bone-dim transition-colors hover:text-bone"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              open && "rotate-180",
              hasDetails && "text-steel",
            )}
          />
        </button>

        {/* Big "set done" toggle — the most tapped control in the gym */}
        <button
          type="button"
          role="checkbox"
          aria-checked={set.completed}
          aria-label={`Set ${set.set_number} done`}
          onClick={() => onChange({ completed: !set.completed })}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors active:scale-95",
            set.completed
              ? "border-moss bg-moss text-carbon"
              : "border-panel-border bg-carbon text-bone-dim hover:border-steel/50",
          )}
        >
          <Check className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>

      {open && (
        <div className="mt-1.5 flex flex-col gap-2 pl-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-bone-dim">
              {t("rpe")}
              <InfoHint text={t("rpeHint")} />
            </span>
            {/* Chips beat a tiny number field for sweaty thumbs — and RPE
                actually getting filled feeds the progression engine. */}
            <div className="flex items-center gap-1">
              {RPE_CHIPS.map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={set.rpe === v}
                  onClick={() => onChange({ rpe: set.rpe === v ? null : v })}
                  className={cn(
                    "h-8 w-8 rounded-lg border font-num text-xs tabular-nums transition-colors",
                    set.rpe === v
                      ? "border-steel bg-steel/15 text-bone"
                      : "border-panel-border text-bone-dim hover:text-bone",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <span className="ml-auto flex items-center gap-1">
              {mode === "weight" && (
                <Pill
                  actual={displayWeight}
                  target={toDisplayWeight(targetWeight, unit)}
                  unit={unitLabel(unit)}
                />
              )}
              <Pill actual={set.reps} target={targetReps} unit="r" />
            </span>
          </div>
          <Input
            type="text"
            maxLength={140}
            aria-label={`Set ${set.set_number} note`}
            placeholder={t("setNotePlaceholder")}
            value={set.note ?? ""}
            onChange={(e) => onChange({ note: e.target.value || null })}
            className="h-9 text-sm"
          />
        </div>
      )}
    </div>
  );
}
