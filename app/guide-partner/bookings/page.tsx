"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

type Booking = {
  id: string;
  guest: { first_name: string; last_name: string } | null;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  groupSize: number;
  totalPrice: number;
  meetingPoint: string | null;
  status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTE";
};

const tabs = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export default function GuidePartnerBookingsPage() {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<(typeof tabs)[number]>("PENDING");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/guide/partner/bookings?status=${status}`);
      const data = await res.json();
      if (res.ok && data.success) setItems((data.data?.data || []) as Booking[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [status]);

  async function act(booking: Booking, action: "confirm" | "reject" | "start" | "complete") {
    const confirmText = {
      confirm: "Bookingni tasdiqlaysizmi?",
      reject: "Bookingni bekor qilasizmi?",
      start: "Safarni boshlaysizmi?",
      complete: "Safarni yakunlaysizmi?",
    }[action];
    if (!window.confirm(confirmText)) return;

    const payloadByAction: Record<typeof action, Record<string, unknown>> = {
      confirm: { status: "CONFIRMED", meetingPoint: booking.meetingPoint || "To be shared by guide" },
      reject: { status: "CANCELLED", cancellationReason: "Rejected by guide" },
      start: { status: "IN_PROGRESS" },
      complete: { status: "COMPLETED" },
    };

    try {
      const res = await fetch(`/api/guide/partner/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadByAction[action]),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "Xatolik");
      toast.success("Status updated");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-3">
        <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight">Guide Bookings</h1>
        <p className="text-[13px] font-semibold text-slate-500 mt-1">Status bo&apos;yicha boshqaruv</p>
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
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Booking yo&apos;q" message="Bu statusda booking topilmadi." ctaHref="/guide-partner/dashboard" ctaLabel="Dashboard" />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5">Time</th>
                <th className="py-3 px-5">Hours</th>
                <th className="py-3 px-5">Group</th>
                <th className="py-3 px-5">Total</th>
                <th className="py-3 px-5">Meeting point</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {items.map((b) => (
                <tr key={b.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-3 px-5 font-bold text-slate-700">{b.guest ? `${b.guest.first_name} ${b.guest.last_name}` : "-"}</td>
                  <td className="py-3 px-5">{new Date(b.date).toLocaleDateString()}</td>
                  <td className="py-3 px-5">{b.startTime} - {b.endTime}</td>
                  <td className="py-3 px-5">{b.hours}</td>
                  <td className="py-3 px-5">{b.groupSize}</td>
                  <td className="py-3 px-5 font-black">{Number(b.totalPrice).toLocaleString()}</td>
                  <td className="py-3 px-5">{b.meetingPoint || "-"}</td>
                  <td className="py-3 px-5 text-right">
                    <div className="inline-flex items-center gap-2">
                      {b.status === "PENDING" && (
                        <>
                          <button onClick={() => void act(b, "confirm")} className="px-2.5 py-1 text-xs font-black rounded bg-green-600 text-white">Tasdiqlash</button>
                          <button onClick={() => void act(b, "reject")} className="px-2.5 py-1 text-xs font-black rounded bg-red-600 text-white">Rad etish</button>
                        </>
                      )}
                      {b.status === "CONFIRMED" && (
                        <button onClick={() => void act(b, "start")} className="px-2.5 py-1 text-xs font-black rounded bg-amber-500 text-white">Boshlash</button>
                      )}
                      {b.status === "IN_PROGRESS" && (
                        <button onClick={() => void act(b, "complete")} className="px-2.5 py-1 text-xs font-black rounded bg-slate-700 text-white">Yakunlash</button>
                      )}
                      <Link href={`/guide-partner/bookings/${b.id}`} className="px-2.5 py-1 text-xs font-black rounded border border-slate-200 text-slate-600">Detail</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
