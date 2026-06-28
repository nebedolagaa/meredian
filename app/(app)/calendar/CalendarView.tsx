"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { QuickAddSheet } from "@/components/session/QuickAdd";
import {
  monthGrid,
  toISODate,
  todayISO,
  startOfMonth,
} from "@/lib/utils/dates";
import type { WorkoutPlan } from "@/lib/types/database";

interface CalSession {
  id: string;
  scheduled_date: string;
  status: string;
  plan_id: string | null;
  workout_plans: { name: string } | null;
}

function dotClass(status: string, isPast: boolean): string {
  if (status === "completed") return "bg-steel";
  if (status === "skipped" || (isPast && status !== "completed"))
    return "bg-clay";
  return "bg-bone-dim";
}

export function CalendarView({ plans }: { plans: WorkoutPlan[] }) {
  const router = useRouter();
  const t = useTranslations("calendar");
  const tStatus = useTranslations("status");
  const locale = useLocale();
  const supabase = useMemo(() => createClient(), []);
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [sessions, setSessions] = useState<CalSession[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<string | undefined>();

  const grid = useMemo(() => monthGrid(cursor), [cursor]);
  const today = todayISO();

  // Localised month + year title (e.g. "June 2026", "июнь 2026").
  const monthTitle = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
      }).format(cursor),
    [locale, cursor],
  );

  // Localised weekday headers, Monday-first (matches the grid).
  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    // 2024-01-01 is a Monday.
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(2024, 0, 1 + i)),
    );
  }, [locale]);

  // Localised full date for the selected day (parsed in local time).
  const selectedLabel = useMemo(() => {
    if (!selected) return "";
    const [y, m, d] = selected.split("-").map(Number);
    return new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(y, m - 1, d));
  }, [locale, selected]);

  const load = useCallback(async () => {
    const from = toISODate(grid[0]);
    const to = toISODate(grid[grid.length - 1]);
    const { data } = await supabase
      .from("workout_sessions")
      .select("id, scheduled_date, status, plan_id, workout_plans(name)")
      .gte("scheduled_date", from)
      .lte("scheduled_date", to);
    setSessions((data ?? []) as unknown as CalSession[]);
  }, [supabase, grid]);

  useEffect(() => {
    load();
  }, [load]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalSession>();
    for (const s of sessions) map.set(s.scheduled_date, s);
    return map;
  }, [sessions]);

  const selectedSession = selected ? byDate.get(selected) : undefined;

  function shiftMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Month nav */}
      <div className="flex items-center justify-between pt-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-bone">
          {t("title")}
        </h1>
        <div className="flex items-center gap-1">
          <button
            aria-label={t("prevMonth")}
            onClick={() => shiftMonth(-1)}
            className="rounded-md p-2 text-bone-dim hover:text-bone"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="w-28 text-center font-num text-sm tabular-nums text-bone">
            {monthTitle}
          </span>
          <button
            aria-label={t("nextMonth")}
            onClick={() => shiftMonth(1)}
            className="rounded-md p-2 text-bone-dim hover:text-bone"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels.map((d, i) => (
          <div
            key={i}
            className="text-center font-num text-[10px] uppercase text-bone-dim"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {grid.map((d) => {
          const iso = toISODate(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const session = byDate.get(iso);
          const isToday = iso === today;
          const isPast = iso < today;
          return (
            <button
              key={iso}
              onClick={() => setSelected(iso)}
              className={cn(
                "flex aspect-square flex-col items-center justify-start gap-1 rounded-lg border border-transparent p-1 transition-colors",
                inMonth ? "text-bone" : "text-bone-dim/40",
                isToday && "border-steel",
                "hover:border-panel-border",
              )}
            >
              <span className="font-num text-xs tabular-nums">
                {d.getDate()}
              </span>
              {session && (
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    dotClass(session.status, isPast),
                  )}
                />
              )}
              {session?.workout_plans?.name && inMonth && (
                <span className="line-clamp-1 w-full text-center text-[8px] leading-tight text-bone-dim">
                  {session.workout_plans.name}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-2 text-[10px] text-bone-dim">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-steel" /> {t("done")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-clay" /> {t("missed")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-bone-dim" />{" "}
          {t("planned")}
        </span>
      </div>

      {/* FAB */}
      <button
        aria-label={t("addSession")}
        onClick={() => {
          setQuickAddDate(today);
          setQuickAddOpen(true);
        }}
        className="fixed bottom-20 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-steel text-carbon shadow-lg transition-transform active:scale-95"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <QuickAddSheet
        open={quickAddOpen}
        onOpenChange={(o) => {
          setQuickAddOpen(o);
          if (!o) load();
        }}
        plans={plans}
        defaultDate={quickAddDate}
      />

      {/* Day detail */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle className="font-num tabular-nums">
              {selectedLabel}
            </SheetTitle>
            <SheetDescription>
              {selectedSession ? t("scheduledSession") : t("noSessionDay")}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 flex flex-col gap-4">
            {selectedSession ? (
              <>
                <div className="flex items-center justify-between rounded-lg border border-panel-border bg-carbon p-3">
                  <span className="text-sm text-bone">
                    {selectedSession.workout_plans?.name ?? t("session")}
                  </span>
                  <Badge
                    variant={
                      selectedSession.status === "completed" ? "moss" : "steel"
                    }
                  >
                    {tStatus(selectedSession.status)}
                  </Badge>
                </div>
                <Button
                  onClick={() => router.push(`/session/${selectedSession.id}`)}
                >
                  {t("openSession")}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  setQuickAddDate(selected ?? today);
                  setSelected(null);
                  setQuickAddOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> {t("addSession")}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
