import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Icon + one-line copy, matching the Plans page's empty-state pattern. */
export function EmptyState({
  icon: Icon,
  message,
  className,
}: {
  icon: LucideIcon;
  message: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 py-8 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-steel/10 text-steel">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm text-bone-dim">{message}</p>
    </div>
  );
}
