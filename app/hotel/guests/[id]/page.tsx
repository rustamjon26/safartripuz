"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { hotelFetch } from "@/app/hotel/_lib/hotelFetch";
import {
  ArrowLeft,
  Ban,
  BedDouble,
  CalendarDays,
  ChevronRight,
  Loader2,
  MoreVertical,
  Pencil,
  Star,
  Trash2,
  User,
  X,
} from "lucide-react";
import type { BookingStatus } from "@prisma/client";
import type { GuestDetail } from "@/lib/hotel/hotelGuestService";

type PersonalForm = {
  fullName: string;
  phone: string;
  email: string;
  passportId: string;
  nationality: string;
  birthDate: string;
  gender: "" | "MALE" | "FEMALE";
  address: string;
  notes: string;
};

type ConfirmAction =
  | { type: "blacklist_add" }
  | { type: "blacklist_remove" }
  | { type: "delete" };

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

const NATIONALITY_OPTIONS = [
  { value: "UZ", label: "O'zbekiston" },
  { value: "RU", label: "Rossiya" },
  { value: "KZ", label: "Qozog'iston" },
  { value: "TJ", label: "Tojikiston" },
  { value: "KG", label: "Qirg'iziston" },
  { value: "OTHER", label: "Boshqa" },
];

function formatMoney(value: number) {
  return `${value.toLocaleString("uz-UZ")} so'm`;
}

function formatDisplayDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const months = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];
  return `${d}-${months[m - 1]}-${y}`;
}

function calcNights(checkIn: string, checkOut: string) {
  return Math.max(
    1,
    Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000),
  );
}

