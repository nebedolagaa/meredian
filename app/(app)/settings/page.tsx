import {
  LogOut,
  CalendarCheck,
  Apple,
  HeartPulse,
  Sparkles,
  Download,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";
import { DisplayNameForm } from "./DisplayNameForm";
import { ThemeSegmented } from "@/components/theme/ThemeToggle";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import {
  UnitSegmented,
  RestSecondsField,
  WeeklyGoalField,
} from "@/components/settings/PreferencesForms";
import { SecurityForms } from "@/components/settings/SecurityForms";
import { RemindersToggle } from "@/components/settings/RemindersToggle";
import { FeedbackToggles } from "@/components/settings/FeedbackToggles";
import { DangerZone } from "@/components/settings/DangerZone";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const t = await getTranslations("settings");
  const tLang = await getTranslations("language");
  const tUnits = await getTranslations("units");
  const tSecurity = await getTranslations("security");
  const tData = await getTranslations("dataExport");
  const tReminders = await getTranslations("reminders");
  const tFeedback = await getTranslations("feedback");
  const tAccount = await getTranslations("account");
  const tCommon = await getTranslations("common");
  const tGoal = await getTranslations("goal");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const comingSoon = [
    {
      icon: CalendarCheck,
      title: t("googleCalendarTitle"),
      description: t("googleCalendarDesc"),
    },
    {
      icon: Apple,
      title: t("appleCalendarTitle"),
      description: t("appleCalendarDesc"),
    },
    {
      icon: HeartPulse,
      title: t("appleHealthTitle"),
      description: t("appleHealthDesc"),
    },
    {
      icon: Sparkles,
      title: t("aiCoachingTitle"),
      description: t("aiCoachingDesc"),
    },
  ];

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, unit_preference, rest_seconds, reminders_enabled")
    .eq("id", user.id)
    .single();

  // Read separately so a missing column (pre-migration 0009) can't break the
  // rest of the settings page.
  const { data: goalRow } = await supabase
    .from("profiles")
    .select("weekly_goal")
    .eq("id", user.id)
    .single();
  const weeklyGoal = goalRow?.weekly_goal ?? 3;

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader title={t("title")} backHref="/dashboard" />

      <Card>
        <CardHeader>
          <CardTitle>{tLang("title")}</CardTitle>
          <p className="text-xs text-bone-dim">{tLang("description")}</p>
        </CardHeader>
        <CardContent>
          <LanguageSelect />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("appearance")}</CardTitle>
          <p className="text-xs text-bone-dim">{t("appearanceDesc")}</p>
        </CardHeader>
        <CardContent>
          <ThemeSegmented />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tUnits("title")}</CardTitle>
          <p className="text-xs text-bone-dim">{tUnits("description")}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <UnitSegmented initial={profile?.unit_preference ?? "kg"} />
          <RestSecondsField initial={profile?.rest_seconds ?? 90} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tGoal("title")}</CardTitle>
          <p className="text-xs text-bone-dim">{tGoal("description")}</p>
        </CardHeader>
        <CardContent>
          <WeeklyGoalField initial={weeklyGoal} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <DisplayNameForm initial={profile?.display_name ?? ""} />
          <div className="flex flex-col gap-1">
            <span className="text-xs text-bone-dim">{t("email")}</span>
            <span className="font-num text-sm tabular-nums text-bone">
              {user.email}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tSecurity("title")}</CardTitle>
          <p className="text-xs text-bone-dim">{tSecurity("description")}</p>
        </CardHeader>
        <CardContent>
          <SecurityForms currentEmail={user.email ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tReminders("title")}</CardTitle>
          <p className="text-xs text-bone-dim">{tReminders("description")}</p>
        </CardHeader>
        <CardContent>
          <RemindersToggle initial={profile?.reminders_enabled ?? false} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tFeedback("title")}</CardTitle>
          <p className="text-xs text-bone-dim">{tFeedback("description")}</p>
        </CardHeader>
        <CardContent>
          <FeedbackToggles />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tData("title")}</CardTitle>
          <p className="text-xs text-bone-dim">{tData("description")}</p>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/api/export?format=csv" download>
              <Download className="h-4 w-4" />
              {tData("csv")}
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/api/export?format=json" download>
              <Download className="h-4 w-4" />
              {tData("json")}
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("integrations")}</CardTitle>
          <p className="text-xs text-bone-dim">{t("integrationsDesc")}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {comingSoon.map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-3 rounded-lg border border-panel-border bg-carbon p-3 opacity-70"
            >
              <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-bone-dim" />
              <div className="flex flex-1 flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-bone">{item.title}</span>
                  <Badge variant="outline">{tCommon("comingSoon")}</Badge>
                </div>
                <p className="text-xs text-bone-dim">{item.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <form action={signOut}>
        <Button type="submit" variant="destructive" className="w-full">
          <LogOut className="h-4 w-4" />
          {t("signOut")}
        </Button>
      </form>

      <Card className="border-red-500/30">
        <CardHeader>
          <CardTitle className="text-red-400">
            {tAccount("dangerZone")}
          </CardTitle>
          <p className="text-xs text-bone-dim">{tAccount("dangerZoneDesc")}</p>
        </CardHeader>
        <CardContent>
          <DangerZone />
        </CardContent>
      </Card>
    </div>
  );
}
