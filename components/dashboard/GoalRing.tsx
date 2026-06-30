"use client";

import { useEffect, useState } from "react";

/**
 * Animated progress ring for the weekly session goal. Fills on mount and turns
 * moss once the goal is reached.
 */
export function GoalRing({
  value,
  goal,
  label,
}: {
  value: number;
  goal: number;
  label: string;
}) {
  const safeGoal = Math.max(1, goal);
  const pct = Math.min(1, value / safeGoal);
  const reached = value >= safeGoal;

  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  // Animate from empty to the target offset after mount.
  const [offset, setOffset] = useState(circ);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOffset(circ * (1 - pct)));
    return () => cancelAnimationFrame(id);
  }, [circ, pct]);

  return (
    <div
      role="img"
      aria-label={label}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-panel-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className={reached ? "stroke-moss" : "stroke-steel"}
          style={{
            transition: "stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-num text-sm font-semibold leading-none tabular-nums text-bone">
          {value}
        </span>
        <span className="font-num text-[9px] leading-none tabular-nums text-bone-dim">
          /{safeGoal}
        </span>
      </div>
    </div>
  );
}
