import { Skeleton } from "@/components/ui/skeleton";

export default function SessionLoading() {
  return (
    <div className="flex flex-col gap-5 pb-28 pt-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-panel-border bg-graphite p-4"
        >
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-2 h-3 w-28" />
          <div className="mt-4 flex flex-col gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
