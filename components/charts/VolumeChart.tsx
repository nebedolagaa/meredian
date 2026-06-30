"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { shortDate } from "@/lib/utils/dates";
import { useChartColors } from "@/lib/hooks/useChartColors";

export interface VolumePoint {
  date: string;
  progress: number;
  planned: number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-panel-border bg-carbon px-3 py-2">
      <p className="font-num text-[10px] tabular-nums text-bone-dim">
        {label ? shortDate(label) : ""}
      </p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-num text-xs tabular-nums text-bone">
          {p.dataKey === "planned" ? "Planned" : "Actual"}:{" "}
          {Math.round(p.value)}%
        </p>
      ))}
    </div>
  );
}

export function VolumeChart({ data }: { data: VolumePoint[] }) {
  const { steel, boneDim, grid } = useChartColors();

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-panel-border text-sm text-bone-dim">
        Complete sessions to see progress over time
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
        >
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            stroke={boneDim}
            tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke={boneDim}
            tickFormatter={(value) => `${value}%`}
            tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={48}
            domain={[0, "dataMax + 10"]}
          />
          <Tooltip content={<ChartTooltip />} />
          <Line
            type="monotone"
            dataKey="planned"
            stroke={boneDim}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="progress"
            stroke={steel}
            strokeWidth={2}
            dot={{ r: 3, fill: steel }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
