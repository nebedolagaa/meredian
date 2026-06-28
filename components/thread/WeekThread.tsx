import { cn } from "@/lib/utils";

export type DayStatus = "done" | "today" | "missed" | "planned" | "rest";

export interface ThreadDay {
  date: string; // ISO
  dayNumber: number;
  status: DayStatus;
}

function Dot({ status }: { status: DayStatus }) {
  const base = "relative z-10 flex items-center justify-center";
  switch (status) {
    case "done":
      return (
        <span className={base}>
          <span className="h-3.5 w-3.5 rounded-full bg-steel" />
        </span>
      );
    case "today":
      return (
        <span className={base}>
          <span className="h-3.5 w-3.5 rounded-full bg-bone ring-2 ring-steel ring-offset-2 ring-offset-graphite" />
        </span>
      );
    case "missed":
      return (
        <span className={base}>
          <span className="h-3.5 w-3.5 rounded-full border-2 border-clay" />
        </span>
      );
    case "planned":
      return (
        <span className={base}>
          <span className="h-3.5 w-3.5 rounded-full border-2 border-bone-dim" />
        </span>
      );
    case "rest":
      return (
        <span className={base}>
          <span className="h-1.5 w-1.5 rounded-full bg-bone-dim" />
        </span>
      );
  }
}

/** Connector segment between two dots. Solid steel if the left day was done. */
function Connector({ solid }: { solid: boolean }) {
  return (
    <div className="relative -mx-1 flex-1">
      <div
        className={cn(
          "absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t",
          solid ? "border-steel border-solid" : "border-bone-dim border-dashed",
        )}
      />
    </div>
  );
}

export function WeekThread({ days }: { days: ThreadDay[] }) {
  return (
    <div className="w-full">
      <div className="flex items-center">
        {days.map((day, i) => (
          <div key={day.date} className="flex flex-1 items-center">
            <Dot status={day.status} />
            {i < days.length - 1 && <Connector solid={day.status === "done"} />}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center">
        {days.map((day) => (
          <div
            key={day.date}
            className={cn(
              "flex-1 text-center font-num text-xs tabular-nums",
              day.status === "today" ? "text-bone" : "text-bone-dim",
            )}
          >
            {String(day.dayNumber).padStart(2, "0")}
          </div>
        ))}
      </div>
    </div>
  );
}
