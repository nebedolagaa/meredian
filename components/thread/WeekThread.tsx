"use client";

import Link from "next/link";
import { LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type DayStatus = "done" | "today" | "missed" | "planned" | "rest";

export interface ThreadDay {
  date: string; // ISO
  dayNumber: number;
  status: DayStatus;
  /** Optional navigation target — makes the whole day column tappable. */
  href?: string;
  /** Accessible label, e.g. localized date + status. */
  label?: string;
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
          {/* Soft expanding halo draws the eye to the current day. */}
          <span className="absolute h-3.5 w-3.5 animate-ring-pulse rounded-full bg-steel/40 motion-reduce:hidden" />
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

function DayCell({ day, index }: { day: ThreadDay; index: number }) {
  const reduced = useReducedMotion();
  const content = (
    <>
      <m.span
        initial={reduced ? false : { scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 24,
          delay: index * 0.05,
        }}
        className="flex"
      >
        <Dot status={day.status} />
      </m.span>
      <span
        className={cn(
          "mt-3 font-num text-xs tabular-nums",
          day.status === "today" ? "text-bone" : "text-bone-dim",
        )}
      >
        {String(day.dayNumber).padStart(2, "0")}
      </span>
    </>
  );

  const cellClass =
    "relative flex w-full flex-col items-center rounded-lg py-1.5";

  if (day.href) {
    return (
      <Link
        href={day.href}
        aria-label={day.label ?? day.date}
        className={cn(
          cellClass,
          "transition-[background-color,transform] hover:bg-carbon/60 active:scale-95",
        )}
      >
        {content}
      </Link>
    );
  }
  return <div className={cellClass}>{content}</div>;
}

export function WeekThread({ days }: { days: ThreadDay[] }) {
  const reduced = useReducedMotion();
  return (
    <LazyMotion features={domAnimation} strict>
      <div className="flex w-full items-start">
        {days.map((day, i) => (
          <div
            key={day.date}
            className="relative flex flex-1 flex-col items-center"
          >
            {/* Connector to the next dot, anchored at the dot's vertical
                center (cell top padding 6px + half dot height 7px). */}
            {i < days.length - 1 && (
              <m.div
                initial={reduced ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: 0.25,
                  delay: i * 0.05,
                  ease: "easeOut",
                }}
                style={{ originX: 0 }}
                className={cn(
                  "absolute top-[13px] left-1/2 right-[-50%] border-t",
                  day.status === "done"
                    ? "border-steel border-solid"
                    : "border-bone-dim border-dashed",
                )}
              />
            )}
            <DayCell day={day} index={i} />
          </div>
        ))}
      </div>
    </LazyMotion>
  );
}
