"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { deletePlan } from "@/app/actions/plans";
import { toast } from "@/lib/toast/store";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeletePlanButton({ planId }: { planId: string }) {
  const t = useTranslations("plans");
  const tCommon = useTranslations("common");
  const tToast = useTranslations("toast");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      await deletePlan(planId);
      setOpen(false);
      router.refresh();
      toast(tToast("planDeleted"));
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label={t("delete")}
        title={t("delete")}
        onClick={() => setOpen(true)}
        className="rounded-md p-2 text-bone-dim transition-colors hover:text-clay"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("delete")}
        description={t("deleteConfirm")}
        confirmLabel={tCommon("delete")}
        cancelLabel={tCommon("cancel")}
        onConfirm={onDelete}
        pending={isPending}
      />
    </>
  );
}
