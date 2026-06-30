import { cn } from "@/lib/utils";

export type DayStatus = "done" | "today" | "missed" | "planned" | "rest";

export interface ThreadDay {
  date: string; // ISO
  dayNumber: number;
  status: DayStatus;
}

function Dot({ status }: { status: DayStatus }) {
  // Fixed-height wrapper so every dot — including the small "rest" dot — is
  // vertically centred on the connector line (which sits at top-[7px]).
  const base = "relative z-10 flex h-3.5 items-center justify-center";
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

export function WeekThread({ days }: { days: ThreadDay[] }) {
  return (
    <div className="flex w-full items-start">
      {days.map((day, i) => (
        <div
          key={day.date}
          className="relative flex flex-1 flex-col items-center"
        >
          {/* Connector to the next dot, anchored at the dot's vertical center. */}
          {i < days.length - 1 && (
            <div
              className={cn(
                "absolute top-[7px] left-1/2 right-[-50%] border-t",
                day.status === "done"
                  ? "border-steel border-solid"
                  : "border-bone-dim border-dashed",
              )}
            />
          )}
          <Dot status={day.status} />
          <span
            className={cn(
              "mt-3 font-num text-xs tabular-nums",
              day.status === "today" ? "text-bone" : "text-bone-dim",
            )}
          >
            {String(day.dayNumber).padStart(2, "0")}
          </span>
        </div>
      ))}
    </div>
  );
}
