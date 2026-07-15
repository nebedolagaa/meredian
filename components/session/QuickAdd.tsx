"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSession, createRecurringSessions } from "@/app/actions/sessions";
import { todayISO } from "@/lib/utils/dates";
import type { WorkoutPlan } from "@/lib/types/database";

const NO_PLAN = "__none__";
const MAX_REPEAT_WEEKS = 12;

export function QuickAddSheet({
  open,
  onOpenChange,
  plans,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: WorkoutPlan[];
  defaultDate?: string;
}) {
  const router = useRouter();
  const t = useTranslations("quickAdd");
  const locale = useLocale();
  const [planId, setPlanId] = useState<string>(plans[0]?.id ?? NO_PLAN);
  const [date, setDate] = useState<string>(defaultDate ?? todayISO());
  const [repeat, setRepeat] = useState(false);
  const [weeks, setWeeks] = useState(4);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultDate) setDate(defaultDate);
  }, [defaultDate]);

  // Mon-first weekday of the chosen start date (0 = Monday … 6 = Sunday).
  const startWeekday = useMemo(() => {
    const d = new Date(`${date}T00:00:00`);
    return Number.isNaN(d.getTime()) ? 0 : (d.getDay() + 6) % 7;
  }, [date]);

  // Localised Mon-first weekday chips. 2024-01-01 is a Monday.
  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(2024, 0, 1 + i)),
    );
  }, [locale]);

  function onRepeatChange(next: boolean) {
    setRepeat(next);
    // Default the pattern to the start date's weekday when repeat turns on.
    if (next) setWeekdays((prev) => (prev.length > 0 ? prev : [startWeekday]));
  }

  function toggleWeekday(d: number) {
    setWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );
  }

  async function onCreate() {
    setError(null);
    setPending(true);
    const resolvedPlanId = planId === NO_PLAN ? null : planId || null;
    const result = repeat
      ? await createRecurringSessions(
          resolvedPlanId,
          date,
          weeks,
          weekdays.length > 0 ? weekdays : undefined,
        )
      : await createSession(resolvedPlanId, date);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onOpenChange(false);
    if (!repeat && result.id) router.push(`/session/${result.id}`);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{t("scheduleSession")}</SheetTitle>
          <SheetDescription>{t("scheduleDesc")}</SheetDescription>
        </SheetHeader>

        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>{t("plan")}</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectPlan")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PLAN}>{t("noPlan")}</SelectItem>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {plans.length === 0 && (
              <p className="text-xs text-bone-dim">{t("noPlans")}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qa-date">{t("date")}</Label>
            <Input
              id="qa-date"
              type="date"
              value={date}
              className="font-num"
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm text-bone">
            <Checkbox
              checked={repeat}
              onCheckedChange={(c) => onRepeatChange(c === true)}
              aria-label={t("repeatWeekly")}
            />
            {t("repeatWeekly")}
          </label>

          {repeat && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>{t("repeatDays")}</Label>
                <div className="grid grid-cols-7 gap-1">
                  {weekdayLabels.map((label, d) => (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={weekdays.includes(d)}
                      onClick={() => toggleWeekday(d)}
                      className={cn(
                        "rounded-lg border py-2 text-center text-xs capitalize transition-colors",
                        weekdays.includes(d)
                          ? "border-steel bg-steel/15 text-bone"
                          : "border-panel-border text-bone-dim hover:text-bone",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="qa-weeks">{t("repeatWeeks")}</Label>
                <Input
                  id="qa-weeks"
                  type="number"
                  inputMode="numeric"
                  min={2}
                  max={MAX_REPEAT_WEEKS}
                  value={weeks}
                  className="font-num"
                  onChange={(e) =>
                    setWeeks(
                      Math.min(
                        MAX_REPEAT_WEEKS,
                        Math.max(2, Number(e.target.value) || 2),
                      ),
                    )
                  }
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-clay">{error}</p>}

          <Button onClick={onCreate} disabled={pending}>
            <CalendarDays className="h-4 w-4" />
            {pending ? t("scheduling") : t("addSession")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function QuickAddTrigger({
  plans,
  className,
  label,
}: {
  plans: WorkoutPlan[];
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("calendar");
  return (
    <>
      <button
        aria-label={t("addSession")}
        onClick={() => setOpen(true)}
        className={className}
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
        {label && <span>{label}</span>}
      </button>
      <QuickAddSheet open={open} onOpenChange={setOpen} plans={plans} />
    </>
  );
}
