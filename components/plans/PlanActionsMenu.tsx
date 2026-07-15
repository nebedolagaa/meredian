"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Archive,
  ArchiveRestore,
  Copy,
  Link2,
  Link2Off,
  MoreHorizontal,
  Star,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  deletePlan,
  duplicatePlan,
  setPlanArchived,
  setPlanIsTemplate,
  setPlanShared,
} from "@/app/actions/plans";
import { toast } from "@/lib/toast/store";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Collapses the per-card action strip (template / duplicate / archive /
 * delete) into a single "⋯" button with a bottom sheet — less visual noise
 * and no destructive action one accidental tap away.
 */
export function PlanActionsMenu({
  planId,
  planName,
  isTemplate,
  archived,
  shareToken,
}: {
  planId: string;
  planName: string;
  isTemplate: boolean;
  archived: boolean;
  shareToken?: string | null;
}) {
  const t = useTranslations("plans");
  const tCommon = useTranslations("common");
  const tToast = useTranslations("toast");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [token, setToken] = useState(shareToken ?? null);
  const [isPending, startTransition] = useTransition();

  const run = (fn: () => Promise<void>) => {
    startTransition(async () => {
      await fn();
      setOpen(false);
      router.refresh();
    });
  };

  async function copyShareUrl(shareUrl: string) {
    const payload = { title: planName, url: shareUrl };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
    } catch {
      // Share sheet dismissed — fall through to the clipboard.
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast(tToast("linkCopied"));
    } catch {
      toast(shareUrl);
    }
  }

  const rowClass =
    "flex w-full items-center gap-3 rounded-xl border border-panel-border bg-carbon p-3 text-left text-sm text-bone transition-colors hover:border-steel/40 disabled:opacity-40";

  return (
    <>
      <button
        type="button"
        aria-label={t("planActions")}
        title={t("planActions")}
        onClick={() => setOpen(true)}
        className="rounded-md p-2 text-bone-dim transition-colors hover:text-bone"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle className="truncate">{planName}</SheetTitle>
          </SheetHeader>

          <div className="mt-5 flex flex-col gap-2">
            {!archived && (
              <>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    run(async () => {
                      await setPlanIsTemplate(planId, !isTemplate);
                      toast(
                        isTemplate
                          ? tToast("templateRemoved")
                          : tToast("templateSaved"),
                      );
                    })
                  }
                  className={rowClass}
                >
                  <Star
                    className={cn(
                      "h-4 w-4 text-bone-dim",
                      isTemplate && "fill-steel text-steel",
                    )}
                  />
                  {isTemplate ? t("removeFromTemplates") : t("saveAsTemplate")}
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    run(async () => {
                      const result = await duplicatePlan(planId);
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
                    })
                  }
                  className={rowClass}
                >
                  <Copy className="h-4 w-4 text-bone-dim" />
                  {t("duplicate")}
                </button>

                {token ? (
                  <>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        copyShareUrl(`${window.location.origin}/share/${token}`)
                      }
                      className={rowClass}
                    >
                      <Link2 className="h-4 w-4 text-steel" />
                      {t("copyShareLink")}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        run(async () => {
                          await setPlanShared(planId, false);
                          setToken(null);
                          toast(tToast("shareDisabled"));
                        })
                      }
                      className={rowClass}
                    >
                      <Link2Off className="h-4 w-4 text-bone-dim" />
                      {t("disableShareLink")}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await setPlanShared(planId, true);
                        if (result.token) {
                          setToken(result.token);
                          await copyShareUrl(
                            `${window.location.origin}/share/${result.token}`,
                          );
                          router.refresh();
                        } else if (result.error) {
                          toast(result.error);
                        }
                      })
                    }
                    className={rowClass}
                  >
                    <Link2 className="h-4 w-4 text-bone-dim" />
                    {t("sharePlanLink")}
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                run(async () => {
                  await setPlanArchived(planId, !archived);
                  toast(
                    archived ? tToast("planRestored") : tToast("planArchived"),
                    {
                      action: {
                        label: tToast("undo"),
                        onClick: () =>
                          startTransition(async () => {
                            await setPlanArchived(planId, archived);
                            router.refresh();
                          }),
                      },
                    },
                  );
                })
              }
              className={rowClass}
            >
              {archived ? (
                <ArchiveRestore className="h-4 w-4 text-bone-dim" />
              ) : (
                <Archive className="h-4 w-4 text-bone-dim" />
              )}
              {archived ? t("unarchive") : t("archive")}
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => setConfirmDelete(true)}
              className={cn(rowClass, "text-clay hover:border-clay/40")}
            >
              <Trash2 className="h-4 w-4" />
              {t("delete")}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("delete")}
        description={t("deleteConfirm")}
        confirmLabel={tCommon("delete")}
        cancelLabel={tCommon("cancel")}
        onConfirm={() =>
          startTransition(async () => {
            await deletePlan(planId);
            setConfirmDelete(false);
            setOpen(false);
            router.refresh();
            toast(tToast("planDeleted"));
          })
        }
        pending={isPending}
      />
    </>
  );
}
