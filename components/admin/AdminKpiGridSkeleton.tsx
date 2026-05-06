import { Skeleton } from "@/components/ui/Skeleton";

export function AdminKpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="adm-kpi-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="adm-kpi-card border-none shadow-xl shadow-slate-200/50 bg-white flex gap-4 items-center p-5">
          <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-24 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
