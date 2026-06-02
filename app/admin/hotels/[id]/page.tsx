export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CheckCircle, AlertCircle, Calendar } from "lucide-react";
import type { HotelStatus } from "@prisma/client";
import { getAdminHotelDetail } from "@/lib/admin/getAdminHotelDetail";
import { AdminHotelDetailClient } from "@/components/admin/hotels/AdminHotelDetailClient";

const STATUS_BADGE: Record<
  HotelStatus,
  { label: string; cls: string; icon: typeof CheckCircle }
> = {
  active: {
    label: "ACTIVE",
    cls: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    icon: CheckCircle,
  },
  draft: {
    label: "PENDING",
    cls: "bg-amber-50 text-amber-600 ring-amber-100",
    icon: Calendar,
  },
  suspended: {
    label: "SUSPENDED",
    cls: "bg-rose-50 text-rose-600 ring-rose-100",
    icon: AlertCircle,
  },
};

export default async function AdminHotelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getAdminHotelDetail(id);
  if (!data) notFound();

  const badge = STATUS_BADGE[data.hotel.status];
  const BadgeIcon = badge.icon;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/hotels"
          className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest mb-3"
        >
          <ArrowLeft size={14} />
          Hotellar
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/10">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{data.hotel.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ring-1 shadow-sm ${badge.cls}`}
              >
                <BadgeIcon size={10} />
                {badge.label}
              </span>
              {data.hotel.city && (
                <span className="text-xs font-bold text-slate-400">{data.hotel.city}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <AdminHotelDetailClient data={data} />
    </div>
  );
}
