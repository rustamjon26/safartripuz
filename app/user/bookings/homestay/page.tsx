"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

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

const statusStyle: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  CHECKED_IN: "bg-violet-50 text-violet-700 border-violet-200",
  CHECKED_OUT: "bg-slate-100 text-slate-600 border-slate-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  DISPUTE: "bg-red-50 text-red-700 border-red-200",
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
              <div key={i} className="bg-white rounded-3xl border border-slate-100 p-5 space-y-3">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Bronlar hozircha yo'q"
            message="HomeStay band qilish uchun katalogni tekshiring."
            ctaHref="/homestay"
            ctaLabel="HomeStay ko'rish"
          />
        ) : (
          items.map((item) => (
            <div key={item.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="md:w-64 h-48 bg-slate-100">
                  {item.listing.images?.[0] ? (
                    <img src={item.listing.images[0]} alt={item.listing.title} className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{item.listing.title}</h3>
                      <p className="text-sm font-semibold text-slate-500">{item.listing.city}</p>
                      <p className="text-sm text-slate-500 mt-2">
                        {new Date(item.checkIn).toLocaleDateString()} - {new Date(item.checkOut).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded border text-[10px] font-black uppercase ${statusStyle[item.status] || statusStyle.PENDING}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 justify-between">
                    <div className="text-lg font-black text-slate-900">
                      {Number(item.totalPrice).toLocaleString()} UZS
                    </div>
                    <div className="flex items-center gap-2">
                      {(item.status === "PENDING" || item.status === "CONFIRMED") && (
                        <button onClick={() => void cancelBooking(item.id)} className="px-3 py-1.5 rounded-lg text-xs font-black bg-red-50 border border-red-200 text-red-700">
                          Cancel
                        </button>
                      )}
                      {item.status === "COMPLETED" && !item.review && (
                        <Link href={`/user/bookings/homestay/${item.id}/review`} className="px-3 py-1.5 rounded-lg text-xs font-black bg-blue-50 border border-blue-200 text-blue-700">
                          Leave Review
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardShell>
  );
}
