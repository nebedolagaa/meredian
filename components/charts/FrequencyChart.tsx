"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { shortDate } from "@/lib/utils/dates";
import { useChartColors } from "@/lib/hooks/useChartColors";

export interface FrequencyPoint {
  week: string;
  count: number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-panel-border bg-carbon px-3 py-2">
      <p className="font-num text-[10px] tabular-nums text-bone-dim">
        {label ? shortDate(label) : ""}
      </p>
      <p className="font-num text-xs tabular-nums text-bone">
        {payload[0].value}
      </p>
    </div>
  );
}

export function FrequencyChart({
  data,
  emptyLabel,
}: {
  data: FrequencyPoint[];
  emptyLabel: string;
}) {
  const hasData = data.some((d) => d.count > 0);
  const { steel, boneDim, grid, cursor } = useChartColors();
  if (!hasData) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-panel-border text-sm text-bone-dim">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: -24 }}
        >
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis
            dataKey="week"
            tickFormatter={shortDate}
            stroke={boneDim}
            tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            stroke={boneDim}
            tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: cursor }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.week} fill={steel} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
