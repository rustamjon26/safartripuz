const LABELS: Record<string, string> = {
  PENDING: "Kutilmoqda",
  ACTIVE: "Aktiv",
  INACTIVE: "Nofaol",
  REJECTED: "Rad etilgan",
  BLOCKED: "Bloklangan",
};

const TONE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800 ring-amber-100",
  ACTIVE: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  INACTIVE: "bg-slate-100 text-slate-600 ring-slate-200",
  REJECTED: "bg-rose-50 text-rose-800 ring-rose-100",
  BLOCKED: "bg-red-950/10 text-red-900 ring-red-200",
};

export function AdminGuideListingStatusBadge({ status, large }: { status: string; large?: boolean }) {
  const label = LABELS[status] ?? status;
  const tone = TONE[status] ?? "bg-slate-50 text-slate-700 ring-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-lg font-black uppercase tracking-wider ring-1 ${tone} ${
        large ? "px-4 py-2 text-sm" : "px-2.5 py-1 text-[10px]"
      }`}
    >
      {label}
    </span>
  );
}