function calcAge(birthDate: string) {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

function guestToForm(guest: GuestDetail): PersonalForm {
  return {
    fullName: guest.full_name,
    phone: guest.phone,
    email: guest.email ?? "",
    passportId: guest.passport_id ?? "",
    nationality: guest.nationality ?? "UZ",
    birthDate: guest.birth_date ?? "",
    gender: (guest.gender as PersonalForm["gender"]) ?? "",
    address: guest.address ?? "",
    notes: guest.notes ?? "",
  };
}

function appendReasonNote(existing: string | null, reason: string) {
  const line = `[${new Date().toLocaleString("uz-UZ")}] ${reason.trim()}`;
  return existing?.trim() ? `${existing.trim()}\n${line}` : line;
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
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
          <div className="h-72 bg-slate-200 rounded-2xl" />
          <div className="h-48 bg-slate-200 rounded-2xl" />
        </div>
        <div className="space-y-5">
          <div className="h-64 bg-slate-200 rounded-2xl" />
          <div className="h-40 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function HotelGuestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const guestId = String(params.id ?? "");

  const [hotelId, setHotelId] = useState("");
  const [userRole, setUserRole] = useState("");
  const [guest, setGuest] = useState<GuestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PersonalForm | null>(null);
  const [saving, setSaving] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const canManageVip =
    userRole === "hotel_manager" || userRole === "admin" || userRole === "super_admin";
  const canManageBlacklist = userRole === "admin" || userRole === "super_admin";

  const isDirty = useMemo(() => {
    if (!guest || !form) return false;
    return JSON.stringify(form) !== JSON.stringify(guestToForm(guest));
  }, [guest, form]);

  const avgPerVisit = useMemo(() => {
    if (!guest || guest.visit_count <= 0) return 0;
    return Math.round(guest.total_spent / guest.visit_count);
  }, [guest]);

  const loadGuest = useCallback(async (hid: string) => {
    const res = await hotelFetch(`/api/hotels/${hid}/guests/${guestId}`);
    const data = (await res.json()) as GuestDetail & { error?: string };
    if (!res.ok) throw new Error(data.error || "Mehmon topilmadi");
    setGuest(data);
    setForm(guestToForm(data));
  }, [guestId]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const [meRes, userRes] = await Promise.all([
          hotelFetch("/api/hotel/me"),
          hotelFetch("/api/user/me"),
        ]);
        const meData = (await meRes.json()) as { hotel?: { id: string } };
        const userData = (await userRes.json()) as { user?: { role: string } };

        if (!meRes.ok || !meData.hotel?.id) throw new Error("Mehmonxona topilmadi");
        if (cancelled) return;

        setHotelId(meData.hotel.id);
        setUserRole(userData.user?.role ?? "");
        await loadGuest(meData.hotel.id);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Mehmon topilmadi");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [loadGuest]);

  async function patchGuest(body: Record<string, unknown>) {
    if (!hotelId) return null;
    const res = await hotelFetch(`/api/hotels/${hotelId}/guests/${guestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as GuestDetail & { error?: string };
    if (!res.ok) throw new Error(data.error || "Saqlab bo'lmadi");
    setGuest(data);
    setForm(guestToForm(data));
    return data;
  }

  async function handleSavePersonal(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !guest) return;
    setSaving(true);
    try {
      await patchGuest({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        passportId: form.passportId.trim() || null,
        nationality: form.nationality || null,
        birthDate: form.birthDate || null,
        gender: form.gender || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      });
      setEditing(false);
      toast.success("Ma'lumotlar saqlandi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Saqlab bo'lmadi");
    } finally {
      setSaving(false);
    }
  }

  async function handleVipToggle(next: boolean) {
    if (!guest || !canManageVip) return;
    if (!flagReason.trim()) {
      toast.error("O'zgartirish sababini kiriting");
      return;
    }
    setActionLoading(true);
    try {
      await patchGuest({
        isVip: next,
        notes: appendReasonNote(guest.notes, `VIP ${next ? "yoqildi" : "o'chirildi"}: ${flagReason}`),
      });
      setFlagReason("");
      toast.success("VIP holati yangilandi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmAction() {
    if (!guest || !confirmAction) return;
    if (!flagReason.trim() && confirmAction.type !== "delete") {
      toast.error("Sababni kiriting");
      return;
    }

    setActionLoading(true);
    try {
      if (confirmAction.type === "delete") {
        const res = await hotelFetch(`/api/hotels/${hotelId}/guests/${guestId}`, { method: "DELETE" });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "O'chirib bo'lmadi");
        toast.success("Mehmon o'chirildi");
        router.push("/hotel/guests");
        return;
      }

      if (confirmAction.type === "blacklist_add") {
        await patchGuest({
          isBlacklist: true,
          notes: appendReasonNote(guest.notes, `Qora ro'yxat: ${flagReason}`),
        });
        toast.success("Qora ro'yxatga qo'shildi");
      }

      if (confirmAction.type === "blacklist_remove") {
        await patchGuest({
          isBlacklist: false,
          notes: appendReasonNote(guest.notes, `Qora ro'yxatdan olib tashlandi: ${flagReason}`),
        });
        toast.success("Qora ro'yxatdan olib tashlandi");
      }

      setConfirmAction(null);
      setFlagReason("");
      setMenuOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <SkeletonPage />
      </div>
    );
  }

  if (error || !guest || !form) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <p className="text-lg font-black text-slate-700 mb-4">{error || "Mehmon topilmadi"}</p>
        <Link
          href="/hotel/guests"
          className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)] hover:underline"
        >
          <ArrowLeft size={16} />
          Mehmonlar ro'yxatiga qaytish
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <nav className="flex items-center gap-2 text-[12px] font-bold text-slate-400 flex-wrap">
            <Link href="/hotel/guests" className="inline-flex items-center gap-1 hover:text-[var(--primary)]">
              <ArrowLeft size={14} />
              Mehmonlar
            </Link>
            <ChevronRight size={14} />
            <span className="text-slate-600">{guest.full_name}</span>
          </nav>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-[var(--primary)]">{guest.full_name}</h1>
            {guest.is_vip && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-black uppercase">
                <Star size={12} className="fill-amber-500 text-amber-500" />
                VIP
              </span>
            )}
            {guest.is_blacklist && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-800 border border-red-200 text-[11px] font-black uppercase">
                <Ban size={12} />
                Blacklist
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap relative">
          <button
            type="button"
            onClick={() => setEditing((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-[12px] font-black uppercase text-slate-700 hover:bg-slate-50"
          >
            <Pencil size={14} />
            Tahrirlash
          </button>
          <Link
            href={`/hotel/calendar?guestId=${guest.id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-[12px] font-black uppercase hover:opacity-90"
          >
            <CalendarDays size={14} />
            Bron qo'shish →
          </Link>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              <MoreVertical size={18} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
                {!guest.is_blacklist && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmAction({ type: "blacklist_add" });
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-50"
                  >
                    Qora ro'yxatga qo'shish
                  </button>
                )}
                {guest.is_blacklist && canManageBlacklist && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmAction({ type: "blacklist_remove" });
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Qora ro'yxatdan olib tashlash
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setConfirmAction({ type: "delete" });
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  O'chirish
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column */}
        <div className="space-y-5">
          <Card title="Shaxsiy ma'lumotlar" icon={<User size={16} className="text-[var(--accent)]" />}>
            <form onSubmit={handleSavePersonal} className="space-y-4">
              <Field label="Ism" editing={editing}>
                {editing ? (
                  <input
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <p className={valueClass}>{guest.full_name}</p>
                )}
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Telefon" editing={editing}>
                  {editing ? (
                    <input
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className={inputClass}
                    />
                  ) : (
                    <a href={`tel:${guest.phone}`} className={`${valueClass} text-[var(--primary)] hover:underline`}>
                      {guest.phone}
                    </a>
                  )}
                </Field>
                <Field label="Email" editing={editing}>
                  {editing ? (
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={inputClass}
                    />
                  ) : (
                    <p className={valueClass}>{guest.email || "—"}</p>
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Pasport raqami" editing={editing}>
                  {editing ? (
                    <input
                      value={form.passportId}
                      onChange={(e) => setForm({ ...form, passportId: e.target.value })}
                      className={inputClass}
                    />
                  ) : (
                    <p className={valueClass}>{guest.passport_id || "—"}</p>
                  )}
                </Field>
                <Field label="Millat" editing={editing}>
                  {editing ? (
                    <select
                      value={form.nationality}
                      onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                      className={inputClass}
                    >
                      {NATIONALITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className={valueClass}>{guest.nationality || "—"}</p>
                  )}
                </Field>
              </div>

              <Field label="Tug'ilgan sana" editing={editing}>
                {editing ? (
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <p className={valueClass}>
                    {guest.birth_date ? (
                      <>
                        {formatDisplayDate(guest.birth_date)}{" "}
                        <span className="text-slate-400">({calcAge(guest.birth_date)} yosh)</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </p>
                )}
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Jinsi" editing={editing}>
                  {editing ? (
                    <select
                      value={form.gender}
                      onChange={(e) =>
                        setForm({ ...form, gender: e.target.value as PersonalForm["gender"] })
                      }
                      className={inputClass}
                    >
                      <option value="">Tanlanmagan</option>
                      <option value="MALE">Erkak</option>
                      <option value="FEMALE">Ayol</option>
                    </select>
                  ) : (
                    <p className={valueClass}>
                      {guest.gender === "MALE" ? "Erkak" : guest.gender === "FEMALE" ? "Ayol" : "—"}
                    </p>
                  )}
                </Field>
                <Field label="Manzil" editing={editing}>
                  {editing ? (
                    <input
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className={inputClass}
                    />
                  ) : (
                    <p className={valueClass}>{guest.address || "—"}</p>
                  )}
                </Field>
              </div>

              <Field label="Izoh / maxsus talablar" editing={editing}>
                {editing ? (
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className={`${inputClass} resize-none`}
                  />
                ) : (
                  <p className={`${valueClass} whitespace-pre-wrap`}>{guest.notes || "—"}</p>
                )}
              </Field>

              {editing && isDirty && (
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm(guestToForm(guest));
                      setEditing(false);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-slate-600"
                  >
                    Bekor
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-black disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                    Saqlash
                  </button>
                </div>
              )}
            </form>
          </Card>

          <Card title="Statistika" icon={<Star size={16} className="text-[var(--accent)]" />}>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatItem label="Jami tashriflar" value={`${guest.visit_count} marta`} />
              <StatItem label="Jami xarajat" value={formatMoney(guest.total_spent)} />
              <StatItem
                label="O'rtacha bron"
                value={guest.visit_count > 0 ? `${formatMoney(avgPerVisit)} / tashrif` : "—"}
              />
              <StatItem
                label="So'nggi tashrif"
                value={guest.last_visit ? formatDisplayDate(guest.last_visit) : "—"}
              />
              <StatItem
                label="Birinchi tashrif"
                value={guest.first_visit ? formatDisplayDate(guest.first_visit) : "—"}
              />
            </dl>
            {guest.visit_count >= 3 && (
              <span className="inline-flex mt-4 px-3 py-1 rounded-full bg-green-100 text-green-800 border border-green-200 text-[11px] font-black uppercase">
                Doimiy mehmon
              </span>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <Card title="Bronlar tarixi" icon={<BedDouble size={16} className="text-[var(--accent)]" />}>
            {guest.bookings.length === 0 ? (
              <p className="text-sm font-bold text-slate-400 text-center py-6">Bronlar yo'q</p>
            ) : (
              <ul className="space-y-4">
                {guest.bookings.map((booking) => (
                  <li
                    key={booking.id}
                    className="pb-4 border-b border-slate-100 last:border-0 last:pb-0 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-800">
                          {booking.room_number ?? "—"} · {booking.room_type ?? "—"}
                        </p>
                        <p className="text-[12px] font-bold text-slate-500 mt-1">
                          {formatDisplayDate(booking.check_in)} — {formatDisplayDate(booking.check_out)} ·{" "}
                          {calcNights(booking.check_in, booking.check_out)} tun
                        </p>
                      </div>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${STATUS_STYLES[booking.status]}`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-[var(--primary)]">
                        {formatMoney(booking.total_amount)}
                      </span>
                      <Link
                        href={`/hotel/bookings/${booking.id}`}
                        className="text-[12px] font-black text-[var(--accent)] hover:underline uppercase"
                      >
                        Ko'rish →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`/hotel/bookings?guestId=${guest.id}`}
              className="block mt-4 text-center text-[12px] font-black text-[var(--accent)] hover:underline uppercase"
            >
              Barcha bronlarni ko'rish →
            </Link>
          </Card>

          <Card title="Maxsus belgilar" icon={<Ban size={16} className="text-[var(--accent)]" />}>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                  O&apos;zgartirish sababi
                </label>
                <input
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  placeholder="Sababni kiriting..."
                  className={inputClass}
                />
              </div>

              <label
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
                  canManageVip ? "border-slate-200 cursor-pointer" : "border-slate-100 opacity-60"
                }`}
              >
                <span className="text-sm font-black text-slate-700">VIP mehmon</span>
                <input
                  type="checkbox"
                  checked={guest.is_vip}
                  disabled={!canManageVip || actionLoading}
                  onChange={(e) => void handleVipToggle(e.target.checked)}
                  className="w-5 h-5 accent-amber-500"
                />
              </label>

              <label
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
                  canManageBlacklist ? "border-slate-200 cursor-pointer" : "border-slate-100 opacity-60"
                }`}
              >
                <span className="text-sm font-black text-slate-700">Qora ro&apos;yxat</span>
                <input
                  type="checkbox"
                  checked={guest.is_blacklist}
                  disabled={!canManageBlacklist || actionLoading}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setConfirmAction({ type: "blacklist_add" });
                    } else {
                      setConfirmAction({ type: "blacklist_remove" });
                    }
                  }}
                  className="w-5 h-5 accent-red-500"
                />
              </label>
            </div>
          </Card>
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-[var(--primary)]">
                  {confirmAction.type === "delete" && "Mehmonni o'chirish"}
                  {confirmAction.type === "blacklist_add" && "Qora ro'yxatga qo'shish"}
                  {confirmAction.type === "blacklist_remove" && "Qora ro'yxatdan olib tashlash"}
                </h3>
                <p className="text-sm font-bold text-slate-500 mt-2">
                  {confirmAction.type === "delete"
                    ? "Bu amalni qaytarib bo'lmaydi. Davom etasizmi?"
                    : "Sababni kiriting va tasdiqlang."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="p-2 rounded-xl border border-slate-200 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {confirmAction.type !== "delete" && (
              <input
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="Sabab..."
                className={inputClass}
              />
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-black text-slate-600"
              >
                Bekor
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void handleConfirmAction()}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white text-sm font-black disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)]";
const valueClass = "text-sm font-bold text-slate-800";

function Field({
  label,
  editing,
  children,
}: {
  label: string;
  editing: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">{label}</label>
      {children}
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</dt>
      <dd className="text-base font-black text-slate-800 mt-1">{value}</dd>
    </div>
  );
}
