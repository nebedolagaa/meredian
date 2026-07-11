import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium font-num tabular-nums",
  {
    variants: {
      variant: {
        default: "bg-graphite text-bone-dim border border-panel-border",
        steel: "bg-steel/15 text-steel",
        moss: "bg-moss/15 text-moss",
        clay: "bg-clay/15 text-clay",
        outline: "border border-panel-border text-bone-dim",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
