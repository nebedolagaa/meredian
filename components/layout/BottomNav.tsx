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
        className={cn(
          "flex flex-1 flex-col items-center gap-1 text-[10px] transition-colors",
          active ? "text-steel" : "text-bone-dim hover:text-bone",
        )}
      >
        <item.icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
        {t(item.labelKey)}
      </Link>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-panel-border bg-carbon/95 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-md items-center px-4">
        <div className="flex flex-1 items-center">
          {leftItems.map(renderLink)}
        </div>

        {/* Spacer that reserves the center slot for the floating add button */}
        <div className="w-16 shrink-0" aria-hidden />

        <div className="flex flex-1 items-center">
          {rightItems.map(renderLink)}
        </div>

        {/* Floating add-session button, perfectly centered over the nav */}
        <QuickAddTrigger
          plans={plans}
          className="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-steel text-carbon shadow-lg shadow-black/20 ring-4 ring-carbon transition-transform active:scale-95"
        />
      </div>
    </nav>
  );
}
