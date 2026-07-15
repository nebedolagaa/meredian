"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ChevronLeft, ChevronRight, Plus, Check, X, Clock } from "lucide-react";
import { LazyMotion, domAnimation, m } from "framer-motion";
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
import { RescheduleControl } from "@/components/session/RescheduleControl";
import {
  monthGrid,
  toISODate,
  todayISO,
  startOfMonth,
} from "@/lib/utils/dates";
import { haptic } from "@/lib/utils/haptics";
import type { WorkoutPlan } from "@/lib/types/database";

interface CalSession {
  id: string;
  scheduled_date: string;
  status: string;
  plan_id: string | null;
  workout_plans: { name: string } | null;
}

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

function toCompactDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

function nextIsoDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + 1);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * Status glyph for a day cell — shape + colour (not colour alone, so the
 * statuses stay distinguishable for colour-blind users) matching the legend.
 */
function StatusGlyph({ status, isPast }: { status: string; isPast: boolean }) {
  if (status === "completed")
    return <Check className="h-3 w-3 text-steel" strokeWidth={3} />;
  if (status === "skipped" || (isPast && status !== "completed"))
    return <X className="h-3 w-3 text-clay" strokeWidth={3} />;
  return <Clock className="h-3 w-3 text-bone-dim" strokeWidth={2.5} />;
}

