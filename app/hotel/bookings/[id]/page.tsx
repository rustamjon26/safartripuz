"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { hotelFetch } from "@/app/hotel/_lib/hotelFetch";
import {
  ArrowLeft,
  BedDouble,
  CalendarDays,
  ChevronRight,
  Clock,
  CreditCard,
  Loader2,
  Pencil,
  Phone,
  Printer,
  User,
  X,
} from "lucide-react";
import type { BookingDetail } from "@/lib/hotel/getBookingDetail";
import { ROOM_AMENITY_OPTIONS } from "@/lib/hotel/roomTypeSchema";

type BookingStatus = BookingDetail["status"];

type PendingAction = {
  status: "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED";
  label: string;
  confirmText: string;
  variant: "primary" | "danger" | "neutral";
};

const MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
] as const;

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  HELD: "bg-yellow-100 text-yellow-800 border-yellow-200",
  PAID: "bg-teal-100 text-teal-800 border-teal-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  CHECKED_IN: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
  COMPLETED: "bg-slate-100 text-slate-700 border-slate-200",
  REFUNDED: "bg-orange-100 text-orange-800 border-orange-200",
  NO_SHOW: "bg-orange-100 text-orange-800 border-orange-200",
  EXPIRED: "bg-slate-100 text-slate-500 border-slate-200",
};

const PAYMENT_STATUS_STYLES = {
  PAID: "bg-green-100 text-green-800 border-green-200",
  PARTIAL: "bg-amber-100 text-amber-800 border-amber-200",
  UNPAID: "bg-red-100 text-red-800 border-red-200",
} as const;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Naqd",
  CLICK: "Click",
  PAYME: "Payme",
  UZUM: "Uzum",
  CARD: "Karta",
  TRANSFER: "O'tkazma",
};

function formatMoney(value: number) {
  return `${value.toLocaleString("uz-UZ")} so'm`;
}

function formatDisplayDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString("uz-UZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function amenityLabel(id: string) {
  return ROOM_AMENITY_OPTIONS.find((item) => item.id === id)?.label ?? id.toUpperCase();
}

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 10)}…` : id;
}

function getActions(status: BookingStatus): PendingAction[] {
  switch (status) {
    case "PENDING":
      return [
        {
          status: "CONFIRMED",
          label: "Tasdiqlash",
          confirmText: "Bronni tasdiqlaysizmi?",
          variant: "primary",
        },
        {
          status: "CANCELLED",
          label: "Bekor qilish",
          confirmText: "Bronni bekor qilasizmi?",
          variant: "danger",
        },
      ];
    case "CONFIRMED":
      return [
        {
          status: "CHECKED_IN",
          label: "Check-in",
          confirmText: "Mehmonni check-in qilasizmi?",
          variant: "primary",
        },
        {
          status: "CANCELLED",
          label: "Bekor qilish",
          confirmText: "Bronni bekor qilasizmi?",
          variant: "danger",
        },
      ];
    case "CHECKED_IN":
      return [
        {
          status: "COMPLETED",
          label: "Check-out",
          confirmText: "Mehmonni check-out qilasizmi? (COMPLETED)",
          variant: "primary",
        },
      ];
    default:
      return [];
  }
}

function Card({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden ${className}`}
    >
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
        {icon}
        <h2 className="text-[12px] font-black text-slate-500 uppercase tracking-widest">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SkeletonPage() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-slate-200 rounded-xl w-2/3" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-5">
          <div className="h-48 bg-slate-200 rounded-2xl" />
          <div className="h-40 bg-slate-200 rounded-2xl" />
        </div>
        <div className="space-y-5">
          <div className="h-48 bg-slate-200 rounded-2xl" />
          <div className="h-40 bg-slate-200 rounded-2xl" />
        </div>
      </div>
      <div className="h-56 bg-slate-200 rounded-2xl" />
    </div>
  );
}

