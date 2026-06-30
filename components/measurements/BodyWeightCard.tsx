"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shortDate, todayISO } from "@/lib/utils/dates";
import { addMeasurement, deleteMeasurement } from "@/app/actions/measurements";
import type { WeightUnit } from "@/lib/types/database";

const steel = "#818CF8";
const boneDim = "rgba(236,236,242,0.45)";

export interface MeasurementPoint {
  id: string;
  date: string;
  /** Already converted to the user's display unit. */
  weight: number;
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
    <div className="rounded-lg border border-panel-border bg-carbon px-3 py-2">
      <p className="font-num text-[10px] tabular-nums text-bone-dim">
        {label ? shortDate(label) : ""}
      </p>
      <p className="font-num text-xs tabular-nums text-bone">
        {payload[0].value} {unit}
      </p>
    </div>
  );
}

export function BodyWeightCard({
  measurements,
  unit,
  unitName,
}: {
  measurements: MeasurementPoint[];
  unit: WeightUnit;
  unitName: string;
}) {
  const t = useTranslations("bodyWeight");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add() {
    setError(null);
    const value = Number(weight);
    if (!value || value <= 0) {
      setError(t("invalidWeight"));
      return;
    }
    startTransition(async () => {
      const result = await addMeasurement(value, unit, date);
      if (result.error) {
        setError(result.error);
        return;
      }
      setWeight("");
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteMeasurement(id);
      router.refresh();
    });
  }

  // Chart wants ascending dates; list shows most recent first.
  const chartData = [...measurements].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const recent = [...measurements]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-full flex-col gap-2 md:flex-row md:items-end">
        <div className="flex min-w-0 flex-col gap-1.5 md:w-24 md:shrink-0">
          <Label htmlFor="bw-weight">{t("weight", { unit: unitName })}</Label>
          <Input
            id="bw-weight"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.1}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full font-num tabular-nums"
            placeholder="0"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5 md:w-44 md:shrink-0">
          <Label htmlFor="bw-date">{t("date")}</Label>
          <Input
            id="bw-date"
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="w-24 min-w-0 max-w-full overflow-hidden font-num tabular-nums md:w-full"
          />
        </div>
        <Button onClick={add} disabled={pending} className="w-full md:w-auto">
          {pending ? tCommon("saving") : t("add")}
        </Button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {chartData.length >= 2 ? (
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
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
                domain={["dataMin - 2", "dataMax + 2"]}
              />
              <Tooltip content={<ChartTooltip unit={unitName} />} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke={steel}
                strokeWidth={2}
                dot={{ r: 3, fill: steel }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="py-2 text-center text-xs text-bone-dim">{t("noData")}</p>
      )}

      {recent.length > 0 && (
        <div className="divide-y divide-panel-border">
          {recent.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <span className="font-num text-xs tabular-nums text-bone-dim">
                {shortDate(m.date)}
              </span>
              <div className="flex items-center gap-3">
                <span className="font-num text-sm tabular-nums text-bone">
                  {m.weight} {unitName}
                </span>
                <button
                  type="button"
                  onClick={() => remove(m.id)}
                  disabled={pending}
                  aria-label={tCommon("delete")}
                  className="text-bone-dim transition-colors hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
