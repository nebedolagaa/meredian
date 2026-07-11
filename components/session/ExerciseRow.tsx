import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { computeDelta } from "@/lib/utils/delta";
import { toDisplayWeight, unitLabel, type WeightUnit } from "@/lib/utils/units";

export interface ExerciseRowProps {
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  unit?: WeightUnit;
  /** Provided once the session has been logged. */
  actualSets?: number;
  actualReps?: number | null;
  actualWeight?: number | null;
}

function DeltaPill({
  actual,
  target,
  unit,
}: {
  actual: number;
  target: number;
  unit: string;
}) {
  const delta = computeDelta(actual, target);
  if (delta.direction === "on-target") return null;

  const positive = delta.direction === "over";
  const sign = delta.value > 0 ? "+" : "";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 font-num text-xs tabular-nums",
        positive ? "bg-moss/15 text-moss" : "bg-clay/15 text-clay",
      )}
    >
      {sign}
      {delta.value}
      {unit}
    </span>
  );
}

export function ExerciseRow({
  name,
  targetSets,
  targetReps,
  targetWeight,
  unit = "kg",
  actualReps,
  actualWeight,
}: ExerciseRowProps) {
  const t = useTranslations("exerciseRow");
  const label = unitLabel(unit);
  const hasActual =
    actualReps !== undefined &&
    actualReps !== null &&
    actualWeight !== undefined &&
    actualWeight !== null;

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-bone">{name}</p>
        <p className="font-num text-xs tabular-nums text-bone-dim">
          {t("plan", {
            sets: targetSets,
            reps: targetReps,
            weight: toDisplayWeight(targetWeight, unit),
            unit: label,
          })}
        </p>
        {hasActual && (
          <p className="font-num text-xs tabular-nums text-bone">
            {t("actual", {
              sets: targetSets,
              reps: actualReps,
              weight: toDisplayWeight(actualWeight!, unit),
              unit: label,
            })}
          </p>
        )}
      </div>

      {hasActual && (
        <div className="flex shrink-0 items-center gap-1.5">
          <DeltaPill
            actual={toDisplayWeight(actualWeight!, unit)}
            target={toDisplayWeight(targetWeight, unit)}
            unit={label}
          />
          <DeltaPill actual={actualReps!} target={targetReps} unit=" reps" />
        </div>
      )}
    </div>
  );
}
