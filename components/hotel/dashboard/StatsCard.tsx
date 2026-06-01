import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";

export type StatsCardBulkAction = {
  label: string;
  onClick: () => void;
  loading?: boolean;
  accentClass?: string;
};

export type StatsCardProps = {
  value: number | string;
  label: string;
  hint?: string;
  accentClass: string;
  barClass: string;
  icon: LucideIcon;
  loading?: boolean;
  viewLink?: string;
  viewLinkLabel?: string;
  bulkAction?: StatsCardBulkAction;
};

export function StatsCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm animate-pulse">
      <div className="h-3 w-20 bg-gray-100 rounded mb-4" />
      <div className="h-9 w-16 bg-gray-100 rounded mb-2" />
      <div className="h-3 w-24 bg-gray-100 rounded" />
      <div className="h-1 w-full bg-gray-100 rounded-full mt-4" />
    </div>
  );
}

export default function StatsCard({
  value,
  label,
  hint,
  accentClass,
  barClass,
  icon: Icon,
  loading,
  viewLink,
  viewLinkLabel,
  bulkAction,
}: StatsCardProps) {
  if (loading) return <StatsCardSkeleton />;

  const numericValue = typeof value === "number" ? value : Number(value);
  const showViewLink = viewLink && viewLinkLabel && numericValue > 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-snug">
          {label}
        </p>
        <div className={`p-2 rounded-lg bg-slate-50 ${accentClass}`}>
          <Icon size={16} strokeWidth={2.5} />
        </div>
      </div>
      <div className={`text-3xl font-black tabular-nums ${accentClass}`}>{value}</div>
      {hint ? (
        <p className="text-[11px] font-bold text-slate-400 mt-1">{hint}</p>
      ) : null}
      <div className={`h-1 w-full rounded-full mt-4 ${barClass}`} />

      {bulkAction && numericValue > 0 ? (
        <button
          type="button"
          onClick={bulkAction.onClick}
          disabled={bulkAction.loading}
          className={`mt-3 w-full text-left text-[11px] font-bold px-3 py-2 rounded-lg border transition-colors disabled:opacity-60 ${
            bulkAction.accentClass ??
            "text-amber-700 bg-amber-50 border-amber-100 hover:bg-amber-100"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {bulkAction.loading ? <Loader2 size={12} className="animate-spin" /> : null}
            {bulkAction.label}
          </span>
        </button>
      ) : null}

      {showViewLink ? (
        <Link
          href={viewLink}
          className="mt-3 text-[11px] font-semibold text-slate-400 hover:text-[var(--primary)] transition-colors"
        >
          {viewLinkLabel}
        </Link>
      ) : null}
    </div>
  );
}
