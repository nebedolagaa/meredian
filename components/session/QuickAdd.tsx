"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarDays, Plus } from "lucide-react";
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
  const [planId, setPlanId] = useState<string>(plans[0]?.id ?? NO_PLAN);
  const [date, setDate] = useState<string>(defaultDate ?? todayISO());
  const [repeat, setRepeat] = useState(false);
  const [weeks, setWeeks] = useState(4);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultDate) setDate(defaultDate);
  }, [defaultDate]);

  async function onCreate() {
    setError(null);
    setPending(true);
    const resolvedPlanId = planId === NO_PLAN ? null : planId || null;
    const result = repeat
      ? await createRecurringSessions(resolvedPlanId, date, weeks)
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
              onCheckedChange={(c) => setRepeat(c === true)}
              aria-label={t("repeatWeekly")}
            />
            {t("repeatWeekly")}
          </label>

          {repeat && (
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
