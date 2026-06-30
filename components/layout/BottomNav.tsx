"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarDays, BarChart3, Dumbbell, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickAddTrigger } from "@/components/session/QuickAdd";
import type { WorkoutPlan } from "@/lib/types/database";

type NavItem = {
  href: string;
  labelKey: "today" | "analytics" | "plans" | "settings";
  icon: typeof CalendarDays;
  match: string[];
};

const leftItems: NavItem[] = [
  {
    href: "/dashboard",
    labelKey: "today",
    icon: CalendarDays,
    match: ["/dashboard", "/calendar"],
  },
  {
    href: "/analytics",
    labelKey: "analytics",
    icon: BarChart3,
    match: ["/analytics"],
  },
];

const rightItems: NavItem[] = [
  {
    href: "/plans",
    labelKey: "plans",
    icon: Dumbbell,
    match: ["/plans"],
  },
  {
    href: "/settings",
    labelKey: "settings",
    icon: Settings,
    match: ["/settings"],
  },
];

export function BottomNav({ plans }: { plans: WorkoutPlan[] }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const isActive = (match: string[]) =>
    match.some((m) => pathname === m || pathname.startsWith(`${m}/`));

  const renderLink = (item: NavItem) => {
    const active = isActive(item.match);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-1 flex-col items-center gap-1 text-[10px] transition-colors",
          active ? "text-steel" : "text-bone-dim hover:text-bone",
        )}
      >
        <item.icon
          className={cn(
            "h-5 w-5 transition-transform duration-200",
            active && "scale-110",
          )}
          strokeWidth={active ? 2.5 : 2}
        />
        {t(item.labelKey)}
      </Link>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-panel-border bg-carbon/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-md items-center px-2">
        <div className="flex flex-1 items-center">
          {leftItems.map(renderLink)}
        </div>

        {/* Add-session button, inline in the center of the nav */}
        <QuickAddTrigger
          plans={plans}
          label={t("add")}
          className="flex flex-1 flex-col items-center gap-1 text-[10px] text-steel transition-colors hover:text-bone active:scale-95"
        />

        <div className="flex flex-1 items-center">
          {rightItems.map(renderLink)}
        </div>
      </div>
    </nav>
  );
}
