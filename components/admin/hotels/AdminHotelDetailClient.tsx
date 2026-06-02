"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  BedDouble,
  Building2,
  ExternalLink,
  Loader2,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import type { HotelStatus } from "@prisma/client";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import type { AdminHotelDetail } from "@/lib/admin/getAdminHotelDetail";
import { formatDateTime } from "@/lib/formatDate";

type Props = {
  data: AdminHotelDetail;
};

const HOTEL_STATUS_OPTIONS: Array<{ value: HotelStatus; label: string }> = [
  { value: "active", label: "ACTIVE" },
  { value: "draft", label: "PENDING" },
  { value: "suspended", label: "SUSPENDED" },
];

const ROLE_OPTIONS = [
  { value: "hotel_manager", label: "Hotel manager" },
  { value: "admin", label: "Admin" },
  { value: "user", label: "User" },
  { value: "super_admin", label: "Super admin" },
];

const BOOKING_STATUS_CLS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-100",
  CONFIRMED: "bg-blue-50 text-blue-700 ring-blue-100",
  CHECKED_IN: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  CHECKED_OUT: "bg-slate-100 text-slate-700 ring-slate-200",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-100",
  COMPLETED: "bg-slate-100 text-slate-700 ring-slate-200",
  NO_SHOW: "bg-orange-50 text-orange-700 ring-orange-100",
};

function formatMoney(value: number) {
  return `${value.toLocaleString("uz-UZ")} so'm`;
}

function initials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

