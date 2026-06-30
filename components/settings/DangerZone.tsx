"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteAccount } from "@/app/actions/account";

export function DangerZone() {
  const t = useTranslations("account");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAccount();
      if (result?.error) {
        setError(result.error);
        setOpen(false);
      }
      // On success the action redirects to /login.
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
      <Button
        type="button"
        variant="destructive"
        onClick={() => setOpen(true)}
        className="self-start"
      >
        {t("deleteAccount")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("deleteAccount")}
        description={t("deleteConfirm")}
        confirmLabel={t("deleteConfirmCta")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleDelete}
        pending={pending}
      />
    </div>
  );
}
