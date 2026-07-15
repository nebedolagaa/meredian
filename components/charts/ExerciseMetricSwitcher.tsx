"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ExerciseHistoryChart } from "@/components/charts/ExerciseHistoryChart";

export interface MetricPoint {
  date: string;
  /** Values already converted to the user's display unit. */
  weight: number;
  e1rm: number;
  volume: number;
}

type Metric = "weight" | "e1rm" | "volume";

const METRICS: Metric[] = ["weight", "e1rm", "volume"];

/**
 * Chips switching the exercise chart between top weight, estimated 1RM and
 * total volume — same daily series, three lenses on progress.
 */
export function ExerciseMetricSwitcher({
  points,
  unitName,
}: {
  points: MetricPoint[];
  unitName: string;
}) {
  const t = useTranslations("exerciseHistory");
  const [metric, setMetric] = useState<Metric>("weight");

  const chartPoints = points.map((p) => ({
    date: p.date,
    weight: Math.round(p[metric] * 10) / 10,
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {METRICS.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={metric === m}
            onClick={() => setMetric(m)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              metric === m
                ? "border-steel bg-steel/15 text-bone"
                : "border-panel-border text-bone-dim hover:text-bone",
            )}
          >
            {t(`metric_${m}`)}
          </button>
        ))}
      </div>
      <ExerciseHistoryChart points={chartPoints} unitName={unitName} />
    </div>
  );
}
