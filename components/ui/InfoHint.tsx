"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tap-to-reveal explainer for jargon (BW, RPE, 1RM, ...). Deliberately
 * tap-triggered rather than hover-triggered — this is a mobile-first app,
 * and hover doesn't exist on a phone in a gym.
 */
export function InfoHint({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-label={text}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-bone-dim transition-colors hover:text-bone"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-10 mb-1.5 w-48 -translate-x-1/2 rounded-lg border border-panel-border bg-graphite p-2 text-[11px] font-normal leading-snug normal-case tracking-normal text-bone-dim shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}
