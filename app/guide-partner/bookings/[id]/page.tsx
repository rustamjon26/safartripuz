"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import type { ReactNode } from "react";

type Booking = {
  id: string;
  listing: { title: string; category: string; pricePerHour: number };
  guest: { first_name: string; last_name: string; email: string; phone: string };
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  groupSize: number;
  totalPrice: number;
  meetingPoint: string | null;
  status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTE";
  guestNote: string | null;
  guideNote: string | null;
  logs: Array<{
    id: string;
    actorRole: string;
    fromStatus: string;
    toStatus: string;
    note: string | null;
    createdAt: string;
    actor: { first_name: string; last_name: string; role: string } | null;
  }>;
};

export default function GuideBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [guideNote, setGuideNote] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/guide/partner/bookings/${params.id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setBooking(data.data);
        setGuideNote(data.data?.guideNote || "");
        setMeetingPoint(data.data?.meetingPoint || "");
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
    if (booking.status === "PENDING") return { label: "Tasdiqlash", status: "CONFIRMED" as const };
    if (booking.status === "CONFIRMED") return { label: "Boshlash", status: "IN_PROGRESS" as const };
    if (booking.status === "IN_PROGRESS") return { label: "Yakunlash", status: "COMPLETED" as const };
    return null;
  }, [booking]);

  async function saveConfirmedEdits() {
    if (!booking || booking.status !== "CONFIRMED") return;
    setSaving(true);
    try {
      const res = await fetch(`/api/guide/partner/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingPoint, note: guideNote }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "Xatolik");
      toast.success("Booking detail saqlandi");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSaving(false);
    }
  }

  async function runStatusAction() {
    if (!booking || !nextAction) return;
    if (!window.confirm(`Booking statusini ${nextAction.status} ga o'tkazasizmi?`)) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { status: nextAction.status, note: guideNote };
      if (nextAction.status === "CONFIRMED") payload.meetingPoint = meetingPoint || undefined;
      const res = await fetch(`/api/guide/partner/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight">Guide Booking Detail</h1>
        <p className="text-[13px] font-semibold text-slate-500 mt-1">ID: {booking.id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card title="Customer info">
            <p className="font-bold text-slate-800">{booking.guest.first_name} {booking.guest.last_name}</p>
            <p className="text-sm text-slate-500">{booking.guest.email}</p>
            <p className="text-sm text-slate-500">{booking.guest.phone}</p>
          </Card>
          <Card title="Booking info">
            <p className="text-sm"><b>Listing:</b> {booking.listing.title}</p>
            <p className="text-sm"><b>Date:</b> {new Date(booking.date).toLocaleDateString()}</p>
            <p className="text-sm"><b>Time:</b> {booking.startTime} - {booking.endTime}</p>
            <p className="text-sm"><b>Group size:</b> {booking.groupSize}</p>
            <p className="text-sm"><b>Status:</b> <span className="font-black">{booking.status}</span></p>
          </Card>
          <Card title="Pricing breakdown">
            <p className="text-sm"><b>Hourly rate:</b> {Number(booking.listing.pricePerHour).toLocaleString()} UZS</p>
            <p className="text-sm"><b>Hours:</b> {booking.hours}</p>
            <p className="text-sm"><b>Total:</b> {Number(booking.totalPrice).toLocaleString()} UZS</p>
          </Card>
          <Card title="Status timeline">
            <div className="space-y-2">
              {booking.logs.length === 0 ? (
                <p className="text-sm text-slate-500 font-semibold">No logs yet</p>
              ) : (
                booking.logs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-slate-200 p-2">
                    <div className="flex justify-between gap-2">
                      <span className="font-bold text-sm">{log.fromStatus} → {log.toStatus}</span>
                      <span className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">by {log.actor ? `${log.actor.first_name} ${log.actor.last_name}` : "System"} ({log.actorRole})</p>
                    {log.note ? <p className="text-xs text-slate-600 mt-1">{log.note}</p> : null}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Meeting point">
            <textarea
              value={meetingPoint}
              onChange={(e) => setMeetingPoint(e.target.value)}
              disabled={booking.status !== "CONFIRMED" && booking.status !== "PENDING"}
              className="h-input min-h-[110px]"
            />
            {booking.status === "CONFIRMED" && (
              <button onClick={() => void saveConfirmedEdits()} disabled={saving} className="mt-2 w-full px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-sm font-bold">
                Saqlash
              </button>
            )}
          </Card>
          <Card title="Guide note">
            <textarea value={guideNote} onChange={(e) => setGuideNote(e.target.value)} className="h-input min-h-[110px]" />
          </Card>
          <Card title="Action">
            {nextAction ? (
              <button onClick={() => void runStatusAction()} disabled={saving} className="w-full px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-black hover:bg-[var(--secondary)] disabled:opacity-60">
                {saving ? "Saving..." : nextAction.label}
              </button>
            ) : (
              <p className="text-sm text-slate-500 font-semibold">No actions for current status</p>
            )}
          </Card>
          {booking.guestNote && (
            <Card title="Customer note">
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
