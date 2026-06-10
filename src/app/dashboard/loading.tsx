import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-8">
      {/* control bar */}
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-48" />
      </div>
      {/* insight bar */}
      <Skeleton className="h-14 w-full" />
      {/* hero KPIs — 4-up, matches the shipped grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => `kpi${i}`).map((k) => (
          <Skeleton key={k} className="h-32" />
        ))}
      </div>
      {/* primary analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      {/* needs attention */}
      <Skeleton className="h-40" />
      {/* expiring + recent */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </div>
  );
}
