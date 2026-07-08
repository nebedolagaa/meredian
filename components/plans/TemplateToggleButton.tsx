"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { setPlanIsTemplate } from "@/app/actions/plans";
import { toast } from "@/lib/toast/store";

export function TemplateToggleButton({
  planId,
  isTemplate,
}: {
  planId: string;
  isTemplate: boolean;
}) {
  const t = useTranslations("plans");
  const tToast = useTranslations("toast");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const label = isTemplate ? t("removeFromTemplates") : t("saveAsTemplate");

  function onClick() {
    startTransition(async () => {
      await setPlanIsTemplate(planId, !isTemplate);
      router.refresh();
      toast(
        isTemplate ? tToast("templateRemoved") : tToast("templateSaved"),
      );
    });
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isTemplate}
      title={label}
      disabled={isPending}
      onClick={onClick}
      className="rounded-md p-2 text-bone-dim transition-colors hover:text-bone disabled:opacity-40"
    >
      <Star
        className={cn("h-4 w-4", isTemplate && "fill-steel text-steel")}
      />
    </button>
  );
}
