"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import type { ReactNode } from "react";

type Booking = {
  id: string;
  listing: { title: string; city: string };
  guest: { first_name: string; last_name: string; email: string; phone: string };
  checkIn: string;
  checkOut: string;
  nights: number;
  guestCount: number;
  totalPrice: number;
  priceSnapshot: Record<string, unknown>;
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "COMPLETED" | "CANCELLED" | "DISPUTE";
  guestNote: string | null;
  hostNote: string | null;
  createdAt: string;
  updatedAt: string;
  logs: Array<{
    id: string;
    actorRole: string;
    fromStatus: string;
    toStatus: string;
    note: string | null;
    createdAt: string;
    actor: { first_name: string; last_name: string; email: string } | null;
  }>;
};

export default function HomeStayBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [hostNote, setHostNote] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/homestay/host/bookings/${params.id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setBooking(data.data);
        setHostNote(data.data?.hostNote || "");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.id) void load();
  }, [params.id]);

  const nextAction = useMemo(() => {
    if (!booking) return null;
    if (booking.status === "PENDING") return { key: "confirm" as const, label: "Confirm" };
    if (booking.status === "CONFIRMED") return { key: "checkin" as const, label: "Check-in" };
    if (booking.status === "CHECKED_IN") return { key: "checkout" as const, label: "Check-out" };
    return null;
  }, [booking]);

  async function runAction() {
    if (!booking || !nextAction) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/homestay/host/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: nextAction.key, hostNote }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "Xatolik");
      toast.success("Booking updated");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-12 text-center text-slate-400 font-bold">Loading...</div>;
  if (!booking) return <div className="p-12 text-center text-red-500 font-bold">Booking not found</div>;

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-3">
        <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight">Booking Detail</h1>
        <p className="text-[13px] font-semibold text-slate-500 mt-1">ID: {booking.id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card title="Guest info">
            <p className="font-bold text-slate-800">{booking.guest.first_name} {booking.guest.last_name}</p>
            <p className="text-sm text-slate-500">{booking.guest.email}</p>
            <p className="text-sm text-slate-500">{booking.guest.phone}</p>
          </Card>
          <Card title="Stay details">
            <p className="text-sm"><b>Listing:</b> {booking.listing.title} ({booking.listing.city})</p>
            <p className="text-sm"><b>Check-in:</b> {new Date(booking.checkIn).toLocaleDateString()}</p>
            <p className="text-sm"><b>Check-out:</b> {new Date(booking.checkOut).toLocaleDateString()}</p>
            <p className="text-sm"><b>Nights:</b> {booking.nights}</p>
            <p className="text-sm"><b>Guests:</b> {booking.guestCount}</p>
          </Card>
          <Card title="Pricing">
            <p className="text-sm"><b>Total:</b> {Number(booking.totalPrice).toLocaleString()} UZS</p>
            <pre className="mt-2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto">{JSON.stringify(booking.priceSnapshot, null, 2)}</pre>
          </Card>
          <Card title="Status history">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span>Created</span><span>{new Date(booking.createdAt).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Current status</span><span className="font-black">{booking.status}</span></div>
              <div className="pt-2 border-t border-slate-200 space-y-2">
                {booking.logs.length === 0 ? (
                  <p className="text-slate-500 font-semibold">No status logs yet</p>
                ) : (
                  booking.logs.map((log) => (
                    <div key={log.id} className="rounded-lg border border-slate-200 p-2">
                      <div className="flex justify-between gap-2">
                        <span className="font-bold">{log.fromStatus} → {log.toStatus}</span>
                        <span className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        by {log.actor ? `${log.actor.first_name} ${log.actor.last_name}` : "System"} ({log.actorRole})
                      </p>
                      {log.note ? <p className="text-xs text-slate-600 mt-1">{log.note}</p> : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Action">
            {nextAction ? (
              <button onClick={() => void runAction()} disabled={saving} className="w-full px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-black hover:bg-[var(--secondary)] disabled:opacity-60">
                {saving ? "Saving..." : nextAction.label}
              </button>
            ) : (
              <p className="text-sm text-slate-500 font-semibold">No actions available for current status</p>
            )}
          </Card>
          <Card title="Host note">
            <textarea value={hostNote} onChange={(e) => setHostNote(e.target.value)} className="h-input min-h-[120px]" placeholder="Yozuv..." />
            <p className="mt-2 text-xs text-slate-400 font-semibold">Note keyingi status action bilan saqlanadi.</p>
          </Card>
          {booking.guestNote && (
            <Card title="Guest note">
              <p className="text-sm text-slate-600">{booking.guestNote}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <h3 className="font-extrabold text-[var(--primary)] text-sm mb-3">{title}</h3>
      {children}
    </div>
  );
}
