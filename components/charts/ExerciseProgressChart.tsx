"use client";

import { useEffect, useState, useTransition } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exerciseProgressAction } from "@/app/actions/analytics";
import { shortDate } from "@/lib/utils/dates";

const steel = "#9BA7B4";
const moss = "#6F8F6A";
const boneDim = "rgba(237,234,227,0.42)";

interface Point {
  date: string;
  weight: number;
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
        {payload[0].value} kg
      </p>
    </div>
  );
}

export function ExerciseProgressChart({
  exerciseNames,
}: {
  exerciseNames: string[];
}) {
  const [selected, setSelected] = useState<string>(exerciseNames[0] ?? "");
  const [points, setPoints] = useState<Point[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!selected) return;
    startTransition(async () => {
      const data = await exerciseProgressAction(selected);
      setPoints(data);
    });
  }, [selected]);

  const max = points.reduce((m, p) => Math.max(m, p.weight), 0);

  if (exerciseNames.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-panel-border text-sm text-bone-dim">
        Log exercises to track progress
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
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
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={points}
              margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
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
                tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                width={48}
                domain={["dataMin - 5", "dataMax + 5"]}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke={steel}
                strokeWidth={2}
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
                    />
                  );
                }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