export default function HotelBookingDetailPage() {
  const params = useParams();
  const bookingId = String(params.id ?? "");

  const [hotelId, setHotelId] = useState("");
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const [editingGuest, setEditingGuest] = useState(false);
  const [guestForm, setGuestForm] = useState({ name: "", phone: "", note: "" });
  const [guestSaving, setGuestSaving] = useState(false);

  const loadBooking = useCallback(async (hid: string) => {
    const res = await hotelFetch(`/api/hotels/${hid}/bookings/${bookingId}`);
    const data = (await res.json()) as BookingDetail & { error?: string };
    if (!res.ok) {
      throw new Error(data.error || "Bron topilmadi");
    }
    setBooking(data);
    setGuestForm({
      name: data.guest.name,
      phone: data.guest.phone ?? "",
      note: data.guest.note ?? "",
    });
  }, [bookingId]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const meRes = await hotelFetch("/api/hotel/me");
        const meData = (await meRes.json()) as { hotel?: { id: string } };
        if (!meRes.ok || !meData.hotel?.id) {
          throw new Error("Mehmonxona topilmadi");
        }
        if (cancelled) return;
        setHotelId(meData.hotel.id);
        await loadBooking(meData.hotel.id);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Bron topilmadi");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [loadBooking]);

  const sortedHistory = useMemo(() => {
    if (!booking) return [];
    return [...booking.history].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [booking]);

  async function handleStatusChange(action: PendingAction) {
    if (!hotelId) return;
    setActionLoading(true);
    try {
      const res = await hotelFetch(`/api/hotels/${hotelId}/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action.status }),
      });
      const data = (await res.json()) as BookingDetail & { error?: string };
      if (!res.ok) throw new Error(data.error || "Status o'zgartirilmadi");
      setBooking(data);
      toast.success("Status yangilandi");
      setPendingAction(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Status o'zgartirilmadi");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleGuestSave(e: React.FormEvent) {
    e.preventDefault();
    if (!hotelId || !booking) return;
    setGuestSaving(true);
    try {
      const res = await hotelFetch(`/api/hotels/${hotelId}/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_name: guestForm.name.trim(),
          guest_phone: guestForm.phone.trim(),
          note: guestForm.note.trim() || undefined,
          adults: booking.guest.adults,
          children: booking.guest.children,
        }),
      });
      const data = (await res.json()) as BookingDetail & { error?: string };
      if (!res.ok) throw new Error(data.error || "Saqlab bo'lmadi");
      setBooking(data);
      setEditingGuest(false);
      toast.success("Mehmon ma'lumotlari yangilandi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Saqlab bo'lmadi");
    } finally {
      setGuestSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <SkeletonPage />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <p className="text-lg font-black text-slate-700 mb-4">{error || "Bron topilmadi"}</p>
        <Link
          href="/hotel/bookings"
          className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)] hover:underline"
        >
          <ArrowLeft size={16} />
          Bronlar ro'yxatiga qaytish
        </Link>
      </div>
    );
  }

  const actions = getActions(booking.status);
  const showPrintOnly = booking.status === "COMPLETED" || booking.status === "CANCELLED";

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
          <div className="space-y-2">
            <nav className="flex items-center gap-2 text-[12px] font-bold text-slate-400 flex-wrap">
              <Link href="/hotel/bookings" className="inline-flex items-center gap-1 hover:text-[var(--primary)]">
                <ArrowLeft size={14} />
                Bronlar
              </Link>
              <ChevronRight size={14} />
              <span className="text-slate-600">Bron #{shortId(booking.id)}</span>
            </nav>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-[var(--primary)]">
                Bron #{shortId(booking.id)}
              </h1>
              <span
                className={`inline-flex px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${STATUS_STYLES[booking.status]}`}
              >
                {booking.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {actions.map((action) => (
              <button
                key={action.status}
                type="button"
                onClick={() => setPendingAction(action)}
                className={`px-4 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-wide transition-all ${
                  action.variant === "danger"
                    ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                    : "bg-[var(--primary)] text-white hover:opacity-90"
                }`}
              >
                {action.label}
              </button>
            ))}
            {showPrintOnly && (
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-wide bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Printer size={14} />
                Ko'chirish
              </button>
            )}
          </div>
        </header>

        {/* Print header */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-black text-slate-900">Bron #{booking.id}</h1>
          <p className="text-sm text-slate-600">{booking.status}</p>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 print-area">
          <div className="space-y-5">
            <Card title="Mehmon ma'lumotlari" icon={<User size={16} className="text-[var(--accent)]" />}>
              {editingGuest ? (
                <form onSubmit={handleGuestSave} className="space-y-4 no-print">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">Ism</label>
                    <input
                      required
                      value={guestForm.name}
                      onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">Telefon</label>
                    <input
                      required
                      value={guestForm.phone}
                      onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">Izoh</label>
                    <textarea
                      rows={3}
                      value={guestForm.note}
                      onChange={(e) => setGuestForm({ ...guestForm, note: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)] resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGuest(false);
                        setGuestForm({
                          name: booking.guest.name,
                          phone: booking.guest.phone ?? "",
                          note: booking.guest.note ?? "",
                        });
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600"
                    >
                      Bekor
                    </button>
                    <button
                      type="submit"
                      disabled={guestSaving}
                      className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-black disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {guestSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                      Saqlash
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase mb-1">Ism</p>
                    <p className="text-lg font-black text-slate-800">{booking.guest.name}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase mb-1">Telefon</p>
                    {booking.guest.phone ? (
                      <a
                        href={`tel:${booking.guest.phone}`}
                        className="inline-flex items-center gap-2 text-base font-bold text-[var(--primary)] hover:underline"
                      >
                        <Phone size={16} />
                        {booking.guest.phone}
                      </a>
                    ) : (
                      <p className="text-sm font-bold text-slate-400">—</p>
                    )}
                  </div>
                  <div className="flex gap-6">
                    <div>
                      <p className="text-[11px] font-black text-slate-400 uppercase mb-1">Kattalar</p>
                      <p className="text-base font-black text-slate-800">{booking.guest.adults}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-400 uppercase mb-1">Bolalar</p>
                      <p className="text-base font-black text-slate-800">{booking.guest.children}</p>
                    </div>
                  </div>
                  {booking.guest.note && (
                    <div>
                      <p className="text-[11px] font-black text-slate-400 uppercase mb-1">Izoh</p>
                      <p className="text-sm font-bold text-slate-600 whitespace-pre-wrap">{booking.guest.note}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingGuest(true)}
                    className="no-print inline-flex items-center gap-2 text-[12px] font-black text-[var(--accent)] hover:underline uppercase"
                  >
                    <Pencil size={14} />
                    Tahrirlash
                  </button>
                </div>
              )}
            </Card>

            <Card title="Sanalar" icon={<CalendarDays size={16} className="text-[var(--accent)]" />}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase mb-1">Check-in</p>
                  <p className="text-xl font-black text-slate-800">
                    {formatDisplayDate(booking.dates.check_in)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase mb-1">Check-out</p>
                  <p className="text-xl font-black text-slate-800">
                    {formatDisplayDate(booking.dates.check_out)}
                  </p>
                </div>
              </div>
              <p className="text-base font-black text-[var(--primary)] mb-3">
                {booking.dates.nights} tun
              </p>
              <p className="text-[12px] font-bold text-slate-400 inline-flex items-center gap-2">
                <Clock size={14} />
                Yaratilgan: {formatDateTime(booking.dates.created_at)}
              </p>
            </Card>
          </div>

          <div className="space-y-5">
            <Card title="Xona" icon={<BedDouble size={16} className="text-[var(--accent)]" />}>
              {booking.room.room_number ? (
                <>
                  <p className="text-4xl font-black text-[var(--primary)] mb-1">
                    {booking.room.room_number}
                  </p>
                  <p className="text-base font-bold text-slate-600 mb-1">{booking.room.room_type.name}</p>
                  {booking.room.floor && (
                    <p className="text-sm font-bold text-slate-400 mb-4">{booking.room.floor}-qavat</p>
                  )}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {booking.room.room_type.amenities.map((item) => (
                      <span
                        key={item}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-[10px] font-black uppercase text-slate-600 border border-slate-200"
                      >
                        {amenityLabel(item)}
                      </span>
                    ))}
                  </div>
                  {booking.room.id && (
                    <Link
                      href={`/hotel/rooms?highlight=${booking.room.id}`}
                      className="no-print text-[12px] font-black text-[var(--accent)] hover:underline uppercase"
                    >
                      Xonani ko'rish →
                    </Link>
                  )}
                </>
              ) : (
                <p className="text-sm font-bold text-slate-400">Xona biriktirilmagan</p>
              )}
            </Card>

            <Card title="To'lov" icon={<CreditCard size={16} className="text-[var(--accent)]" />}>
              <p className="text-3xl font-black text-[var(--primary)] mb-4">
                {formatMoney(booking.payment.total_amount)}
              </p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase mb-1">To'langan</p>
                  <p className="text-base font-black text-green-700">
                    {formatMoney(booking.payment.paid_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase mb-1">Qoldiq</p>
                  <p className="text-base font-black text-slate-800">
                    {formatMoney(booking.payment.remaining)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase border bg-slate-100 text-slate-700 border-slate-200">
                  {PAYMENT_METHOD_LABELS[booking.payment.method] ?? booking.payment.method}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-black uppercase border ${PAYMENT_STATUS_STYLES[booking.payment.status]}`}
                >
                  {booking.payment.status}
                </span>
              </div>
              <button
                type="button"
                disabled
                title="Keyingi fazada"
                className="no-print px-4 py-2 rounded-xl border border-dashed border-slate-300 text-[12px] font-black text-slate-400 uppercase cursor-not-allowed"
              >
                To'lov qo'shish
                {/* TODO: keyingi fazada to'lov qo'shish modali */}
              </button>
            </Card>
          </div>
        </div>

        {/* History */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden no-print">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
            <h2 className="text-[12px] font-black text-slate-500 uppercase tracking-widest">Tarix</h2>
          </div>
          <div className="p-5">
            {sortedHistory.length === 0 ? (
              <p className="text-sm font-bold text-slate-400 text-center py-6">Tarix mavjud emas</p>
            ) : (
              <ul className="space-y-4">
                {sortedHistory.map((item, index) => (
                  <li
                    key={`${item.timestamp}-${item.action}-${index}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-black text-slate-800">{item.action}</p>
                      <p className="text-[12px] font-bold text-slate-400">{item.by}</p>
                    </div>
                    <p className="text-[12px] font-bold text-slate-500 shrink-0">
                      {formatDateTime(item.timestamp)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Confirm dialog */}
      {pendingAction && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 no-print">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-[var(--primary)]">{pendingAction.label}</h3>
                <p className="text-sm font-bold text-slate-500 mt-2">{pendingAction.confirmText}</p>
              </div>
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-black text-slate-600"
              >
                Yo'q
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void handleStatusChange(pendingAction)}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-black text-white disabled:opacity-50 inline-flex items-center justify-center gap-2 ${
                  pendingAction.variant === "danger" ? "bg-red-600" : "bg-[var(--primary)]"
                }`}
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                Ha, davom etish
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
