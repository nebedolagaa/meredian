import { Fragment } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const WEEKS = 26;
const MS_PER_DAY = 86400000;

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface Cell {
  iso: string;
  trained: boolean;
  future: boolean;
}

/**
 * GitHub-style consistency heatmap: weeks run left→right, weekdays top→bottom
 * (Monday at the top). Day labels sit on the left, month labels on top, and the
 * squares stretch to fill the container width.
 */
export async function ConsistencyHeatmap({ dates }: { dates: string[] }) {
  const t = await getTranslations("heatmap");
  const locale = await getLocale();
  const trained = new Set(dates);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = toLocalISO(today);

  // First column starts on the Monday (WEEKS-1) weeks before the current week.
  const dayOffset = (today.getDay() + 6) % 7; // Monday = 0
  const start = new Date(today);
  start.setDate(start.getDate() - dayOffset - (WEEKS - 1) * 7);

  // Build columns (weeks) of 7 days each, tracking where each month begins.
  const columns: { label: string; days: Cell[] }[] = [];
  const monthFmt = new Intl.DateTimeFormat(locale, { month: "short" });
  let prevMonth = new Date(start.getTime() - 7 * MS_PER_DAY).getMonth();
  for (let w = 0; w < WEEKS; w++) {
    const firstDay = new Date(start.getTime() + w * 7 * MS_PER_DAY);
    const month = firstDay.getMonth();
    const label = month !== prevMonth ? monthFmt.format(firstDay) : "";
    prevMonth = month;
    const days: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(start.getTime() + (w * 7 + d) * MS_PER_DAY);
      const iso = toLocalISO(cell);
      days.push({ iso, trained: trained.has(iso), future: iso > todayISO });
    }
    columns.push({ label, days });
  }

  // Weekday labels (Mon/Wed/Fri like GitHub). 2024-01-01 was a Monday.
  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const dayLabels = Array.from({ length: 7 }, (_, i) =>
    i % 2 === 0 ? dayFmt.format(new Date(2024, 0, 1 + i)) : "",
  );

  const gridStyle = {
    gridTemplateColumns: `auto repeat(${WEEKS}, minmax(0, 1fr))`,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <p className="text-xs text-bone-dim">{t("description")}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid items-center gap-[3px]" style={gridStyle}>
          {/* Month label row */}
          <div aria-hidden />
          {columns.map((c, i) => (
            <div
              key={`m${i}`}
              className="relative h-3 text-[9px] leading-3 text-bone-dim"
            >
              {c.label && (
                <span className="absolute left-0 top-0 whitespace-nowrap">
                  {c.label}
                </span>
              )}
            </div>
          ))}

          {/* One row per weekday */}
          {dayLabels.map((label, d) => (
            <Fragment key={`row${d}`}>
              <div className="pr-1.5 text-right text-[9px] leading-none text-bone-dim">
                {label}
              </div>
              {columns.map((c, i) => {
                const cell = c.days[d];
                return (
                  <span
                    key={`c${d}-${i}`}
                    title={cell.iso}
                    className={cn(
                      "aspect-square w-full rounded-[2px]",
                      cell.future
                        ? "bg-transparent"
                        : cell.trained
                          ? "bg-moss"
                          : "border border-panel-border bg-carbon",
                    )}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>

        <div className="flex items-center justify-between text-[10px] text-bone-dim">
          <span className="font-num tabular-nums">
            {t("totalDays", { count: trained.size })}
          </span>
          <span className="flex items-center gap-1.5">
            {t("less")}
            <span className="h-3 w-3 rounded-[2px] border border-panel-border bg-carbon" />
            <span className="h-3 w-3 rounded-[2px] bg-moss/40" />
            <span className="h-3 w-3 rounded-[2px] bg-moss" />
            {t("more")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
