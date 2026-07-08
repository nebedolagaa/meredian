import { createClient } from "@/lib/supabase/server";
import { getUserPreferences, getProfileSex } from "@/lib/data/preferences";
import { PlanBuilder } from "@/components/session/PlanBuilder";
import { TemplatePickerContent } from "@/components/plans/TemplatePicker";

export const dynamic = "force-dynamic";

export default async function NewPlanPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const prefs = user
    ? await getUserPreferences(supabase, user.id)
    : { unit: "kg" as const, restSeconds: 90 };

  // Body-map figure follows the profile sex; male by default.
  const sex = user ? await getProfileSex(supabase, user.id) : "male";

  return (
    <PlanBuilder
      initial={{ id: null, name: "", rows: [] }}
      unit={prefs.unit}
      sex={sex}
      templatePicker={<TemplatePickerContent hideHeader />}
    />
  );
}
