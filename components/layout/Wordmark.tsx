import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  showTagline = false,
}: {
  className?: string;
  showTagline?: boolean;
}) {
  const t = useTranslations("wordmark");
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="block h-3 w-3 rounded-full border-2 border-steel"
        />
        <span className="font-display text-2xl font-bold tracking-tight text-bone">
          Meredian
        </span>
      </div>
      {showTagline && (
        <span className="text-xs text-bone-dim">{t("tagline")}</span>
      )}
    </div>
  );
}
