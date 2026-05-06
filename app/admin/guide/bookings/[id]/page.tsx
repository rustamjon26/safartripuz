"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { formatDateTime } from "@/lib/formatDate";
import { AdminGuideBookingStatusBadge } from "@/components/admin/guide/AdminGuideBookingStatusBadge";

type Log = {
  id: string;
  actorRole: string;
  fromStatus: string;
  toStatus: string;
  note: string | null;
  createdAt: string;
  actor: { first_name: string; last_name: string; email: string; role: string } | null;
};

type Booking = {
  id: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  groupSize: number;
  hourlyRate: unknown;
  totalPrice: unknown;
  meetingPoint: string | null;
  guestNote: string | null;
  guideNote: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  listing: {
    id: string;
    title: string;
    category: string;
    meetingPoint: string | null;
    host: { first_name: string; last_name: string; email: string; phone: string } | null;
  };
  guide: { first_name: string; last_name: string; email: string; phone: string } | null;
  guest: { first_name: string; last_name: string; email: string; phone: string } | null;
  logs: Log[];
};

function roleBadgeLabel(role: string) {
  if (role === "admin" || role === "super_admin") return "Admin";
  if (role === "system") return "Tizim";
  if (role === "user" || role === "guest" || role === "customer") return "Mijoz";
  if (role === "guide") return "Guide";
  return role;
}

const ALL_STATUSES = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DISPUTE"] as const;

