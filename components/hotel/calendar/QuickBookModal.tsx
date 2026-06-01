"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Loader2, X } from "lucide-react";
import type { CalendarData, CalendarRoom } from "@/lib/hotel/getCalendarData";

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

type PaymentMethod = "CASH" | "CLICK" | "PAYME" | "UZUM";

type RoomTypeMeta = {
  capacityAdults: number;
  capacityChildren: number;
};

export interface QuickBookModalProps {
  open: boolean;
  hotelId: string;
  roomId: string;
  startDate: string;
  endDate: string;
  onClose: () => void;
  onSuccess: () => void;
}

function parseYmd(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDisplayDate(ymd: string): string {
  const date = parseYmd(ymd);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function formatMoney(value: number): string {
  return `${value.toLocaleString("uz-UZ")} so'm`;
}

const PAYMENT_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "CASH", label: "Naqd" },
  { value: "CLICK", label: "Click" },
  { value: "PAYME", label: "Payme" },
  { value: "UZUM", label: "Uzum" },
];

export default function QuickBookModal({
  open,
  hotelId,
  roomId,
  startDate,
  endDate,
  onClose,
  onSuccess,
}: QuickBookModalProps) {
  const [room, setRoom] = useState<CalendarRoom | null>(null);
  const [roomTypeMeta, setRoomTypeMeta] = useState<RoomTypeMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const checkIn = startDate;
  const checkOut = useMemo(
    () => formatYmd(addDays(parseYmd(endDate), 1)),
    [endDate],
  );
  const nights = useMemo(() => {
    const diff = Math.round(
      (parseYmd(checkOut).getTime() - parseYmd(checkIn).getTime()) / 86400000,
    );
    return Math.max(1, diff);
  }, [checkIn, checkOut]);

  const totalPrice = room ? room.room_type.base_price * nights : 0;

  useEffect(() => {
    if (!open) return;

    setGuestName("");
    setGuestPhone("");
    setAdults(1);
    setChildren(0);
    setNote("");
    setPaymentMethod("CASH");
    setSubmitError(null);
    setRoom(null);
    setRoomTypeMeta(null);
    setMetaError(null);
  }, [open, roomId, startDate, endDate]);

  useEffect(() => {
    if (!open || !hotelId || !roomId) return;

    let cancelled = false;

    async function loadMeta() {
      setMetaLoading(true);
      setMetaError(null);
      try {
        const calRes = await fetch(
          `/api/hotels/${hotelId}/calendar?start=${checkIn}&end=${checkOut}`,
        );
        const calJson = (await calRes.json()) as CalendarData & { error?: string };
        if (!calRes.ok) throw new Error(calJson.error || "Xona ma'lumoti yuklanmadi");

        const found = calJson.rooms.find((item) => item.id === roomId);
        if (!found) throw new Error("Xona topilmadi");

        const rtRes = await fetch(`/api/hotels/${hotelId}/room-types`);
        const rtJson = (await rtRes.json()) as {
          items?: Array<{
            id: string;
            capacityAdults: number;
            capacityChildren: number;
          }>;
          error?: string;
        };
        if (!rtRes.ok) throw new Error(rtJson.error || "Xona turi yuklanmadi");

        const typeMeta = rtJson.items?.find((item) => item.id === found.room_type.id);
        if (!typeMeta) throw new Error("Xona turi topilmadi");

        if (cancelled) return;

        setRoom(found);
        setRoomTypeMeta({
          capacityAdults: typeMeta.capacityAdults,
          capacityChildren: typeMeta.capacityChildren,
        });
      } catch (e) {
        if (!cancelled) {
          setMetaError(e instanceof Error ? e.message : "Ma'lumot yuklanmadi");
        }
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    }

    void loadMeta();
    return () => {
      cancelled = true;
    };
  }, [open, hotelId, roomId, checkIn, checkOut]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!guestName.trim() || !guestPhone.trim()) {
      setSubmitError("Mehmon ismi va telefon majburiy");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/hotels/${hotelId}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: roomId,
          check_in: checkIn,
          check_out: checkOut,
          guest_name: guestName.trim(),
          guest_phone: guestPhone.trim(),
          adults,
          children,
          note: note.trim() || undefined,
          payment_method: paymentMethod,
          status: "CONFIRMED",
        }),
      });

      const json = (await res.json()) as { error?: string; success?: boolean };
      if (!res.ok) {
        throw new Error(json.error || "Bron yaratib bo'lmadi");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Bron yaratib bo'lmadi");
    } finally {
      setSubmitting(false);
    }
  }

  const roomLabel = room ? `${room.room_number} — ${room.room_type.name}` : "—";
  const dateLabel = `${formatDisplayDate(checkIn)} — ${formatDisplayDate(checkOut)} (${nights} tun)`;
  const priceLabel = room ? formatMoney(totalPrice) : "—";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-black text-[var(--primary)] flex items-center gap-2">
              <CalendarCheck className="text-[var(--accent)]" size={20} />
              Tezkor bron
            </h3>
            <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
              Kalendar orqali tanlangan
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {metaLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="animate-spin mr-2" size={18} />
              <span className="text-sm font-bold">Yuklanmoqda…</span>
            </div>
          ) : metaError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {metaError}
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <InfoRow label="Xona" value={roomLabel} />
                <InfoRow label="Sana" value={dateLabel} />
                <InfoRow
                  label="Narx"
                  value={
                    room
                      ? `${formatMoney(room.room_type.base_price)} × ${nights} = ${priceLabel}`
                      : priceLabel
                  }
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 ml-1">
                  Mehmon ismi *
                </label>
                <input
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)] transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 ml-1">
                  Telefon *
                </label>
                <input
                  required
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 ml-1">
                    Kattalar
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={roomTypeMeta?.capacityAdults ?? 99}
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 ml-1">
                    Bolalar
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={roomTypeMeta?.capacityChildren ?? 99}
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 ml-1">
                  Izoh
                </label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)] transition-all resize-none"
                />
              </div>

              <fieldset>
                <legend className="block text-[11px] font-black text-slate-500 uppercase mb-2 ml-1">
                  To&apos;lov turi
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-bold cursor-pointer transition-all ${
                        paymentMethod === option.value
                          ? "border-[var(--accent)] bg-[var(--bg-light-blue)] text-[var(--primary)]"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value={option.value}
                        checked={paymentMethod === option.value}
                        onChange={() => setPaymentMethod(option.value)}
                        className="accent-[var(--accent)]"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {submitError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={submitting || metaLoading || !!metaError}
              className="flex-1 px-4 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-black hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="animate-spin" size={16} /> : null}
              Bron qilish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="font-bold text-slate-400 shrink-0">{label}</span>
      <span className="font-black text-slate-700 text-right">{value}</span>
    </div>
  );
}
