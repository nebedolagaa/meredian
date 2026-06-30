import { createClient } from "@/lib/supabase/server";
import { getUserPreferences } from "@/lib/data/preferences";
import { PlanBuilder } from "@/components/session/PlanBuilder";
import { TemplatePicker } from "@/components/plans/TemplatePicker";

export const dynamic = "force-dynamic";

export default async function NewPlanPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const prefs = user
    ? await getUserPreferences(supabase, user.id)
    : { unit: "kg" as const, restSeconds: 90 };

  return (
    <div className="flex flex-col gap-5">
      <TemplatePicker />
      <PlanBuilder
        initial={{ id: null, name: "", rows: [] }}
        unit={prefs.unit}
      />
    </div>
  );
}
