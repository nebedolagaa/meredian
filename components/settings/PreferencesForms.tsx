"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUnitPreference, updateRestSeconds } from "@/app/actions/profile";
import type { WeightUnit } from "@/lib/types/database";

export function UnitSegmented({ initial }: { initial: WeightUnit }) {
  const t = useTranslations("units");
  const router = useRouter();
  const [unit, setUnit] = useState<WeightUnit>(initial);
  const [, startTransition] = useTransition();

  const options: { value: WeightUnit; label: string }[] = [
    { value: "kg", label: t("kg") },
    { value: "lb", label: t("lb") },
  ];

  function select(value: WeightUnit) {
    setUnit(value);
    startTransition(async () => {
      await updateUnitPreference(value);
      router.refresh();
    });
  }

  return (
    <div className="inline-flex rounded-lg border border-panel-border bg-carbon p-1">
      {options.map((opt) => {
        const active = unit === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => select(opt.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active ? "bg-steel text-carbon" : "text-bone-dim hover:text-bone",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function RestSecondsField({ initial }: { initial: number }) {
  const t = useTranslations("restTimer");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [seconds, setSeconds] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await updateRestSeconds(seconds);
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="rest-seconds">{t("defaultRest")}</Label>
      <div className="flex items-center gap-2">
        <Input
          id="rest-seconds"
          type="number"
          inputMode="numeric"
          min={0}
          max={900}
          step={15}
          value={seconds}
          onChange={(e) => {
            setSaved(false);
            setSeconds(Number(e.target.value) || 0);
          }}
          className="font-num tabular-nums"
        />
        <span className="text-xs text-bone-dim">{t("seconds")}</span>
        <Button onClick={save} disabled={saving} variant="outline" size="sm">
          {saving
            ? tCommon("saving")
            : saved
              ? tCommon("saved")
              : tCommon("save")}
        </Button>
      </div>
    </div>
  );
}
