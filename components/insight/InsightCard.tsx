import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { InsightType } from "@/lib/utils/insights";

const colorByType: Record<InsightType, string> = {
  positive: "text-moss",
  negative: "text-clay",
  neutral: "text-steel",
};

export function InsightCard({
  type,
  message,
  icon: Icon,
}: {
  type: InsightType;
  message: string;
  icon: LucideIcon;
}) {
  const t = useTranslations("insight");
  const color = colorByType[type];
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-panel-border bg-graphite/40 p-4">
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", color)} strokeWidth={2} />
      <div className="flex flex-col gap-1">
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-wider",
            color,
          )}
        >
          {t("label")}
        </span>
        <p className="text-sm leading-snug text-bone">{message}</p>
      </div>
    </div>
  );
}
