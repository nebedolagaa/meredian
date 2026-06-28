import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "./CalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = createClient();
  const { data: plans } = await supabase
    .from("workout_plans")
    .select("*")
    .order("created_at", { ascending: false });

  return <CalendarView plans={plans ?? []} />;
}