export default function AdminGuideBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [nextStatus, setNextStatus] = useState("");
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [disputeResolution, setDisputeResolution] = useState<"REFUND" | "RELEASE" | "SPLIT">("REFUND");
  const [disputeNote, setDisputeNote] = useState("");
  const [disputeConfirmOpen, setDisputeConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/guide/bookings/${params.id}`);
      const json = await res.json();
      if (res.ok) {
        const b = json.booking ?? null;
        setBooking(b);
        setNextStatus(b?.status ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) void load();
  }, [params.id, load]);

  const timelineLogs = useMemo(() => {
    if (!booking?.logs) return [];
    return [...booking.logs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [booking?.logs]);

  async function forceChange() {
    if (!booking || !nextStatus) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/guide/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Xatolik");
      toast.success("Holat yangilandi");
      setConfirmOpen(false);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSaving(false);
    }
  }

  async function resolveDispute() {
    if (!booking) return;
    if (!disputeNote.trim()) {
      toast.error("Izoh majburiy");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/guide/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: disputeResolution, note: disputeNote }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Xatolik");
      toast.success("Nizo hal qilindi");
      setDisputeConfirmOpen(false);
      setDisputeNote("");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="adm-card border-none shadow-xl p-10 text-center text-slate-400 font-bold bg-white">
        Yuklanmoqda...
      </div>
    );
  }
  if (!booking) {
    return (
      <div className="adm-card border-none shadow-xl p-10 text-center text-red-600 font-bold bg-white">
        Bron topilmadi
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/admin/guide/bookings"
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
            aria-label="Orqaga"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bron</h1>
            <p className="text-sm font-bold text-slate-400 mt-1">ID: {booking.id}</p>
            <div className="mt-2">
              <AdminGuideBookingStatusBadge status={booking.status} large />
            </div>
          </div>
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-card-header bg-white border-b border-slate-50">
          <span className="text-lg font-black text-slate-900 tracking-tight">Asosiy</span>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Mijoz</div>
            <div className="font-bold text-slate-900 mt-1">
              {booking.guest ? `${booking.guest.first_name} ${booking.guest.last_name}` : "—"}
            </div>
            <div className="text-xs text-slate-500 mt-1">{booking.guest?.email}</div>
            <div className="text-xs text-slate-500">{booking.guest?.phone}</div>
          </div>
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Guide</div>
            <div className="font-bold text-slate-900 mt-1">
              {booking.guide ? `${booking.guide.first_name} ${booking.guide.last_name}` : "—"}
            </div>
            <div className="text-xs text-slate-500 mt-1">{booking.guide?.email}</div>
            <div className="text-xs text-slate-500">{booking.guide?.phone}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs font-black text-slate-400 uppercase">Listing</div>
            <div className="font-black text-slate-900 mt-1">{booking.listing.title}</div>
            <div className="text-xs text-slate-500 mt-1">{booking.listing.category}</div>
          </div>
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Sana</div>
            <div className="font-bold text-slate-800 mt-1">{formatDateTime(booking.date)}</div>
          </div>
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Vaqt</div>
            <div className="font-bold text-slate-800 mt-1">
              {booking.startTime} – {booking.endTime}
            </div>
          </div>
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Soatlar / guruh</div>
            <div className="font-bold text-slate-800 mt-1">
              {booking.hours} soat • {booking.groupSize} kishi
            </div>
          </div>
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Uchrashuv nuqtasi</div>
            <div className="font-bold text-slate-800 mt-1">{booking.meetingPoint || booking.listing.meetingPoint || "—"}</div>
          </div>
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/60">
              <div className="text-xs font-black text-slate-400 uppercase">Mijoz eslatmasi</div>
              <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{booking.guestNote || "—"}</div>
            </div>
            <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/60">
              <div className="text-xs font-black text-slate-400 uppercase">Guide / tizim eslatmasi</div>
              <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{booking.guideNote || "—"}</div>
            </div>
          </div>
          {booking.cancellationReason ? (
            <div className="md:col-span-2 text-sm text-rose-800 font-bold">
              Bekor sababi: {booking.cancellationReason}
            </div>
          ) : null}
          <div className="md:col-span-2 flex flex-wrap gap-6">
            <div>
              <div className="text-xs font-black text-slate-400 uppercase">Soatlik tarif</div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {Number(booking.hourlyRate).toLocaleString()} {"so'm"}
              </div>
            </div>
            <div>
              <div className="text-xs font-black text-slate-400 uppercase">Jami</div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {Number(booking.totalPrice).toLocaleString()} {"so'm"}
              </div>
            </div>
          </div>
          <div className="md:col-span-2 text-xs font-bold text-slate-500">
            Yaratilgan: {formatDateTime(booking.createdAt)} • Yangilangan: {formatDateTime(booking.updatedAt)}
          </div>
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-card-header bg-white border-b border-slate-50">
          <span className="text-lg font-black text-slate-900 tracking-tight">Holat jadvali (GuideBookingLog)</span>
        </div>
        <div className="p-6 space-y-3">
          {timelineLogs.length === 0 ? (
            <p className="text-sm font-bold text-slate-400">{"Loglar yo'q"}</p>
          ) : (
            timelineLogs.map((log) => (
              <div key={log.id} className="flex gap-3 border border-slate-100 rounded-xl p-4 bg-white">
                <div className="w-2 rounded-full bg-slate-900 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {roleBadgeLabel(log.actorRole)}
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {log.fromStatus} → {log.toStatus}
                    </span>
                    <span className="text-xs font-bold text-slate-400 ml-auto">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                  {log.note ? <p className="text-sm text-slate-600 mt-2">{log.note}</p> : null}
                  {log.actor ? (
                    <p className="text-xs text-slate-400 mt-1">
                      {log.actor.first_name} {log.actor.last_name}
                    </p>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {["COMPLETED", "CANCELLED"].includes(booking.status) ? null : (
        <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
          <div className="adm-card-header bg-white border-b border-slate-50">
            <span className="text-lg font-black text-slate-900 tracking-tight">{"Majburiy holat o'zgarishi"}</span>
          </div>
          <div className="p-6 space-y-3">
            <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} className="h-input w-full max-w-md">
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-input min-h-[100px] w-full max-w-xl"
              placeholder="Sabab (ixtiyoriy)"
            />
            <button type="button" onClick={() => setConfirmOpen(true)} className="adm-btn adm-btn-primary">
              {"O'zgartirish"}
            </button>
          </div>
        </div>
      )}

      {booking.status === "DISPUTE" ? (
        <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
          <div className="adm-card-header bg-white border-b border-slate-50">
            <span className="text-lg font-black text-slate-900 tracking-tight">Nizo hal qilish</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                className={`adm-btn flex-1 ${disputeResolution === "REFUND" ? "adm-btn-primary" : ""}`}
                onClick={() => setDisputeResolution("REFUND")}
              >
                Mijozga qaytarish
              </button>
              <button
                type="button"
                className={`adm-btn flex-1 ${disputeResolution === "RELEASE" ? "adm-btn-primary" : ""}`}
                onClick={() => setDisputeResolution("RELEASE")}
              >
                {"Guidega o'tkazish"}
              </button>
              <button
                type="button"
                className={`adm-btn flex-1 ${disputeResolution === "SPLIT" ? "adm-btn-primary" : ""}`}
                onClick={() => setDisputeResolution("SPLIT")}
              >
                Taqsimlash
              </button>
            </div>
            <textarea
              value={disputeNote}
              onChange={(e) => setDisputeNote(e.target.value)}
              className="h-input min-h-[120px] w-full"
              placeholder="Izoh (majburiy)"
            />
            <button type="button" onClick={() => setDisputeConfirmOpen(true)} className="adm-btn adm-btn-primary">
              Hal qilish
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={confirmOpen}
        title="Majburiy holat o'zgarishi"
        description="Quyidagi ekskursiya bronu holati admin tomonidan o'zgartiriladi."
        subjectName={`#${booking.id.slice(-8)} — ${booking.status} → ${nextStatus}`}
        confirmLoading={saving}
        confirmDanger
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void forceChange()}
      />

      <ConfirmModal
        open={disputeConfirmOpen}
        title="Nizoni hal qilish"
        description="Tanlangan yechim va izoh bilan nizo yakuniy yopiladi."
        subjectName={`#${booking.id.slice(-8)} — ${disputeResolution}`}
        confirmLoading={saving}
        confirmDanger
        onCancel={() => setDisputeConfirmOpen(false)}
        onConfirm={() => void resolveDispute()}
      />
    </div>
  );
}
