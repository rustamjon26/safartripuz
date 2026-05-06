const LABELS: Record<string, string> = {
  PENDING: "Kutilmoqda",
  CONFIRMED: "Tasdiqlandi",
  IN_PROGRESS: "Jarayonda",
  COMPLETED: "Tugallandi",
  CANCELLED: "Bekor",
  DISPUTE: "Nizo",
};

const TONE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800 ring-amber-100",
  CONFIRMED: "bg-sky-50 text-sky-800 ring-sky-100",
  IN_PROGRESS: "bg-violet-50 text-violet-800 ring-violet-100",
  COMPLETED: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-200",
  DISPUTE: "bg-rose-50 text-rose-800 ring-rose-100",
};

export function AdminGuideBookingStatusBadge({ status, large }: { status: string; large?: boolean }) {
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
