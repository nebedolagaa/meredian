"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, Minus, Trophy } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exerciseProgressAction } from "@/app/actions/analytics";
import { shortDate } from "@/lib/utils/dates";
import { toDisplayWeight, type WeightUnit } from "@/lib/utils/units";
import { useChartColors } from "@/lib/hooks/useChartColors";

interface Point {
  date: string;
  weight: number;
}

/** Build a padded, rounded [min, max] domain so the line never hugs the edges. */
function niceDomain(values: number[]): [number, number] {
  if (values.length === 0) return [0, 10];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || max || 1;
  const pad = Math.max(2.5, range * 0.2);
  const lo = Math.max(0, Math.floor((min - pad) / 5) * 5);
  const hi = Math.ceil((max + pad) / 5) * 5;
  return [lo, hi === lo ? lo + 5 : hi];
}

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-panel-border bg-carbon px-3 py-2 shadow-lg">
      <p className="font-num text-[10px] tabular-nums text-bone-dim">
        {label ? shortDate(label) : ""}
      </p>
      <p className="font-num text-xs tabular-nums text-bone">
        {payload[0].value} {unit}
      </p>
    </div>
  );
}

export function ExerciseProgressChart({
  exerciseNames,
  unit,
  unitName,
}: {
  exerciseNames: string[];
  unit: WeightUnit;
  unitName: string;
}) {
  const [selected, setSelected] = useState<string>(exerciseNames[0] ?? "");
  const [points, setPoints] = useState<Point[]>([]);
  const [pending, startTransition] = useTransition();
  const { steel, moss, clay, boneDim, grid, cursor } = useChartColors();

  useEffect(() => {
    if (!selected) return;
    startTransition(async () => {
      const data = await exerciseProgressAction(selected);
      setPoints(
        data.map((p) => ({
          date: p.date,
          weight: toDisplayWeight(p.weight, unit),
        })),
      );
    });
  }, [selected, unit]);

  const max = points.reduce((m, p) => Math.max(m, p.weight), 0);
  const [yMin, yMax] = useMemo(
    () => niceDomain(points.map((p) => p.weight)),
    [points],
  );

  const first = points[0]?.weight ?? 0;
  const last = points[points.length - 1]?.weight ?? 0;
  const delta = Math.round((last - first) * 10) / 10;
  const deltaPct = first > 0 ? Math.round((delta / first) * 100) : 0;
  const trendUp = delta > 0;
  const trendDown = delta < 0;
  const trendColor = trendUp ? moss : trendDown ? clay : boneDim;
  const TrendIcon = trendUp ? ArrowUpRight : trendDown ? ArrowDownRight : Minus;

  if (exerciseNames.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-panel-border text-sm text-bone-dim">
        Log exercises to track progress
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger>
          <SelectValue placeholder="Select an exercise" />
        </SelectTrigger>
        <SelectContent>
          {exerciseNames.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {points.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-panel-border text-sm text-bone-dim">
          {pending ? "Loading…" : "No logged data for this exercise yet"}
        </div>
      ) : (
        <>
          {/* Stat strip */}
          <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-panel-border bg-carbon/40">
            <div className="flex flex-col gap-1 p-3">
              <span className="text-[10px] uppercase tracking-wide text-bone-dim">
                Start
              </span>
              <span className="font-num text-lg tabular-nums leading-none text-bone">
                {first}
                <span className="ml-1 text-xs text-bone-dim">{unitName}</span>
              </span>
            </div>
            <div className="flex flex-col gap-1 border-x border-panel-border p-3">
              <span className="text-[10px] uppercase tracking-wide text-bone-dim">
                Latest
              </span>
              <span className="font-num text-lg tabular-nums leading-none text-bone">
                {last}
                <span className="ml-1 text-xs text-bone-dim">{unitName}</span>
              </span>
              {points.length > 1 && (delta !== 0 || deltaPct !== 0) && (
                <span
                  className="mt-0.5 flex items-center gap-0.5 text-[11px] font-medium tabular-nums"
                  style={{ color: trendColor }}
                >
                  <TrendIcon className="h-3 w-3" />
                  {delta > 0 ? "+" : ""}
                  {delta} {unitName}
                  {deltaPct !== 0 && (
                    <span className="opacity-70">
                      ({deltaPct > 0 ? "+" : ""}
                      {deltaPct}%)
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1 p-3">
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-bone-dim">
                <Trophy className="h-3 w-3 text-moss" />
                Best
              </span>
              <span className="font-num text-lg tabular-nums leading-none text-moss">
                {max}
                <span className="ml-1 text-xs text-bone-dim">{unitName}</span>
              </span>
            </div>
          </div>

          {/* Top-set per session */}
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={points}
                margin={{ top: 8, right: 4, bottom: 0, left: -16 }}
                barCategoryGap="22%"
              >
                <defs>
                  <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={steel} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={steel} stopOpacity={0.35} />
                  </linearGradient>
                  <linearGradient id="barFillPR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={moss} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={moss} stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  stroke={boneDim}
                  tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={20}
                />
                <YAxis
                  stroke={boneDim}
                  tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  domain={[yMin, yMax]}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<ChartTooltip unit={unitName} />}
                  cursor={{ fill: cursor }}
                />
                <Bar dataKey="weight" radius={[4, 4, 0, 0]} maxBarSize={32}>
                  {points.map((p, i) => {
                    const isPR = p.weight === max && max > 0;
                    return (
                      <Cell
                        key={i}
                        fill={isPR ? "url(#barFillPR)" : "url(#barFill)"}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
