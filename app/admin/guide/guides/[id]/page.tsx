"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { AdminGuideListingStatusBadge } from "@/components/admin/guide/AdminGuideListingStatusBadge";
import { AdminGuideBookingStatusBadge } from "@/components/admin/guide/AdminGuideBookingStatusBadge";

type ListingRow = {
  id: string;
  title: string;
  category: string;
  status: string;
  rating: number;
  _count: { bookings: number; reviews: number };
  completedRevenue: number;
};

type BookingRow = {
  id: string;
  status: string;
  totalPrice: unknown;
  createdAt: string;
  listing: { title: string };
  guest: { first_name: string; last_name: string } | null;
};

type ChartPoint = { month: string; label: string; revenue: number };

type GuidePayload = {
  guide: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    isBlocked: boolean;
    partnerProfile: { status: string } | null;
    guideListings: ListingRow[];
  };
  recentBookings: BookingRow[];
  revenueSummary: { completedBookings: number; totalRevenue: number };
  monthRevenueChart: ChartPoint[];
};

type ActionKind = "block" | "unblock" | "verify" | null;

export default function AdminGuidePartnerDetailPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GuidePayload | null>(null);
  const [action, setAction] = useState<ActionKind>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/guide/guides/${params.id}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) void load();
  }, [params.id, load]);

  const avgRating = useMemo(() => {
    const listings = data?.guide.guideListings ?? [];
    if (listings.length === 0) return 0;
    const sum = listings.reduce((s, l) => s + Number(l.rating ?? 0), 0);
    return sum / listings.length;
  }, [data?.guide.guideListings]);

  const maxChart = useMemo(() => {
    const pts = data?.monthRevenueChart ?? [];
    return Math.max(...pts.map((p) => p.revenue), 1);
  }, [data?.monthRevenueChart]);

  async function runDriverAction(type: "block" | "unblock" | "verify") {
    if (!params.id) return;
    try {
      const res = await fetch(`/api/admin/guide/guides/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: type }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Xatolik");
      toast.success("Yangilandi");
      setAction(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    }
  }

  if (loading) {
    return (
      <div className="adm-card border-none shadow-xl p-10 text-center text-slate-400 font-bold bg-white">
        Yuklanmoqda...
      </div>
    );
  }
  if (!data) {
    return (
      <div className="adm-card border-none shadow-xl p-10 text-center text-red-600 font-bold bg-white">
        Guide topilmadi
      </div>
    );
  }

  const g = data.guide;
  const rating = avgRating;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/admin/guide/guides"
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
            aria-label="Orqaga"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {g.first_name} {g.last_name}
            </h1>
            <p className="text-sm font-bold text-slate-400 mt-1">{g.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                  g.isBlocked ? "bg-red-50 text-red-800 border-red-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"
                }`}
              >
                {g.isBlocked ? "Bloklangan" : "Faol"}
              </span>
              {g.partnerProfile ? (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border bg-slate-50 text-slate-700 border-slate-200">
                  Partner: {g.partnerProfile.status}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {g.isBlocked ? (
            <button type="button" className="adm-btn" onClick={() => setAction("unblock")}>
              Blokdan chiqarish
            </button>
          ) : (
            <button type="button" className="adm-btn" onClick={() => setAction("block")}>
              Bloklash
            </button>
          )}
          <button type="button" className="adm-btn adm-btn-primary" onClick={() => setAction("verify")}>
            Tasdiqlash
          </button>
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-card-header bg-white border-b border-slate-50">
          <span className="text-lg font-black text-slate-900 tracking-tight">Profil</span>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Telefon</div>
            <div className="font-bold text-slate-900 mt-1">{g.phone}</div>
          </div>
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">{"Reyting (listing o'rtachasi)"}</div>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={18} className={rating >= n ? "text-amber-400 fill-amber-400" : "text-slate-200"} />
              ))}
              <span className="ml-2 font-black text-slate-900">{rating.toFixed(1)} / 5</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Jami bronlar (tugallangan)</div>
            <div className="font-black text-slate-900 text-xl mt-1">{data.revenueSummary.completedBookings}</div>
          </div>
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Umumiy daromad (tugallangan)</div>
            <div className="font-black text-emerald-800 text-xl mt-1">
              {Number(data.revenueSummary.totalRevenue).toLocaleString()} {"so'm"}
            </div>
          </div>
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-card-header bg-white border-b border-slate-50">
          <span className="text-lg font-black text-slate-900 tracking-tight">{"Oylik daromad (diagramma)"}</span>
        </div>
        <div className="p-6">
          <div className="flex items-end justify-between gap-2 min-h-[160px] pt-6">
            {(data.monthRevenueChart ?? []).map((pt) => {
              const barPx = Math.max(4, Math.round((pt.revenue / maxChart) * 120));
              return (
                <div key={pt.month} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                  <div className="text-[10px] font-black text-slate-700 truncate w-full text-center">
                    {(pt.revenue / 1000).toFixed(0)}k
                  </div>
                  <div className="w-full h-[124px] flex items-end justify-center bg-slate-100 rounded-t-lg">
                    <div
                      className="w-[70%] max-w-[40px] rounded-t-lg bg-emerald-500 transition-all"
                      style={{ height: `${barPx}px` }}
                      title={`${pt.revenue.toLocaleString()} so'm`}
                    />
                  </div>
                  <div className="text-[9px] font-bold text-slate-400 text-center leading-tight px-0.5">{pt.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-card-header bg-white border-b border-slate-50">
          <span className="text-lg font-black text-slate-900 tracking-tight">Listinglar</span>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Sarlavha</th>
                <th>Kategoriya</th>
                <th>Holat</th>
                <th>Bronlar</th>
                <th className="pr-8">Daromad (tugallangan)</th>
              </tr>
            </thead>
            <tbody>
              {g.guideListings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                    {"Listing yo'q"}
                  </td>
                </tr>
              ) : (
                g.guideListings.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/50">
                    <td className="py-4 pl-8">
                      <Link href={`/admin/guide/listings/${l.id}`} className="text-sm font-black text-slate-900 hover:underline">
                        {l.title}
                      </Link>
                    </td>
                    <td className="py-4 text-xs font-bold text-slate-500">{l.category}</td>
                    <td className="py-4">
                      <AdminGuideListingStatusBadge status={l.status} />
                    </td>
                    <td className="py-4 text-sm font-black text-slate-900">{l._count.bookings}</td>
                    <td className="py-4 pr-8 text-sm font-black text-slate-900">
                      {Number(l.completedRevenue).toLocaleString()} {"so'm"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-card-header bg-white border-b border-slate-50 flex items-center justify-between">
          <span className="text-lg font-black text-slate-900 tracking-tight">{"So'nggi bronlar (10)"}</span>
          <Link href="/admin/guide/bookings" className="adm-btn text-xs">
            Barcha bronlar
          </Link>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Mijoz</th>
                <th>Listing</th>
                <th>Narx</th>
                <th className="pr-8">Holat</th>
              </tr>
            </thead>
            <tbody>
              {data.recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 font-bold">
                    {"Bron yo'q"}
                  </td>
                </tr>
              ) : (
                data.recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="py-4 pl-8 text-sm font-black text-slate-900">
                      {b.guest ? `${b.guest.first_name} ${b.guest.last_name}` : "—"}
                    </td>
                    <td className="py-4 text-xs font-bold text-slate-600">{b.listing.title}</td>
                    <td className="py-4 text-sm font-black text-slate-900">
                      {Number(b.totalPrice).toLocaleString()} {"so'm"}
                    </td>
                    <td className="py-4 pr-8">
                      <AdminGuideBookingStatusBadge status={b.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={action === "block" || action === "unblock" || action === "verify"}
        title={
          action === "block" ? "Guideni bloklash" : action === "unblock" ? "Blokdan chiqarish" : action === "verify" ? "Tasdiqlash" : ""
        }
        description={
          action === "block"
            ? "Quyidagi ekskursiyachi bloklanadi va tizimga kira olmaydi."
            : action === "unblock"
              ? "Guide blokdan chiqariladi va yana tizimga kira oladi."
              : action === "verify"
                ? "Partner profili tasdiqlangan deb belgilanadi."
                : ""
        }
        subjectName={`${data.guide.first_name} ${data.guide.last_name}`.trim()}
        confirmDanger={action === "block"}
        onCancel={() => setAction(null)}
        onConfirm={() => {
          if (action === "block") void runDriverAction("block");
          if (action === "unblock") void runDriverAction("unblock");
          if (action === "verify") void runDriverAction("verify");
        }}
      />
    </div>
  );
}