export function CalendarView({ plans }: { plans: WorkoutPlan[] }) {
  const router = useRouter();
  const t = useTranslations("calendar");
  const tStatus = useTranslations("status");
  const locale = useLocale();
  const supabase = useMemo(() => createClient(), []);
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [sessions, setSessions] = useState<CalSession[]>([]);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    const from = toISODate(grid[0]);
    const to = toISODate(grid[grid.length - 1]);
    const { data } = await supabase
      .from("workout_sessions")
      .select("id, scheduled_date, status, plan_id, workout_plans(name)")
      .gte("scheduled_date", from)
      .lte("scheduled_date", to);
    setSessions((data ?? []) as unknown as CalSession[]);
    setLoading(false);
  }, [supabase, grid]);

  useEffect(() => {
    load();
  }, [load]);

  // A day can hold several sessions — keep them all.
  const byDate = useMemo(() => {
    const map = new Map<string, CalSession[]>();
    for (const s of sessions) {
      const list = map.get(s.scheduled_date);
      if (list) list.push(s);
      else map.set(s.scheduled_date, [s]);
    }
    return map;
  }, [sessions]);

  const selectedSessions = (selected ? byDate.get(selected) : undefined) ?? [];
  const isCurrentMonth =
    cursor.getMonth() === new Date().getMonth() &&
    cursor.getFullYear() === new Date().getFullYear();

  function shiftMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  function exportSessionIcs(session: CalSession) {
    const planName = session.workout_plans?.name ?? t("session");
    const title = t("calendarEventTitle", { plan: planName });
    const description = t("calendarEventDescription");
    const start = toCompactDate(session.scheduled_date);
    const end = toCompactDate(nextIsoDate(session.scheduled_date));
    const stamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Meredian//Workout Calendar//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${session.id}@meredian.fit`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${escapeIcsText(title)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ];
    const blob = new Blob([lines.join("\r\n")], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meredian-workout-${session.scheduled_date}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function openGoogleCalendar(session: CalSession) {
    const planName = session.workout_plans?.name ?? t("session");
    const title = t("calendarEventTitle", { plan: planName });
    const details = t("calendarEventDescription");
    const start = toCompactDate(session.scheduled_date);
    const end = toCompactDate(nextIsoDate(session.scheduled_date));
    const url =
      "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      `&text=${encodeURIComponent(title)}` +
      `&dates=${start}/${end}` +
      `&details=${encodeURIComponent(details)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Month nav */}
      <div className="flex items-center justify-between pt-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-bone">
          {t("title")}
        </h1>
        <div className="flex items-center gap-1">
          {!isCurrentMonth && (
            <button
              onClick={() => setCursor(startOfMonth(new Date()))}
              className="rounded-lg border border-panel-border px-2.5 py-1 text-xs text-bone-dim transition-colors hover:text-bone"
            >
              {t("today")}
            </button>
          )}
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

      {/* Grid — swipe horizontally to change months */}
      <LazyMotion features={domAnimation} strict>
        <m.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={(_, info) => {
            if (info.offset.x < -60) shiftMonth(1);
            else if (info.offset.x > 60) shiftMonth(-1);
          }}
          className={cn(
            "grid touch-pan-y grid-cols-7 gap-1 transition-opacity",
            loading && "opacity-50",
          )}
        >
          {grid.map((d) => {
            const iso = toISODate(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const daySessions = byDate.get(iso) ?? [];
            const isToday = iso === today;
            const isPast = iso < today;
            return (
              <button
                key={iso}
                onClick={() => setSelected(iso)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-start gap-0.5 rounded-lg border border-transparent p-1 transition-colors",
                  inMonth ? "text-bone" : "text-bone-dim/40",
                  isToday && "border-steel",
                  "hover:border-panel-border",
                )}
              >
                <span className="font-num text-xs tabular-nums">
                  {d.getDate()}
                </span>
                {daySessions.length > 0 && (
                  <span className="flex items-center justify-center gap-0.5">
                    {daySessions.slice(0, 3).map((s) => (
                      <StatusGlyph key={s.id} status={s.status} isPast={isPast} />
                    ))}
                    {daySessions.length > 3 && (
                      <span className="font-num text-[8px] tabular-nums text-bone-dim">
                        +{daySessions.length - 3}
                      </span>
                    )}
                  </span>
                )}
                {daySessions[0]?.workout_plans?.name && inMonth && (
                  <span className="line-clamp-1 w-full text-center text-[8px] leading-tight text-bone-dim">
                    {daySessions[0].workout_plans.name}
                  </span>
                )}
              </button>
            );
          })}
        </m.div>
      </LazyMotion>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-2 text-[10px] text-bone-dim">
        <span className="flex items-center gap-1.5">
          <Check className="h-3 w-3 text-steel" /> {t("done")}
        </span>
        <span className="flex items-center gap-1.5">
          <X className="h-3 w-3 text-clay" /> {t("missed")}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-bone-dim" /> {t("planned")}
        </span>
      </div>

      {/* FAB */}
      <button
        aria-label={t("addSession")}
        data-tour="calendar-add"
        onClick={() => {
          haptic("tap");
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
              {selectedSessions.length > 0
                ? t("scheduledSession")
                : t("noSessionDay")}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 flex max-h-[60dvh] flex-col gap-4 overflow-y-auto">
            {selectedSessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-col gap-3 rounded-xl border border-panel-border bg-carbon p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-bone">
                    {session.workout_plans?.name ?? t("session")}
                  </span>
                  <Badge
                    variant={session.status === "completed" ? "moss" : "steel"}
                  >
                    {tStatus(session.status)}
                  </Badge>
                </div>
                <Button onClick={() => router.push(`/session/${session.id}`)}>
                  {t("openSession")}
                </Button>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    onClick={() => exportSessionIcs(session)}
                  >
                    <AppleLogo className="h-5 w-5 shrink-0" />
                    {t("addToCalendar")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openGoogleCalendar(session)}
                  >
                    <GoogleLogo className="h-5 w-5 shrink-0" />
                    {t("addToGoogleCalendar")}
                  </Button>
                </div>
                <RescheduleControl
                  sessionId={session.id}
                  initialDate={session.scheduled_date}
                  onDone={() => {
                    setSelected(null);
                    load();
                  }}
                />
              </div>
            ))}

            <Button
              variant={selectedSessions.length > 0 ? "outline" : "default"}
              onClick={() => {
                setQuickAddDate(selected ?? today);
                setSelected(null);
                setQuickAddOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> {t("addSession")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
