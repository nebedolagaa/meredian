"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDisplayName } from "@/app/actions/profile";

export function DisplayNameForm({ initial }: { initial: string }) {
  const router = useRouter();
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [name, setName] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setError(null);
    setSaved(false);
    setSaving(true);
    const result = await updateDisplayName(name);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="display-name">{t("displayName")}</Label>
      <div className="flex items-center gap-2">
        <Input
          id="display-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          placeholder={t("displayNamePlaceholder")}
        />
        <Button
          onClick={onSave}
          disabled={saving || name === initial}
          size="sm"
        >
          {saved ? (
            <Check className="h-4 w-4" />
          ) : saving ? (
            "…"
          ) : (
            tCommon("save")
          )}
        </Button>
      </div>
      {error && <p className="text-sm text-clay">{error}</p>}
    </div>
  );
}
