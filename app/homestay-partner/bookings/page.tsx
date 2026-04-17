"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

type Booking = {
  id: string;
  listing: { title: string };
  guest: { first_name: string; last_name: string };
  checkIn: string;
  checkOut: string;
  nights: number;
  guestCount: number;
  totalPrice: number;
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "COMPLETED" | "CANCELLED" | "DISPUTE";
};

const tabs = ["ALL", "PENDING", "CONFIRMED", "CHECKED_IN", "COMPLETED"] as const;

export default function HomeStayPartnerBookingsPage() {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<(typeof tabs)[number]>("ALL");
  const [onboarding, setOnboarding] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const query = status === "ALL" ? "" : `?status=${status}`;
      const res = await fetch(`/api/homestay/host/bookings${query}`);
      const data = await res.json();
      if (res.ok && data.onboarding) {
        setOnboarding(true);
        setItems([]);
        return;
      }
      if (res.ok && data.success) setItems(data.data?.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [status]);

  async function act(id: string, action: "confirm" | "checkin" | "checkout") {
    try {
      const res = await fetch(`/api/homestay/host/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "Xatolik");
      toast.success("Status updated");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    }
  }

  const filtered = useMemo(() => items, [items]);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-3">
        <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight">Bookings</h1>
        <p className="text-[13px] font-semibold text-slate-500 mt-1">Status bo'yicha boshqaruv</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatus(tab)}
            className={`px-3 py-2 rounded-lg text-xs font-black border ${
              status === tab
                ? "bg-[var(--bg-light-blue)] text-[var(--accent)] border-[var(--accent)]/30"
                : "bg-white text-slate-500 border-slate-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : onboarding ? (
          <div className="p-6">
            <EmptyState
              title="Avval listing yarating"
              message="Bookinglarni boshqarish uchun kamida bitta active listing bo'lishi kerak."
              ctaHref="/homestay-partner/listings/new"
              ctaLabel="Listing yaratish"
            />
          </div>
        ) : (
          filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Hozircha bronlar yo'q"
                message="Bronlar paydo bo'lishi bilan shu yerda ko'rasiz."
                ctaHref="/homestay-partner/dashboard"
                ctaLabel="Dashboardga qaytish"
              />
            </div>
          ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-3 px-5">Guest</th>
                <th className="py-3 px-5">Listing</th>
                <th className="py-3 px-5">Dates</th>
                <th className="py-3 px-5">Nights</th>
                <th className="py-3 px-5">Guests</th>
                <th className="py-3 px-5">Total</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {filtered.map((b) => (
                  <tr key={b.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 px-5 font-bold text-slate-700">{b.guest.first_name} {b.guest.last_name}</td>
                    <td className="py-3 px-5">{b.listing.title}</td>
                    <td className="py-3 px-5 text-slate-500 font-semibold">
                      {new Date(b.checkIn).toLocaleDateString()} - {new Date(b.checkOut).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-5">{b.nights}</td>
                    <td className="py-3 px-5">{b.guestCount}</td>
                    <td className="py-3 px-5 font-black">{Number(b.totalPrice).toLocaleString()}</td>
                    <td className="py-3 px-5">
                      <span className="px-2 py-1 rounded border text-[10px] font-black uppercase bg-slate-100 text-slate-600 border-slate-200">{b.status}</span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="inline-flex items-center gap-2">
                        {b.status === "PENDING" && (
                          <button onClick={() => void act(b.id, "confirm")} className="px-2.5 py-1 text-xs font-black rounded bg-green-600 text-white">
                            Confirm
                          </button>
                        )}
                        {b.status === "CONFIRMED" && (
                          <button onClick={() => void act(b.id, "checkin")} className="px-2.5 py-1 text-xs font-black rounded bg-amber-500 text-white">
                            Check-in
                          </button>
                        )}
                        {b.status === "CHECKED_IN" && (
                          <button onClick={() => void act(b.id, "checkout")} className="px-2.5 py-1 text-xs font-black rounded bg-slate-700 text-white">
                            Check-out
                          </button>
                        )}
                        <Link href={`/homestay-partner/bookings/${b.id}`} className="px-2.5 py-1 text-xs font-black rounded border border-slate-200 text-slate-600">
                          Detail
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          )
        )}
      </div>
    </div>
  );
}
