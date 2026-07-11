"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { useTranslations } from "next-intl";
import { shortDate } from "@/lib/utils/dates";
import { useChartColors } from "@/lib/hooks/useChartColors";

interface Point {
  date: string;
  /** Already converted to the user's display unit. */
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

export function ExerciseHistoryChart({
  points,
  unitName,
}: {
  points: Point[];
  unitName: string;
}) {
  const t = useTranslations("exerciseHistory");
  const { steel, moss, clay, boneDim, grid, surface } = useChartColors();
  const max = points.reduce((m, p) => Math.max(m, p.weight), 0);
  const [yMin, yMax] = niceDomain(points.map((p) => p.weight));

  const first = points[0]?.weight ?? 0;
  const last = points[points.length - 1]?.weight ?? 0;
  const delta = Math.round((last - first) * 10) / 10;
  const deltaPct = first > 0 ? Math.round((delta / first) * 100) : 0;
  const trendUp = delta > 0;
  const trendDown = delta < 0;
  const trendColor = trendUp ? moss : trendDown ? clay : boneDim;
  const TrendIcon = trendUp ? ArrowUpRight : trendDown ? ArrowDownRight : Minus;

  if (points.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-panel-border text-sm text-bone-dim">
        {t("noData")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {points.length > 1 && (
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <span className="font-num text-2xl tabular-nums leading-none text-bone">
              {last}
              <span className="ml-1 text-sm text-bone-dim">{unitName}</span>
            </span>
            <span className="mt-1 text-[10px] uppercase tracking-wide text-bone-dim">
              {t("max")}
            </span>
          </div>
          <div
            className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium tabular-nums"
            style={{ color: trendColor, backgroundColor: `${trendColor}1A` }}
          >
            <TrendIcon className="h-3.5 w-3.5" />
            <span className="font-num">
              {delta > 0 ? "+" : ""}
              {delta} {unitName}
              {deltaPct !== 0 && (
                <span className="opacity-70">
                  {" "}
                  ({deltaPct > 0 ? "+" : ""}
                  {deltaPct}%)
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={points}
            margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
          >
            <defs>
              <linearGradient id="historyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={steel} stopOpacity={0.35} />
                <stop offset="100%" stopColor={steel} stopOpacity={0} />
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
              minTickGap={24}
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
              cursor={{ stroke: boneDim, strokeDasharray: "3 3" }}
            />
            <Area
              type="monotone"
              dataKey="weight"
              stroke={steel}
              strokeWidth={2.5}
              fill="url(#historyFill)"
              dot={(props) => {
                const { cx, cy, payload, index } = props;
                const isPR = payload.weight === max && max > 0;
                return (
                  <Dot
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={isPR ? 5 : 3}
                    fill={isPR ? moss : steel}
                    stroke={surface}
                    strokeWidth={isPR ? 2 : 0}
                  />
                );
              }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
