"use client";

import { useTranslations } from "next-intl";
import { PieChart } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export interface MusclePoint {
  group: string;
  volume: number;
}

const COLORS: Record<string, string> = {
  chest: "#818CF8",
  back: "#A3E635",
  legs: "#F87171",
  shoulders: "#38BDF8",
  arms: "#FBBF24",
  core: "#F472B6",
};

export function MuscleVolumeChart({
  data,
  emptyLabel,
}: {
  data: MusclePoint[];
  emptyLabel: string;
}) {
  const t = useTranslations("muscleGroups");
  const total = data.reduce((sum, d) => sum + d.volume, 0);

  if (total <= 0) {
    return <EmptyState icon={PieChart} message={emptyLabel} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((d) => {
        const pct = Math.round((d.volume / total) * 100);
        const color = COLORS[d.group] ?? "#818CF8";
        return (
          <div key={d.group} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-bone">{t(d.group)}</span>
              <span className="font-num tabular-nums text-bone-dim">
                {pct}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-carbon">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
