const LABELS: Record<string, string> = {
  PENDING: "Kutilmoqda",
  ACCEPTED: "Qabul qilindi",
  ARRIVED: "Yetib keldi",
  IN_PROGRESS: "Yo'lda",
  COMPLETED: "Tugallandi",
  CANCELLED: "Bekor",
  DISPUTE: "Nizo",
};

const TONES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  ACCEPTED: "bg-sky-50 text-sky-800 border-sky-200",
  ARRIVED: "bg-violet-50 text-violet-800 border-violet-200",
  IN_PROGRESS: "bg-emerald-50 text-emerald-800 border-emerald-200",
  COMPLETED: "bg-slate-900 text-white border-slate-900",
  CANCELLED: "bg-red-50 text-red-800 border-red-200",
  DISPUTE: "bg-red-50 text-red-900 border-red-300",
};

export function AdminTaxiStatusBadge({ status }: { status: string }) {
  const label = LABELS[status] ?? status;
  const tone = TONES[status] ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wide ${tone}`}>
      {label}
    </span>
  );
}
