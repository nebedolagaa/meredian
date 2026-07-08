"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dumbbell, ChevronRight, Star } from "lucide-react";
import { createPlanFromTemplate } from "@/app/actions/templates";
import { duplicatePlan } from "@/app/actions/plans";
import { createClient } from "@/lib/supabase/client";

const TEMPLATE_IDS = ["full_body", "upper", "lower", "push", "pull"] as const;

interface MyTemplate {
  id: string;
  name: string;
}

export function TemplatePicker() {
  return <TemplatePickerContent />;
}

export function TemplatePickerContent({
  hideHeader = false,
}: {
  hideHeader?: boolean;
}) {
  const t = useTranslations("templates");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [myTemplates, setMyTemplates] = useState<MyTemplate[]>([]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("workout_plans")
      .select("id, name")
      .eq("is_template", true)
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setMyTemplates(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function choose(id: string) {
    setError(null);
    setActive(id);
    startTransition(async () => {
      const result = await createPlanFromTemplate(id);
      if (result.error) {
        setError(result.error);
        setActive(null);
        return;
      }
      if (result.id) {
        router.push(`/plans/${result.id}`);
        router.refresh();
      }
    });
  }

  function chooseMine(template: MyTemplate) {
    setError(null);
    setActive(template.id);
    startTransition(async () => {
      const result = await duplicatePlan(template.id);
      if (result.error) {
        setError(result.error);
        setActive(null);
        return;
      }
      if (result.id) {
        router.push(`/plans/${result.id}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-panel-border bg-graphite p-4">
      {!hideHeader && (
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold text-bone">{t("title")}</h2>
          <p className="text-xs text-bone-dim">{t("description")}</p>
        </div>
      )}
      {error && <p className="text-xs text-clay">{error}</p>}

      {myTemplates.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-bone-dim">
            {t("myTemplates")}
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {myTemplates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => chooseMine(tpl)}
                disabled={pending}
                className="flex items-center gap-3 rounded-lg border border-panel-border bg-carbon px-3 py-2.5 text-left transition-colors hover:border-steel disabled:opacity-50"
              >
                <Star className="h-4 w-4 shrink-0 fill-steel text-steel" />
                <span className="flex-1 text-sm text-bone">{tpl.name}</span>
                <span className="text-[10px] text-bone-dim">
                  {active === tpl.id && pending ? t("creating") : ""}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-bone-dim" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        {TEMPLATE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => choose(id)}
            disabled={pending}
            className="flex items-center gap-3 rounded-lg border border-panel-border bg-carbon px-3 py-2.5 text-left transition-colors hover:border-steel disabled:opacity-50"
          >
            <Dumbbell className="h-4 w-4 shrink-0 text-steel" />
            <div className="flex flex-1 flex-col">
              <span className="text-sm text-bone">{t(`${id}.name`)}</span>
              <span className="text-xs text-bone-dim">{t(`${id}.desc`)}</span>
            </div>
            <span className="text-[10px] text-bone-dim">
              {active === id && pending ? t("creating") : ""}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-bone-dim" />
          </button>
        ))}
      </div>
    </div>
  );
}
