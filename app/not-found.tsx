import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="font-num text-5xl tabular-nums text-bone-dim">404</span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-bone">{t("title")}</p>
        <p className="text-xs text-bone-dim">{t("description")}</p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard">{t("backHome")}</Link>
      </Button>
    </main>
  );
}
