"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Copy } from "lucide-react";
import { duplicatePlan, deletePlan } from "@/app/actions/plans";
import { toast } from "@/lib/toast/store";

export function DuplicatePlanButton({ planId }: { planId: string }) {
  const t = useTranslations("plans");
  const tToast = useTranslations("toast");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await duplicatePlan(planId);
      router.refresh();
      if (!result.error && result.id) {
        const newId = result.id;
        toast(tToast("planDuplicated"), {
          action: {
            label: tToast("undo"),
            onClick: () =>
              startTransition(async () => {
                await deletePlan(newId);
                router.refresh();
              }),
          },
        });
      }
    });
  }

  return (
    <button
      type="button"
      aria-label={t("duplicate")}
      title={t("duplicate")}
      disabled={isPending}
      onClick={onClick}
      className="rounded-md p-2 text-bone-dim transition-colors hover:text-bone disabled:opacity-40"
    >
      <Copy className="h-4 w-4" />
    </button>
  );
}
