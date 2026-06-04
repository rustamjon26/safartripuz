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
  PENDING:     { label: "Kutilmoqda",    classes: "bg-amber-500/15 border-amber-500/30 text-amber-400",     dot: "bg-amber-400" },
  CONFIRMED:   { label: "Tasdiqlangan",  classes: "bg-blue-500/15 border-blue-500/30 text-blue-400",        dot: "bg-blue-400" },
  IN_PROGRESS: { label: "Jarayonda",     classes: "bg-violet-500/15 border-violet-500/30 text-violet-400",  dot: "bg-violet-400" },
  COMPLETED:   { label: "Yakunlandi",    classes: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400", dot: "bg-emerald-400" },
  CANCELLED:   { label: "Bekor qilindi", classes: "bg-red-500/15 border-red-500/30 text-red-400",           dot: "bg-red-400" },
  DISPUTE:     { label: "Munozara",      classes: "bg-orange-500/15 border-orange-500/30 text-orange-400",  dot: "bg-orange-400" },
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
          <p className="text-slate-400 text-sm">{items.length} ta bron</p>
          <button
            type="button"
            onClick={() => { setPage(1); void load(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111827] border border-[#1e2d45] text-slate-400 hover:text-white text-xs font-black transition-all hover:border-[#2a3a55]"
          >
            <RefreshCw size={13} /> Yangilash
          </button>
        </div>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-5 animate-pulse">
                <div className="flex justify-between mb-4">
                  <div className="h-4 bg-[#1a2234] rounded-lg w-1/3" />
                  <div className="h-6 bg-[#1a2234] rounded-full w-24" />
                </div>
                <div className="h-3 bg-[#1a2234] rounded-lg w-1/2 mb-2" />
                <div className="h-3 bg-[#1a2234] rounded-lg w-1/4" />
              </div>
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-12 text-center">
            <div className="text-5xl mb-3">🧭</div>
            <h3 className="text-white font-black text-lg mb-2">Gid bronlari yo&apos;q</h3>
            <p className="text-slate-500 text-sm mb-5">Hali hech qanday gid bron qilmagansiz.</p>
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
                className="bg-[#111827] border border-[#1e2d45] rounded-2xl overflow-hidden hover:border-amber-500/20 transition-all duration-200"
              >
                <div className={`h-0.5 w-full ${cfg.dot}`} />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-white text-base leading-snug line-clamp-2 mb-1">
                        🧭 {item.listing.title}
                      </h3>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
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

                  <div className="flex items-center justify-between pt-3 border-t border-[#1e2d45]">
                    <div>
                      <span className="text-xl font-black text-amber-400">
                        {Number(item.totalPrice).toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">so&apos;m</span>
                    </div>
                    <div className="flex gap-2">
                      {(item.status === "PENDING" || item.status === "CONFIRMED") && (
                        <button
                          type="button"
                          onClick={() => void cancelBooking(item.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black hover:bg-red-500/20 transition-all"
                        >
                          <XCircle size={13} /> Bekor qilish
                        </button>
                      )}
                      {item.status === "COMPLETED" && !item.review && (
                        <Link
                          href={`/user/bookings/guide/${item.id}/review`}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black hover:bg-amber-500/20 transition-all"
                        >
                          <Star size={13} /> Baho berish
                        </Link>
                      )}
                      {item.status === "COMPLETED" && item.review && (
                        <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
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
              className="px-6 py-2.5 rounded-xl bg-[#111827] border border-[#1e2d45] text-slate-400 hover:text-white hover:border-[#2a3a55] text-sm font-black transition-all"
            >
              Ko&apos;proq yuklash
            </button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
