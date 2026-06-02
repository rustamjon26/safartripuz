export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Compass, CheckCircle, AlertCircle, EyeOff, Info } from "lucide-react";
import { getAdminTourDetail } from "@/lib/admin/getAdminTourDetail";
import { AdminTourDetailClient } from "@/components/admin/tours/AdminTourDetailClient";

const STATUS_BADGE: Record<
  string,
  { label: string; cls: string; icon: typeof CheckCircle }
> = {
  active: {
    label: "ACTIVE",
    cls: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    icon: CheckCircle,
  },
  draft: {
    label: "DRAFT",
    cls: "bg-amber-50 text-amber-600 ring-amber-100",
    icon: Info,
  },
  inactive: {
    label: "SUSPENDED",
    cls: "bg-rose-50 text-rose-600 ring-rose-100",
    icon: EyeOff,
  },
};

export default async function AdminTourDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getAdminTourDetail(id);
  if (!data) notFound();

  const badge = STATUS_BADGE[data.tour.status] ?? {
    label: data.tour.status.toUpperCase(),
    cls: "bg-slate-100 text-slate-600 ring-slate-200",
    icon: AlertCircle,
  };
  const BadgeIcon = badge.icon;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/tours"
          className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest mb-3"
        >
          <ArrowLeft size={14} />
          Turlar
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/10">
            <Compass size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{data.tour.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ring-1 shadow-sm ${badge.cls}`}
              >
                <BadgeIcon size={10} />
                {badge.label}
              </span>
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <Compass size={12} />
                {data.tour.destination}
              </span>
            </div>
          </div>
        </div>
      </div>

      <AdminTourDetailClient data={data} />
    </div>
  );
}
