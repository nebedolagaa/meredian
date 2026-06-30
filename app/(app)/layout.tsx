import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/layout/BottomNav";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { Toaster } from "@/components/ui/Toaster";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: plans } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-dvh pb-16">
      <div className="mx-auto w-full max-w-sm px-4 md:max-w-2xl">
        {children}
      </div>
      <BottomNav plans={plans ?? []} />
      <InstallBanner />
      <Toaster />
    </div>
  );
}
