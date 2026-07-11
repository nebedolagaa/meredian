import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="flex flex-col gap-6 pb-8 pt-6">
      <Skeleton className="h-7 w-24" />
      <div className="flex items-center gap-4 rounded-2xl border border-panel-border bg-graphite p-4">
        <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
