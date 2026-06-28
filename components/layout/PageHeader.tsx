import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  backHref,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-3 pb-4 pt-6",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Back"
            className="mt-0.5 text-bone-dim transition-colors hover:text-bone"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
        )}
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-2xl font-bold tracking-tight text-bone">
            {title}
          </h1>
          {subtitle && <p className="text-sm text-bone-dim">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}
