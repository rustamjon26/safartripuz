"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import DashboardShell from "@/components/dashboard/DashboardShell";
import {
  RefreshCw,
  CalendarDays,
  Clock,
  Users,
  Timer,
  XCircle,
  Star,
  CheckCircle2,
  Compass,
} from "lucide-react";

type Booking = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTE";
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  groupSize: number;
  totalPrice: number;
  listing: {
    id: string;
    title: string;
  };
  review?: { id: string } | null;
};

const STATUS_CONFIG: Record<string, { label: string; classes: string; dot: string }> = {
  PENDING:     { label: "Kutilmoqda",    classes: "bg-amber-50 border-amber-200 text-amber-700",     dot: "bg-amber-500" },
  CONFIRMED:   { label: "Tasdiqlangan",  classes: "bg-blue-50 border-blue-200 text-blue-700",        dot: "bg-blue-500" },
  IN_PROGRESS: { label: "Jarayonda",     classes: "bg-violet-50 border-violet-200 text-violet-700",  dot: "bg-violet-500" },
  COMPLETED:   { label: "Yakunlandi",    classes: "bg-emerald-50 border-emerald-200 text-emerald-700", dot: "bg-emerald-500" },
  CANCELLED:   { label: "Bekor qilindi", classes: "bg-red-50 border-red-200 text-red-700",           dot: "bg-red-500" },
  DISPUTE:     { label: "Munozara",      classes: "bg-orange-50 border-orange-200 text-orange-700",  dot: "bg-orange-500" },
};

export default function MyGuideBookingsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  async function load(reset = false) {
    const nextPage = reset ? 1 : page;
    if (reset) {
      setLoading(true);
    }
    try {
      const res = await fetch(`/api/guide/bookings?page=${nextPage}&limit=10`);
      const data = await res.json();
      if (res.ok && data.success) {
        const list = (data.data?.data || []) as Booking[];
        const totalPages = data.data?.pagination?.totalPages ?? 1;
        setHasMore(nextPage < totalPages);
        setItems((prev) => (reset ? list : [...prev, ...list]));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(true);
  }, []);

  useEffect(() => {
    if (page === 1) return;
    void load(false);
  }, [page]);

  async function cancelBooking(id: string) {
    try {
      const res = await fetch(`/api/guide/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancellationReason: "Cancelled by customer" }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "Bekor qilishda xatolik");
      toast.success("Booking bekor qilindi");
      setPage(1);
      void load(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    }
  }

  return (
    <DashboardShell title="Guide Bookings" subtitle="My guide booking history">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-sm">{items.length} ta bron</p>
          <button
            type="button"
            onClick={() => { setPage(1); void load(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 text-xs font-black transition-all"
          >
            <RefreshCw size={13} /> Yangilash
          </button>
        </div>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse">
                <div className="flex justify-between mb-4">
                  <div className="h-4 bg-gray-50 rounded-lg w-1/3" />
                  <div className="h-6 bg-gray-50 rounded-full w-24" />
                </div>
                <div className="h-3 bg-gray-50 rounded-lg w-1/2 mb-2" />
                <div className="h-3 bg-gray-50 rounded-lg w-1/4" />
              </div>
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <Compass size={40} className="text-slate-300 mx-auto mb-3" />
            <h3 className="text-gray-900 font-black text-lg mb-2">Gid bronlari yo&apos;q</h3>
            <p className="text-gray-500 text-sm mb-5">Hali hech qanday gid bron qilmagansiz.</p>
            <Link
              href="/guide"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-black px-5 py-2.5 rounded-xl text-sm transition-all"
            >
              Gidlarni ko&apos;rish →
            </Link>
          </div>
        )}

        {!loading &&
          items.map((item) => {
            const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PENDING;
            const dateStr = new Date(item.date).toLocaleDateString("uz-UZ", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            });

            return (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-amber-200 hover:shadow-md transition-all duration-200"
              >
                <div className={`h-0.5 w-full ${cfg.dot}`} />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-gray-900 text-base leading-snug line-clamp-2 mb-1 flex items-center gap-1.5">
                        <Compass size={16} className="text-orange-500 shrink-0" />
                        {item.listing.title}
                      </h3>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <CalendarDays size={11} className="text-amber-400" />
                          {dateStr}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} className="text-amber-400" />
                          {item.startTime} — {item.endTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={11} className="text-amber-400" />
                          {item.groupSize} kishi
                        </span>
                        <span className="flex items-center gap-1">
                          <Timer size={11} className="text-amber-400" />
                          {item.hours} soat
                        </span>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-black ${cfg.classes}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div>
                      <span className="text-xl font-black text-amber-600">
                        {Number(item.totalPrice).toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">so&apos;m</span>
                    </div>
                    <div className="flex gap-2">
                      {(item.status === "PENDING" || item.status === "CONFIRMED") && (
                        <button
                          type="button"
                          onClick={() => void cancelBooking(item.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-xs font-black transition-all"
                        >
                          <XCircle size={13} /> Bekor qilish
                        </button>
                      )}
                      {item.status === "COMPLETED" && !item.review && (
                        <Link
                          href={`/user/bookings/guide/${item.id}/review`}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 text-xs font-black transition-all"
                        >
                          <Star size={13} /> Baho berish
                        </Link>
                      )}
                      {item.status === "COMPLETED" && item.review && (
                        <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                          <CheckCircle2 size={13} /> Baholandi
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

        {hasMore && !loading && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 text-sm font-black transition-all"
            >
              Ko&apos;proq yuklash
            </button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
