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
  PENDING:     { label: "Kutilmoqda",    classes: "bg-amber-50 border-amber-200 text-amber-700",     dot: "bg-amber-500" },
  CONFIRMED:   { label: "Tasdiqlangan",  classes: "bg-blue-50 border-blue-200 text-blue-700",        dot: "bg-blue-500" },
  CHECKED_IN:  { label: "Yashayapti",    classes: "bg-cyan-50 border-cyan-200 text-cyan-700",        dot: "bg-cyan-500" },
  CHECKED_OUT: { label: "Chiqdi",        classes: "bg-gray-100 border-gray-200 text-gray-600",     dot: "bg-gray-400" },
  COMPLETED:   { label: "Yakunlandi",    classes: "bg-emerald-50 border-emerald-200 text-emerald-700", dot: "bg-emerald-500" },
  CANCELLED:   { label: "Bekor qilindi", classes: "bg-red-50 border-red-200 text-red-700",           dot: "bg-red-500" },
  DISPUTE:     { label: "Munozara",      classes: "bg-orange-50 border-orange-200 text-orange-700",  dot: "bg-orange-500" },
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
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
                <Skeleton className="h-44 w-full bg-gray-50" />
                <Skeleton className="h-4 w-3/4 bg-gray-50" />
                <Skeleton className="h-4 w-1/2 bg-gray-50" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <div className="text-5xl mb-3">🛖</div>
            <h3 className="text-gray-900 font-black text-lg mb-2">Bronlar yo&apos;q</h3>
            <p className="text-gray-500 text-sm mb-5">Hali HomeStay bron qilmagansiz.</p>
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
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm shadow-gray-900/20 hover:border-amber-500/25 hover:bg-white transition-all duration-200 flex flex-col md:flex-row"
              >
                <div className="md:w-56 h-44 md:h-auto bg-gray-50 shrink-0 relative overflow-hidden">
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
                      <span className="text-gray-400 text-xs font-bold">Rasm yo&apos;q</span>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
                    <span className="text-xs font-black text-white">{nights} tun</span>
                  </div>
                </div>

                <div className="flex-1 p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-gray-900 text-base line-clamp-2 leading-snug mb-1">
                        {item.listing.title}
                      </h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
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

                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-4 w-fit">
                    <Calendar size={13} className="text-amber-400" />
                    <span className="text-xs font-bold text-gray-700">{checkInStr}</span>
                    <ArrowRight size={11} className="text-gray-400" />
                    <span className="text-xs font-bold text-gray-700">{checkOutStr}</span>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-200">
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
                          href={`/user/bookings/homestay/${item.id}/review`}
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
          })
        )}
      </div>
    </DashboardShell>
  );
}
