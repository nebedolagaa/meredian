"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Calculator } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { toDisplayWeight, unitLabel, type WeightUnit } from "@/lib/utils/units";
import { haptic } from "@/lib/utils/haptics";

// Plates and default bar weights expressed in each unit's own denominations.
const PLATES: Record<WeightUnit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};
const BARS: Record<WeightUnit, number[]> = {
  kg: [20, 15, 10, 0],
  lb: [45, 35, 0],
};

/** Greedily break the per-side load into the largest available plates. */
function platesPerSide(
  total: number,
  bar: number,
  available: number[],
): { plates: number[]; remainder: number } {
  let perSide = (total - bar) / 2;
  if (perSide <= 0) return { plates: [], remainder: 0 };
  const plates: number[] = [];
  for (const p of available) {
    while (perSide + 1e-6 >= p) {
      plates.push(p);
      perSide -= p;
    }
  }
  return { plates, remainder: Math.max(0, +perSide.toFixed(3)) };
}

/**
 * Barbell plate calculator. Opens a sheet pre-filled with the exercise's
 * working weight and shows the plates to load on each side of the bar.
 */
export function PlateCalculator({
  weightKg,
  unit,
}: {
  weightKg: number;
  unit: WeightUnit;
}) {
  const t = useTranslations("plates");
  const [open, setOpen] = useState(false);
  const bars = BARS[unit];
  const [bar, setBar] = useState(bars[0]);
  const [target, setTarget] = useState(() =>
    String(toDisplayWeight(weightKg, unit)),
  );

  const total = Number(target) || 0;
  const { plates, remainder } = useMemo(
    () => platesPerSide(total, bar, PLATES[unit]),
    [total, bar, unit],
  );

  // Group identical plates for a compact "2 × 20" style display.
  const grouped = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of plates) map.set(p, (map.get(p) ?? 0) + 1);
    return Array.from(map.entries());
  }, [plates]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setTarget(String(toDisplayWeight(weightKg, unit)));
          setOpen(true);
          haptic("tap");
        }}
        className="inline-flex items-center gap-1 rounded-lg border border-panel-border px-2 py-0.5 text-xs text-bone-dim transition-colors hover:text-bone"
      >
        <Calculator className="h-3.5 w-3.5" />
        {t("open")}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-steel" />
              {t("title")}
            </SheetTitle>
            <SheetDescription>{t("description")}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-bone-dim">{t("total")}</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="font-num tabular-nums"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-bone-dim">{t("barbell")}</label>
                <div className="flex flex-wrap gap-1.5">
                  {bars.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBar(b)}
                      className={
                        "rounded-lg border px-2 py-1 font-num text-xs tabular-nums transition-colors " +
                        (bar === b
                          ? "border-steel bg-steel/10 text-steel"
                          : "border-panel-border text-bone-dim hover:text-bone")
                      }
                    >
                      {b === 0 ? "—" : b}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-panel-border bg-graphite p-4">
              <p className="mb-2 text-xs text-bone-dim">{t("perSide")}</p>
              {grouped.length === 0 ? (
                <p className="text-sm text-bone-dim">{t("justBar")}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {grouped.map(([plate, count]) => (
                    <span
                      key={plate}
                      className="flex items-center gap-1 rounded-lg border border-steel/40 bg-steel/10 px-2.5 py-1 font-num text-sm tabular-nums text-bone"
                    >
                      <span className="text-steel">{count}×</span>
                      {plate}
                    </span>
                  ))}
                </div>
              )}
              {remainder > 0 && (
                <p className="mt-2 font-num text-xs tabular-nums text-clay">
                  {t("off", { weight: remainder, unit: unitLabel(unit) })}
                </p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
