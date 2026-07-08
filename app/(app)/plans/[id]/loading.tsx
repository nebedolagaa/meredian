import { Skeleton } from "@/components/ui/skeleton";

export default function PlanDetailLoading() {
  return (
    <div className="flex flex-col gap-5 pb-28 pt-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <Skeleton className="h-11 rounded-lg" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}