export function AdminHotelDetailClient({ data: initial }: Props) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<HotelStatus | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [roleSaving, setRoleSaving] = useState(false);
  const [ownerRole, setOwnerRole] = useState(data.owner.role);

  const [form, setForm] = useState({
    name: data.hotel.name,
    city: data.hotel.city ?? "",
    address: data.hotel.address ?? "",
    contactEmail: data.hotel.contactEmail ?? "",
    contactPhone: data.hotel.contactPhone ?? "",
    totalRooms: String(data.hotel.totalRooms),
  });

  async function refreshPage() {
    router.refresh();
  }

  async function saveHotel() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/hotels/${data.hotel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          city: form.city,
          address: form.address,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          totalRooms: Number(form.totalRooms),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Saqlab bo'lmadi");
      setData((prev) => ({
        ...prev,
        hotel: {
          ...prev.hotel,
          name: form.name,
          city: form.city || null,
          address: form.address || null,
          contactEmail: form.contactEmail || null,
          contactPhone: form.contactPhone || null,
          totalRooms: Number(form.totalRooms),
        },
      }));
      setEditing(false);
      toast.success("Mehmonxona yangilandi");
      await refreshPage();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSaving(false);
    }
  }

  async function deleteHotel() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/hotels/${data.hotel.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "O'chirib bo'lmadi");
      }
      toast.success("Mehmonxona o'chirildi");
      router.push("/admin/hotels");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSaving(false);
      setDeleteOpen(false);
    }
  }

  async function applyStatus() {
    if (!pendingStatus) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/hotels/${data.hotel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: pendingStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Status yangilanmadi");
      setData((prev) => ({ ...prev, hotel: { ...prev.hotel, status: pendingStatus } }));
      toast.success("Status yangilandi");
      setStatusOpen(false);
      setPendingStatus(null);
      setStatusReason("");
      await refreshPage();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSaving(false);
    }
  }

  async function changeRole() {
    setRoleSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${data.owner.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: ownerRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Rol yangilanmadi");
      setData((prev) => ({ ...prev, owner: { ...prev.owner, role: ownerRole } }));
      toast.success("Rol yangilandi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setRoleSaving(false);
    }
  }

  function requestStatusChange(status: HotelStatus) {
    if (status === data.hotel.status) return;
    if (status === "suspended") {
      setPendingStatus(status);
      setStatusOpen(true);
      return;
    }
    setPendingStatus(status);
    void applyStatusDirect(status);
  }

  async function applyStatusDirect(status: HotelStatus) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/hotels/${data.hotel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Status yangilanmadi");
      setData((prev) => ({ ...prev, hotel: { ...prev.hotel, status } }));
      toast.success("Status yangilandi");
      await refreshPage();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSaving(false);
      setPendingStatus(null);
    }
  }

  const stars = "★".repeat(data.hotel.stars) + "☆".repeat(Math.max(0, 5 - data.hotel.stars));

  return (
    <>
      {/* Header actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/hotel?hotelId=${data.hotel.id}`}
          className="adm-btn inline-flex items-center gap-2"
          target="_blank"
        >
          Hotel paneliga o&apos;tish
          <ExternalLink size={14} />
        </Link>
        <button type="button" className="adm-btn adm-btn-primary" onClick={() => setEditing((v) => !v)}>
          <Pencil size={14} />
          Tahrirlash
        </button>
        <button
          type="button"
          className="adm-btn bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 size={14} />
          O&apos;chirish
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column (2 spans) */}
        <div className="xl:col-span-2 space-y-6">
          {/* Basic info */}
          <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-black text-slate-900">Asosiy ma&apos;lumotlar</h2>
              {editing && (
                <button
                  type="button"
                  className="adm-btn adm-btn-primary"
                  disabled={saving}
                  onClick={() => void saveHotel()}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  Saqlash
                </button>
              )}
            </div>

            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ["Nomi", "name"],
                  ["Shahar", "city"],
                  ["Manzil", "address"],
                  ["Email", "contactEmail"],
                  ["Telefon", "contactPhone"],
                  ["Jami xonalar", "totalRooms"],
                ].map(([label, key]) => (
                  <div key={key}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                      {label}
                    </label>
                    <input
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold"
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <Info label="Nomi" value={data.hotel.name} />
                <Info label="Manzil" value={data.hotel.address || "—"} />
                <Info label="Shahar" value={data.hotel.city || "—"} />
                <Info label="Viloyat" value={data.hotel.region || "—"} />
                <Info label="Telefon" value={data.hotel.contactPhone || "—"} />
                <Info label="Email" value={data.hotel.contactEmail || "—"} />
                <Info label="Veb-sayt" value={data.hotel.website || "—"} />
                <Info label="Yulduzlar" value={`${stars} (${data.hotel.stars})`} />
                <Info label="Kategoriya" value={data.hotel.category || "—"} />
                <Info label="Yaratilgan" value={formatDateTime(data.hotel.createdAt)} />
                <Info label="Oxirgi yangilanish" value={formatDateTime(data.hotel.updatedAt)} />
              </dl>
            )}
          </div>

          {/* PMS stats */}
          <div className="adm-kpi-grid">
            <div className="adm-kpi-card">
              <div className="adm-kpi-icon blue">
                <BedDouble size={24} />
              </div>
              <div className="adm-kpi-content">
                <div className="adm-kpi-label">Jami xonalar</div>
                <div className="adm-kpi-value">{data.stats.physicalRooms}</div>
              </div>
            </div>
            <div className="adm-kpi-card">
              <div className="adm-kpi-icon teal">
                <Building2 size={24} />
              </div>
              <div className="adm-kpi-content">
                <div className="adm-kpi-label">Aktiv bronlar</div>
                <div className="adm-kpi-value">{data.stats.activeBookings}</div>
              </div>
            </div>
            <div className="adm-kpi-card">
              <div className="adm-kpi-icon orange">
                <Users size={24} />
              </div>
              <div className="adm-kpi-content">
                <div className="adm-kpi-label">Jami mehmonlar</div>
                <div className="adm-kpi-value">{data.stats.guestCount}</div>
              </div>
            </div>
            <div className="adm-kpi-card">
              <div className="adm-kpi-icon blue">
                <ArrowRight size={24} />
              </div>
              <div className="adm-kpi-content">
                <div className="adm-kpi-label">Jami daromad</div>
                <div className="adm-kpi-value text-xl">{formatMoney(data.stats.totalRevenue)}</div>
              </div>
            </div>
          </div>

          {/* Booking stats mini */}
          <div className="adm-card p-4 bg-white border-none shadow-xl shadow-slate-200/50">
            <div className="flex flex-wrap gap-2">
              {(["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"] as const).map((st) => (
                <span
                  key={st}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase ring-1 ${BOOKING_STATUS_CLS[st]}`}
                >
                  {st}: {data.stats.bookingsByStatus[st] ?? 0}
                </span>
              ))}
              <span className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                Jami: {data.stats.totalBookings}
              </span>
            </div>
          </div>

          {/* Room types */}
          <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
            <h2 className="text-lg font-black text-slate-900 mb-4">Xona turlari</h2>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th className="pl-4">Tur nomi</th>
                    <th>Narx</th>
                    <th>Xonalar soni</th>
                    <th className="pr-4">Band / Bo&apos;sh</th>
                  </tr>
                </thead>
                <tbody>
                  {data.roomTypes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 font-bold">
                        Xona turlari yo&apos;q
                      </td>
                    </tr>
                  ) : (
                    data.roomTypes.map((rt) => (
                      <tr key={rt.id}>
                        <td className="pl-4 py-3 font-black text-slate-800">{rt.name}</td>
                        <td className="py-3 font-bold text-slate-600">{formatMoney(rt.basePrice)}</td>
                        <td className="py-3 font-bold text-slate-600">{rt.roomCount}</td>
                        <td className="pr-4 py-3 font-bold">
                          <span className="text-emerald-600">{rt.occupied} band</span>
                          {" / "}
                          <span className="text-slate-500">{rt.available} bo&apos;sh</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent bookings */}
          <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-black text-slate-900">So&apos;nggi bronlar</h2>
              <Link
                href={`/hotel/bookings?hotelId=${data.hotel.id}`}
                className="text-xs font-black text-slate-500 hover:text-slate-900 uppercase tracking-wide"
              >
                Barcha bronlarni ko&apos;rish →
              </Link>
            </div>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th className="pl-4">Mehmon</th>
                    <th>Xona</th>
                    <th>Kirish</th>
                    <th>Chiqish</th>
                    <th>Summa</th>
                    <th className="pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentBookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                        Bronlar yo&apos;q
                      </td>
                    </tr>
                  ) : (
                    data.recentBookings.map((b) => (
                      <tr key={b.id}>
                        <td className="pl-4 py-3 font-bold text-slate-800">{b.guestName}</td>
                        <td className="py-3 text-sm font-semibold text-slate-600">
                          {b.roomNumber ?? "—"}
                          {b.roomType ? ` · ${b.roomType}` : ""}
                        </td>
                        <td className="py-3 text-sm font-semibold text-slate-600">{b.checkIn}</td>
                        <td className="py-3 text-sm font-semibold text-slate-600">{b.checkOut}</td>
                        <td className="py-3 font-black text-slate-800">{formatMoney(b.totalAmount)}</td>
                        <td className="pr-4 py-3">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ring-1 ${BOOKING_STATUS_CLS[b.status] ?? "bg-slate-100 text-slate-600"}`}
                          >
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Owner */}
          <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
            <h2 className="text-lg font-black text-slate-900 mb-4">Egasi / Menejer</h2>
            <div className="flex items-center gap-4 mb-4">
              <div className="adm-user-avatar w-14 h-14 text-lg shadow-lg shadow-slate-900/10">
                {initials(data.owner.first_name, data.owner.last_name)}
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">
                  {data.owner.first_name} {data.owner.last_name}
                </p>
                <p className="text-xs font-bold text-slate-500">{data.owner.email}</p>
                <p className="text-xs font-bold text-slate-500">{data.owner.phone || "—"}</p>
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rol</p>
            <p className="text-sm font-black text-slate-700 mb-3">{data.owner.role}</p>
            <Link
              href={`/admin/users/${data.owner.id}`}
              className="text-xs font-black text-slate-500 hover:text-slate-900 uppercase tracking-wide inline-flex items-center gap-1 mb-3"
            >
              Foydalanuvchini ko&apos;rish →
            </Link>
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Rol o&apos;zgartirish
              </label>
              <select
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold"
                value={ownerRole}
                onChange={(e) => setOwnerRole(e.target.value)}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="adm-btn adm-btn-primary w-full justify-center"
                disabled={roleSaving || ownerRole === data.owner.role}
                onClick={() => void changeRole()}
              >
                {roleSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                Rolni saqlash
              </button>
            </div>
          </div>

          {/* Status control */}
          <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
            <h2 className="text-lg font-black text-slate-900 mb-4">Hotel holati</h2>
            <div className="flex flex-col gap-2">
              {HOTEL_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={saving}
                  onClick={() => requestStatusChange(opt.value)}
                  className={`px-4 py-3 rounded-xl text-left text-sm font-black border transition-all ${
                    data.hotel.status === opt.value
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
            <h2 className="text-lg font-black text-slate-900 mb-4">Tezkor havolalar</h2>
            <div className="space-y-2">
              <QuickLink href={`/admin/hotels?status=${data.hotel.status}`} label="Bronlar tarixi" />
              <QuickLink href={`/hotel/reports?hotelId=${data.hotel.id}`} label="Hisobot ko'rish" external />
              <QuickLink
                href={`/admin/audit?entity=Hotel&entityId=${data.hotel.id}`}
                label="Audit log"
              />
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={deleteOpen}
        title="Mehmonxonani o'chirish"
        description="Bu amalni qaytarib bo'lmaydi. Barcha bog'liq ma'lumotlar ham o'chiriladi."
        subjectName={data.hotel.name}
        confirmLabel="O'chirish"
        confirmDanger
        confirmLoading={saving}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void deleteHotel()}
      />

      <ConfirmModal
        open={statusOpen}
        title="Hotelni to'xtatib qo'yish"
        description="Hotelni to'xtatib qo'ysizmi? Barcha bronlar va panel kirishlari cheklanishi mumkin."
        subjectName={data.hotel.name}
        confirmLabel="To'xtatish"
        confirmDanger
        confirmLoading={saving}
        onCancel={() => {
          setStatusOpen(false);
          setPendingStatus(null);
          setStatusReason("");
        }}
        onConfirm={() => void applyStatus()}
      >
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
          Sabab (ixtiyoriy)
        </label>
        <textarea
          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold min-h-[80px]"
          value={statusReason}
          onChange={(e) => setStatusReason(e.target.value)}
          placeholder="Nima uchun to'xtatilmoqda..."
        />
      </ConfirmModal>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</dt>
      <dd className="font-bold text-slate-800 mt-0.5 break-words">{value}</dd>
    </div>
  );
}

function QuickLink({
  href,
  label,
  external,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  const cls =
    "flex items-center justify-between w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-black text-slate-700 hover:bg-slate-100 transition-all";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {label}
        <ExternalLink size={14} className="text-slate-400" />
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {label}
      <ArrowRight size={14} className="text-slate-400" />
    </Link>
  );
}
