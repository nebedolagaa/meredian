import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Theme-agnostic shimmer placeholder used by route-level loading states. */
export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-bone/10", className)}
      {...props}
    />
  );
}
