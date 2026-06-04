"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { MapPin, Calendar, ArrowRight, XCircle, Star, CheckCircle2 } from "lucide-react";

type Booking = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "COMPLETED" | "CANCELLED" | "DISPUTE";
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  listing: {
    id: string;
    title: string;
    city: string;
    images: string[];
  };
  review?: { id: string } | null;
};

const STATUS_CONFIG: Record<string, { label: string; classes: string; dot: string }> = {
  PENDING:     { label: "Kutilmoqda",    classes: "bg-amber-500/15 border-amber-500/30 text-amber-400",     dot: "bg-amber-400" },
  CONFIRMED:   { label: "Tasdiqlangan",  classes: "bg-blue-500/15 border-blue-500/30 text-blue-400",        dot: "bg-blue-400" },
  CHECKED_IN:  { label: "Yashayapti",    classes: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400",        dot: "bg-cyan-400" },
  CHECKED_OUT: { label: "Chiqdi",        classes: "bg-slate-500/15 border-slate-500/30 text-slate-400",     dot: "bg-slate-400" },
  COMPLETED:   { label: "Yakunlandi",    classes: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400", dot: "bg-emerald-400" },
  CANCELLED:   { label: "Bekor qilindi", classes: "bg-red-500/15 border-red-500/30 text-red-400",           dot: "bg-red-400" },
  DISPUTE:     { label: "Munozara",      classes: "bg-orange-500/15 border-orange-500/30 text-orange-400",  dot: "bg-orange-400" },
};

export default function MyHomeStayBookingsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Booking[]>([]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/homestay/bookings");
      const data = await res.json();
      if (res.ok && data.success) {
        setItems(data.data?.data || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function cancelBooking(id: string) {
    try {
      const res = await fetch(`/api/homestay/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancellationReason: "Cancelled by user" }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "Bekor qilishda xatolik");
      toast.success("Booking bekor qilindi");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    }
  }

  return (
    <DashboardShell title="HomeStay Bookings" subtitle="My HomeStay booking history">
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-5 space-y-3">
                <Skeleton className="h-44 w-full bg-[#1a2234]" />
                <Skeleton className="h-4 w-3/4 bg-[#1a2234]" />
                <Skeleton className="h-4 w-1/2 bg-[#1a2234]" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-12 text-center">
            <div className="text-5xl mb-3">🛖</div>
            <h3 className="text-white font-black text-lg mb-2">Bronlar yo&apos;q</h3>
            <p className="text-slate-500 text-sm mb-5">Hali HomeStay bron qilmagansiz.</p>
            <Link
              href="/homestay"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-black px-5 py-2.5 rounded-xl text-sm transition-all"
            >
              HomeStay ko&apos;rish →
            </Link>
          </div>
        ) : (
          items.map((item) => {
            const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PENDING;
            const nights = Math.max(
              1,
              Math.ceil(
                (new Date(item.checkOut).getTime() - new Date(item.checkIn).getTime()) / 86400000,
              ),
            );
            const checkInStr = new Date(item.checkIn).toLocaleDateString("uz-UZ", {
              day: "2-digit",
              month: "short",
            });
            const checkOutStr = new Date(item.checkOut).toLocaleDateString("uz-UZ", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });

            return (
              <div
                key={item.id}
                className="bg-[#111827] border border-[#1e2d45] rounded-2xl overflow-hidden hover:border-amber-500/20 transition-all duration-200 flex flex-col md:flex-row"
              >
                <div className="md:w-56 h-44 md:h-auto bg-[#1a2234] shrink-0 relative overflow-hidden">
                  {item.listing.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.listing.images[0]}
                      alt={item.listing.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <span className="text-4xl mb-1">🛖</span>
                      <span className="text-slate-600 text-xs font-bold">Rasm yo&apos;q</span>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-[#0a0f1e]/80 backdrop-blur-sm border border-[#1e2d45] rounded-lg px-2 py-1">
                    <span className="text-xs font-black text-white">{nights} tun</span>
                  </div>
                </div>

                <div className="flex-1 p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-white text-base line-clamp-2 leading-snug mb-1">
                        {item.listing.title}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin size={11} className="text-amber-400" />
                        {item.listing.city}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-black ${cfg.classes}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 bg-[#0a0f1e] border border-[#1e2d45] rounded-xl px-3 py-2 mb-4 w-fit">
                    <Calendar size={13} className="text-amber-400" />
                    <span className="text-xs font-bold text-slate-300">{checkInStr}</span>
                    <ArrowRight size={11} className="text-slate-600" />
                    <span className="text-xs font-bold text-slate-300">{checkOutStr}</span>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-3 border-t border-[#1e2d45]">
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
                          href={`/user/bookings/homestay/${item.id}/review`}
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
          })
        )}
      </div>
    </DashboardShell>
  );
}
