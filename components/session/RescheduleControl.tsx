"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarClock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { rescheduleSession } from "@/app/actions/sessions";

export function RescheduleControl({
  sessionId,
  initialDate,
  onDone,
}: {
  sessionId: string;
  initialDate: string;
  onDone: () => void;
}) {
  const t = useTranslations("session");
  const [date, setDate] = useState(initialDate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onReschedule() {
    setBusy(true);
    setError(null);
    const result = await rescheduleSession(sessionId, date);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-bone-dim">{t("reschedule")}</label>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="font-num tabular-nums"
        />
        <Button onClick={onReschedule} disabled={busy} variant="outline">
          <CalendarClock className="h-4 w-4" />
          {t("move")}
        </Button>
      </div>
      {error && <p className="text-sm text-clay">{error}</p>}
    </div>
  );
}
