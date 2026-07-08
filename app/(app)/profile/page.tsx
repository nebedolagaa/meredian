import {
  LogOut,
  Download,
  UserRound,
  ShieldCheck,
  Target,
  Languages,
  Palette,
  Scale,
  Trophy,
  Bell,
  Vibrate,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";
import { DisplayNameForm } from "@/components/settings/DisplayNameForm";
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
import { BodyGoalForm } from "@/components/settings/BodyGoalForm";
import { DangerZone } from "@/components/settings/DangerZone";
import { SettingsGroup, SettingRow } from "@/components/settings/SettingRow";
import { toDisplayWeight, unitLabel } from "@/lib/utils/units";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = createClient();
  const t = await getTranslations("settings");
  const tProfile = await getTranslations("profilePage");
  const tLang = await getTranslations("language");
  const tUnits = await getTranslations("units");
  const tSecurity = await getTranslations("security");
  const tData = await getTranslations("dataExport");
  const tReminders = await getTranslations("reminders");
  const tFeedback = await getTranslations("feedback");
  const tAccount = await getTranslations("account");
  const tGoal = await getTranslations("goal");
  const tBodyGoal = await getTranslations("bodyGoal");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, unit_preference, rest_seconds, reminders_enabled")
    .eq("id", user.id)
    .single();

  // Read separately so a missing column (pre-migration 0009) can't break the
  // rest of the page.
  const { data: goalRow } = await supabase
    .from("profiles")
    .select("weekly_goal")
    .eq("id", user.id)
    .single();
  const weeklyGoal = goalRow?.weekly_goal ?? 3;

  // Onboarding fields (migration 0010) — read separately for the same reason.
  const { data: bodyRow } = await supabase
    .from("profiles")
    .select("sex, height_cm, goal_type, goal_weight_kg")
    .eq("id", user.id)
    .single();

  const unit = profile?.unit_preference ?? "kg";
  const displayName = profile?.display_name ?? "";
  const initials = (displayName || user.email || "?")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const goalWeightDisplay =
    bodyRow?.goal_weight_kg != null
      ? `${toDisplayWeight(bodyRow.goal_weight_kg, unit)} ${unitLabel(unit)}`
      : null;

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader title={tProfile("title")} backHref="/dashboard" />

      {/* Identity header */}
      <div className="flex items-center gap-4 rounded-2xl border border-panel-border bg-graphite p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-steel bg-carbon">
          <span className="font-display text-lg font-bold text-bone">
            {initials}
          </span>
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-base font-semibold text-bone">
            {displayName || tProfile("noName")}
          </span>
          <span className="truncate font-num text-xs tabular-nums text-bone-dim">
            {user.email}
          </span>
        </div>
      </div>

      {/* Account */}
      <SettingsGroup title={tProfile("account")}>
        <SettingRow
          icon={<UserRound className="h-4 w-4" />}
          title={t("displayName")}
          value={displayName || null}
        >
          <DisplayNameForm initial={displayName} />
        </SettingRow>
        <SettingRow
          icon={<ShieldCheck className="h-4 w-4" />}
          title={tSecurity("title")}
          dialogDescription={tSecurity("description")}
        >
          <SecurityForms currentEmail={user.email ?? ""} />
        </SettingRow>
        <SettingRow
          icon={<Target className="h-4 w-4" />}
          title={tBodyGoal("title")}
          value={goalWeightDisplay}
          dialogDescription={tBodyGoal("description")}
        >
          <BodyGoalForm
            unit={unit}
            initialSex={bodyRow?.sex ?? null}
            initialHeightCm={bodyRow?.height_cm ?? null}
            initialGoalType={bodyRow?.goal_type ?? null}
            initialGoalWeightKg={bodyRow?.goal_weight_kg ?? null}
          />
        </SettingRow>
      </SettingsGroup>

      {/* Preferences */}
      <SettingsGroup title={tProfile("preferences")}>
        <SettingRow
          icon={<Languages className="h-4 w-4" />}
          title={tLang("title")}
          dialogDescription={tLang("description")}
        >
          <LanguageSelect />
        </SettingRow>
        <SettingRow
          icon={<Palette className="h-4 w-4" />}
          title={t("appearance")}
          dialogDescription={t("appearanceDesc")}
        >
          <ThemeSegmented />
        </SettingRow>
        <SettingRow
          icon={<Scale className="h-4 w-4" />}
          title={tUnits("title")}
          value={unitLabel(unit)}
          dialogDescription={tUnits("description")}
        >
          <div className="flex flex-col gap-4">
            <UnitSegmented initial={unit} />
            <RestSecondsField initial={profile?.rest_seconds ?? 90} />
          </div>
        </SettingRow>
        <SettingRow
          icon={<Trophy className="h-4 w-4" />}
          title={tGoal("title")}
          value={String(weeklyGoal)}
          dialogDescription={tGoal("description")}
        >
          <WeeklyGoalField initial={weeklyGoal} />
        </SettingRow>
        <SettingRow
          icon={<Bell className="h-4 w-4" />}
          title={tReminders("title")}
          dialogDescription={tReminders("description")}
        >
          <RemindersToggle initial={profile?.reminders_enabled ?? false} />
        </SettingRow>
        <SettingRow
          icon={<Vibrate className="h-4 w-4" />}
          title={tFeedback("title")}
          dialogDescription={tFeedback("description")}
        >
          <FeedbackToggles />
        </SettingRow>
      </SettingsGroup>

      {/* Data & integrations */}
      <SettingsGroup title={tProfile("data")}>
        <SettingRow
          icon={<Download className="h-4 w-4" />}
          title={tData("title")}
          dialogDescription={tData("description")}
        >
          <div className="flex items-center gap-2">
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
          </div>
        </SettingRow>
      </SettingsGroup>

      <form action={signOut}>
        <Button type="submit" variant="destructive" className="w-full">
          <LogOut className="h-4 w-4" />
          {t("signOut")}
        </Button>
      </form>

      <SettingsGroup title={tAccount("dangerZone")}>
        <div className="p-4">
          <p className="mb-3 text-xs text-bone-dim">
            {tAccount("dangerZoneDesc")}
          </p>
          <DangerZone />
        </div>
      </SettingsGroup>
    </div>
  );
}
