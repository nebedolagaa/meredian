"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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

export function SetInput({
  set,
  targetReps,
  targetWeight,
  unit = "kg",
  onChange,
}: {
  set: SetState;
  targetReps: number;
  targetWeight: number;
  unit?: WeightUnit;
  onChange: (patch: Partial<SetState>) => void;
}) {
  const t = useTranslations("session");
  const [expanded, setExpanded] = useState(false);
  const displayWeight = toDisplayWeight(set.weight, unit);
  const hasDetails = set.rpe != null || (set.note ?? "").length > 0;
  const open = expanded || hasDetails;

  return (
    <div className="flex flex-col py-2">
      <div className="flex items-center gap-2">
        <span className="w-6 shrink-0 font-num text-xs tabular-nums text-bone-dim">
          {String(set.set_number).padStart(2, "0")}
        </span>

        <div className="flex flex-1 items-center gap-1.5">
          <Input
            type="number"
            inputMode="numeric"
            aria-label={`Set ${set.set_number} reps`}
            value={set.reps}
            onChange={(e) => onChange({ reps: Number(e.target.value) || 0 })}
            className="h-10 font-num tabular-nums"
          />
          <span className="text-xs text-bone-dim">×</span>
          <Input
            type="number"
            inputMode="decimal"
            step={0.5}
            aria-label={`Set ${set.set_number} weight`}
            value={displayWeight}
            onChange={(e) =>
              onChange({ weight: toKg(Number(e.target.value) || 0, unit) })
            }
            className="h-10 font-num tabular-nums"
          />
        </div>

        <div className="flex w-20 shrink-0 flex-col items-end gap-0.5">
          <Pill
            actual={displayWeight}
            target={toDisplayWeight(targetWeight, unit)}
            unit={unitLabel(unit)}
          />
          <Pill actual={set.reps} target={targetReps} unit="r" />
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

        <Checkbox
          checked={set.completed}
          onCheckedChange={(c) => onChange({ completed: c === true })}
          aria-label={`Set ${set.set_number} done`}
        />
      </div>

      {open && (
        <div className="mt-1.5 flex items-center gap-2 pl-8">
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] uppercase tracking-wide text-bone-dim">
              {t("rpe")}
            </label>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={10}
              aria-label={`Set ${set.set_number} RPE`}
              value={set.rpe ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") return onChange({ rpe: null });
                const n = Math.min(10, Math.max(1, Number(v) || 0));
                onChange({ rpe: n });
              }}
              className="h-9 w-16 font-num tabular-nums"
            />
          </div>
          <Input
            type="text"
            maxLength={140}
            aria-label={`Set ${set.set_number} note`}
            placeholder={t("setNotePlaceholder")}
            value={set.note ?? ""}
            onChange={(e) => onChange({ note: e.target.value || null })}
            className="h-9 flex-1 text-sm"
          />
        </div>
      )}
    </div>
  );
}
