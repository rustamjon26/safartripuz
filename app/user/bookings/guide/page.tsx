"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

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

const statusStyle: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-violet-50 text-violet-700 border-violet-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  DISPUTE: "bg-red-50 text-red-700 border-red-200",
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
        <div className="flex justify-end">
          <button onClick={() => { setPage(1); void load(true); }} className="px-3 py-1.5 rounded-lg text-xs font-black bg-slate-100 border border-slate-200 text-slate-700">
            Yangilash
          </button>
        </div>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border border-slate-100 p-5 space-y-3">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="Bronlar hozircha yo&apos;q" message="Guide bron qilish uchun katalogni tekshiring." ctaHref="/guide" ctaLabel="Guide ko&apos;rish" />
        ) : (
          <>
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{item.listing.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{new Date(item.date).toLocaleDateString()} - {item.startTime} / {item.endTime}</p>
                    <p className="text-sm text-slate-500">Hours: {item.hours} | Group: {item.groupSize}</p>
                    <p className="text-sm font-black text-slate-900 mt-2">{Number(item.totalPrice).toLocaleString()} UZS</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded border text-[10px] font-black uppercase ${statusStyle[item.status] || statusStyle.PENDING}`}>
                    {item.status}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 justify-end">
                  {(item.status === "PENDING" || item.status === "CONFIRMED") && (
                    <button onClick={() => void cancelBooking(item.id)} className="px-3 py-1.5 rounded-lg text-xs font-black bg-red-50 border border-red-200 text-red-700">
                      Cancel
                    </button>
                  )}
                  {item.status === "COMPLETED" && !item.review && (
                    <Link href={`/user/bookings/guide/${item.id}/review`} className="px-3 py-1.5 rounded-lg text-xs font-black bg-blue-50 border border-blue-200 text-blue-700">
                      Baho berish
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {hasMore && (
              <div className="pt-2 text-center">
                <button onClick={() => setPage((p) => p + 1)} className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-sm font-bold text-slate-700">
                  Ko&apos;proq yuklash
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
