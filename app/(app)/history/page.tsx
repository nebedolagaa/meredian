import Link from "next/link";
import { ChevronRight, Clock, History } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { getUserPreferences } from "@/lib/data/preferences";
import { totalVolume } from "@/lib/utils/volume";
import { formatVolume, unitLabel } from "@/lib/utils/units";
import { durationMinutes, formatDuration } from "@/lib/utils/duration";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
const MAX_LIMIT = 500;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string }>;
}) {
  const { limit: rawLimit } = await searchParams;
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(PAGE_SIZE, Number(rawLimit) || PAGE_SIZE),
  );
  const supabase = await createClient();
  const t = await getTranslations("history");
  const locale = await getLocale();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { unit } = await getUserPreferences(supabase, user.id);

  // One extra row tells us whether a "show more" link is needed.
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, scheduled_date, completed_at, notes, workout_plans(name)")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("scheduled_date", { ascending: false })
    .limit(limit + 1);

  const hasMore = (sessions ?? []).length > limit;
  const visible = (sessions ?? []).slice(0, limit);

  // started_at (migration 0019) is read separately so a missing column
  // doesn't break the page.
  const startedById = new Map<string, string | null>();
  const sessionIds = visible.map((s) => s.id);
  if (sessionIds.length > 0) {
    const { data: startedRows } = await supabase
      .from("workout_sessions")
      .select("id, started_at")
      .in("id", sessionIds);
    for (const row of startedRows ?? []) {
      startedById.set(row.id, row.started_at);
    }
  }

  const volumeBySession = new Map<string, number>();
  const setsBySession = new Map<string, number>();
  if (sessionIds.length > 0) {
    const { data: logs } = await supabase
      .from("session_logs")
      .select("session_id, actual_reps, actual_weight, completed")
      .in("session_id", sessionIds);
    for (const id of sessionIds) {
      const own = (logs ?? []).filter((l) => l.session_id === id);
      volumeBySession.set(id, totalVolume(own));
      setsBySession.set(id, own.filter((l) => l.completed).length);
    }
  }

  const dateFmt = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
  const monthFmt = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  });

  // Group by calendar month for scannable headers.
  const byMonth: { month: string; items: typeof visible }[] = [];
  for (const s of visible) {
    const month = monthFmt.format(new Date(`${s.scheduled_date}T00:00:00`));
    const last = byMonth[byMonth.length - 1];
    if (last && last.month === month) last.items.push(s);
    else byMonth.push({ month, items: [s] });
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        backHref="/analytics"
      />

      {visible.length === 0 ? (
        <Card className="py-10">
          <EmptyState icon={History} message={t("empty")} />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {byMonth.map((group) => (
            <div key={group.month} className="flex flex-col gap-3">
              <p className="mt-2 px-1 text-xs font-medium uppercase tracking-wide text-bone-dim first:mt-0">
                {group.month}
              </p>
              {group.items.map((s) => {
                const volume = volumeBySession.get(s.id) ?? 0;
                const sets = setsBySession.get(s.id) ?? 0;
                const duration = durationMinutes(
                  startedById.get(s.id) ?? null,
                  s.completed_at,
                );
                return (
                  <Card
                    key={s.id}
                    className="p-0 transition-colors hover:border-steel/40"
                  >
                    <Link
                      href={`/session/${s.id}`}
                      className="flex flex-col gap-2 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium text-bone">
                            {(s.workout_plans as { name: string } | null)
                              ?.name ?? t("session")}
                          </span>
                          <span className="flex items-center gap-1.5 font-num text-xs capitalize tabular-nums text-bone-dim">
                            {dateFmt.format(
                              new Date(`${s.scheduled_date}T00:00:00`),
                            )}
                            {duration != null && (
                              <span className="flex items-center gap-0.5 normal-case">
                                · <Clock className="h-3 w-3" />
                                {formatDuration(duration)}
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <div className="flex flex-col items-end">
                            <span className="font-num text-sm tabular-nums text-bone">
                              {formatVolume(volume, unit)} {unitLabel(unit)}
                            </span>
                            <span className="font-num text-[10px] tabular-nums text-bone-dim">
                              {t("setsCount", { count: sets })}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-bone-dim" />
                        </div>
                      </div>
                      {s.notes && (
                        <p className="line-clamp-2 rounded-lg bg-carbon px-3 py-2 text-xs text-bone-dim">
                          {s.notes}
                        </p>
                      )}
                    </Link>
                  </Card>
                );
              })}
            </div>
          ))}

          {hasMore && (
            <Button asChild variant="outline">
              <Link href={`/history?limit=${limit + PAGE_SIZE}`}>
                {t("showMore")}
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
