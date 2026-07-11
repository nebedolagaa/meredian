"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Archive, ArchiveRestore } from "lucide-react";
import { setPlanArchived } from "@/app/actions/plans";
import { toast } from "@/lib/toast/store";

export function ArchivePlanButton({
  planId,
  archived,
}: {
  planId: string;
  archived: boolean;
}) {
  const t = useTranslations("plans");
  const tToast = useTranslations("toast");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const label = archived ? t("unarchive") : t("archive");

  function onClick() {
    startTransition(async () => {
      await setPlanArchived(planId, !archived);
      router.refresh();
      toast(archived ? tToast("planRestored") : tToast("planArchived"), {
        action: {
          label: tToast("undo"),
          onClick: () =>
            startTransition(async () => {
              await setPlanArchived(planId, archived);
              router.refresh();
            }),
        },
      });
    });
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={isPending}
      onClick={onClick}
      className="rounded-md p-2 text-bone-dim transition-colors hover:text-bone disabled:opacity-40"
    >
      {archived ? (
        <ArchiveRestore className="h-4 w-4" />
      ) : (
        <Archive className="h-4 w-4" />
      )}
    </button>
  );
}
