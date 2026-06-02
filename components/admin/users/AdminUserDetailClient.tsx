"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Ban,
  Building2,
  Car,
  CheckCircle,
  Eye,
  EyeOff,
  ExternalLink,
  House,
  Loader2,
  MapPinned,
  Pencil,
  Shield,
  Trash2,
  Unlock,
  User,
} from "lucide-react";
import type { Role } from "@prisma/client";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import type { AdminUserDetail } from "@/lib/admin/getAdminUserDetail";
import { formatDateTime } from "@/lib/formatDate";

type Props = {
  data: AdminUserDetail;
};

const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  user: "User",
  taxi: "Taxi",
  taxi_partner: "Taxi Partner",
  hotel_manager: "Hotel Manager",
  guide: "Guide",
  restaurant_manager: "Restaurant",
  home_stay_partner: "Home Stay",
};

const ROLE_BADGE: Record<Role, string> = {
  super_admin: "bg-violet-50 text-violet-700 ring-violet-100",
  admin: "bg-slate-900 text-white ring-slate-800",
  user: "bg-slate-100 text-slate-700 ring-slate-200",
  taxi: "bg-orange-50 text-orange-700 ring-orange-100",
  taxi_partner: "bg-orange-50 text-orange-700 ring-orange-100",
  hotel_manager: "bg-teal-50 text-teal-700 ring-teal-100",
  guide: "bg-purple-50 text-purple-700 ring-purple-100",
  restaurant_manager: "bg-amber-50 text-amber-700 ring-amber-100",
  home_stay_partner: "bg-blue-50 text-blue-700 ring-blue-100",
};

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: "user", label: "User" },
  { value: "hotel_manager", label: "Hotel Manager" },
  { value: "taxi_partner", label: "Taxi Partner" },
  { value: "guide", label: "Guide" },
  { value: "home_stay_partner", label: "Home Stay" },
  { value: "admin", label: "Admin" },
];

const HOTEL_STATUS_CLS: Record<string, string> = {
  active: "adm-badge green",
  draft: "adm-badge yellow",
  suspended: "adm-badge red",
};

const PARTNER_STATUS_CLS: Record<string, string> = {
  approved: "adm-badge green",
  pending: "adm-badge yellow",
  rejected: "adm-badge red",
  suspended: "adm-badge red",
};

function formatMoney(value: number) {
  return `${value.toLocaleString("uz-UZ")} so'm`;
}

function initials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

export function AdminUserDetailClient({ data: initial }: Props) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>(data.user.role);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState({
    first_name: data.user.first_name,
    last_name: data.user.last_name,
    phone: data.user.phone,
  });

  const fullName = `${data.user.first_name} ${data.user.last_name}`.trim();
  const isSuperAdmin = data.user.role === "super_admin";
  const roleCls = ROLE_BADGE[data.user.role] ?? "bg-slate-100 text-slate-700 ring-slate-200";

  async function refreshPage() {
    router.refresh();
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${data.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Saqlab bo'lmadi");
      setData((prev) => ({
        ...prev,
        user: { ...prev.user, ...form },
      }));
      setEditing(false);
      toast.success("Ma'lumotlar yangilandi");
      await refreshPage();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSaving(false);
    }
  }

  async function changeRole() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${data.user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Rol yangilanmadi");
      setData((prev) => ({ ...prev, user: { ...prev.user, role: selectedRole } }));
      toast.success("Rol yangilandi");
      setRoleOpen(false);
      await refreshPage();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    if (newPassword.length < 8) {
      toast.error("Parol kamida 8 ta belgidan iborat bo'lishi kerak");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Parollar mos kelmadi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${data.user.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Parol yangilanmadi");
      toast.success("Parol yangilandi");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSaving(false);
    }
  }

  async function toggleBlock() {
    setSaving(true);
    try {
      const next = !data.user.isBlocked;
      // Schema da isBanned/banReason yo'q — faqat isBlocked ishlatiladi
      const res = await fetch(`/api/admin/users/${data.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Holat yangilanmadi");
      setData((prev) => ({ ...prev, user: { ...prev.user, isBlocked: next } }));
      toast.success(next ? "Foydalanuvchi bloklandi" : "Blokdan chiqarildi");
      setBlockOpen(false);
      setBlockReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${data.user.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "O'chirib bo'lmadi");
      toast.success("Foydalanuvchi o'chirildi");
      router.push("/admin/users");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSaving(false);
      setDeleteOpen(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest"
            >
              <ArrowLeft size={14} />
              Foydalanuvchilar
            </Link>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{fullName}</h1>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ring-1 ${roleCls}`}
              >
                <Shield size={10} />
                {ROLE_LABELS[data.user.role] ?? data.user.role}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Chap ustun */}
          <div className="space-y-6">
            <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-black shrink-0">
                  {initials(data.user.first_name, data.user.last_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-black text-slate-900">Shaxsiy ma&apos;lumotlar</h2>
                    {!editing && (
                      <button type="button" className="adm-btn" onClick={() => setEditing(true)}>
                        <Pencil size={14} />
                        Tahrirlash
                      </button>
                    )}
                  </div>
                  {!editing && (
                    <p className="text-sm font-bold text-slate-500 mt-1">
                      {data.user.first_name} {data.user.last_name}
                    </p>
                  )}
                </div>
              </div>

              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ["Ism", "first_name"],
                    ["Familiya", "last_name"],
                    ["Telefon", "phone"],
                  ].map(([label, key]) => (
                    <div key={key}>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                        {label}
                      </label>
                      <input
                        className="adm-settings-input"
                        value={form[key as keyof typeof form]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      />
                    </div>
                  ))}
                  <div className="md:col-span-2 flex gap-2">
                    <button
                      type="button"
                      className="adm-btn adm-btn-primary"
                      disabled={saving}
                      onClick={() => void saveProfile()}
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                      Saqlash
                    </button>
                    <button
                      type="button"
                      className="adm-btn"
                      onClick={() => {
                        setEditing(false);
                        setForm({
                          first_name: data.user.first_name,
                          last_name: data.user.last_name,
                          phone: data.user.phone,
                        });
                      }}
                    >
                      Bekor
                    </button>
                  </div>
                </div>
              ) : (
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <Info label="Email">
                    <a href={`mailto:${data.user.email}`} className="font-bold text-blue-600 hover:underline">
                      {data.user.email}
                    </a>
                  </Info>
                  <Info label="Telefon">
                    <a href={`tel:${data.user.phone}`} className="font-bold text-blue-600 hover:underline">
                      {data.user.phone}
                    </a>
                  </Info>
                  <Info label="Ro'yxatdan o'tgan" value={formatDateTime(data.user.createdAt)} />
                  <Info label="Oxirgi faollik" value={formatDateTime(data.user.updatedAt)} />
                </dl>
              )}
            </div>

            <RoleContextCard data={data} />

            <div className="adm-card border-none shadow-xl shadow-slate-200/50">
              <div className="adm-card-header bg-white border-b border-slate-50 px-6 py-4 flex items-center justify-between">
                <span className="text-lg font-black text-slate-900 tracking-tight">Audit tarixi</span>
                <Link
                  href={`/admin/audit?actorId=${data.user.id}`}
                  className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors"
                >
                  Barcha auditni ko&apos;rish →
                </Link>
              </div>
              <div className="p-6 space-y-6">
                {data.auditLogs.length === 0 ? (
                  <p className="text-sm font-bold text-slate-400 text-center py-4">Harakatlar mavjud emas</p>
                ) : (
                  data.auditLogs.map((log) => (
                    <div key={log.id} className="flex gap-4 group">
                      <div className="relative flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-100 mt-1.5" />
                        <div className="w-px flex-1 bg-slate-100 my-2 group-last:hidden" />
                      </div>
                      <div className="pb-6 group-last:pb-0 min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-sm font-black text-slate-900">{log.action}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            {formatDateTime(log.createdAt)}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-500 mt-1">
                          {log.entity}
                          {log.entityId ? ` · #${log.entityId.slice(-8)}` : ""}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* O'ng ustun */}
          <div className="space-y-6">
            <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
              <h2 className="text-lg font-black text-slate-900 mb-4">Xavfsizlik va ruxsat</h2>

              <div className="mb-5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Joriy rol</p>
                <span className="inline-flex px-3 py-1.5 rounded-xl text-xs font-black bg-slate-900 text-white">
                  {ROLE_LABELS[data.user.role] ?? data.user.role}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Rolni o&apos;zgartirish
                </label>
                {isSuperAdmin ? (
                  <div className="relative">
                    <select
                      className="adm-settings-input opacity-60 cursor-not-allowed"
                      disabled
                      value={data.user.role}
                      title="Himoyalangan"
                    >
                      <option value="super_admin">Super Admin</option>
                    </select>
                    <p className="text-xs font-bold text-slate-400 mt-1">Himoyalangan — super_admin rolini o&apos;zgartirib bo&apos;lmaydi</p>
                  </div>
                ) : (
                  <>
                    <select
                      className="adm-settings-input"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as Role)}
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                      {!ROLE_OPTIONS.some((o) => o.value === data.user.role) && (
                        <option value={data.user.role}>{ROLE_LABELS[data.user.role] ?? data.user.role}</option>
                      )}
                    </select>
                    <button
                      type="button"
                      className="adm-btn adm-btn-primary w-full justify-center"
                      disabled={selectedRole === data.user.role}
                      onClick={() => setRoleOpen(true)}
                    >
                      Saqlash
                    </button>
                  </>
                )}
              </div>

              <div className="pt-5 border-t border-slate-100 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Parolni yangilash</p>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Yangi parol (min 8 belgi)"
                    className="adm-settings-input pr-12"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Yashirish" : "Ko'rsatish"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Parolni tasdiqlash"
                    className="adm-settings-input pr-12"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? "Yashirish" : "Ko'rsatish"}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button
                  type="button"
                  className="adm-btn w-full justify-center"
                  disabled={saving || newPassword.length < 8 || newPassword !== confirmPassword}
                  onClick={() => void resetPassword()}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  Yangilash
                </button>
              </div>

              <div className="pt-5 border-t border-slate-100 mt-5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Bloklash holati
                </p>
                <div className="flex items-center justify-between gap-3">
                  <span className={`text-sm font-black ${data.user.isBlocked ? "text-rose-600" : "text-emerald-600"}`}>
                    {data.user.isBlocked ? "Bloklangan" : "Aktiv"}
                  </span>
                  <button type="button" className="adm-btn" onClick={() => setBlockOpen(true)}>
                    {data.user.isBlocked ? (
                      <>
                        <Unlock size={14} /> Blokdan chiqarish
                      </>
                    ) : (
                      <>
                        <Ban size={14} /> Bloklash
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <QuickLinksCard data={data} onDelete={() => setDeleteOpen(true)} />
          </div>
        </div>
      </div>

      <ConfirmModal
        open={roleOpen}
        title="Rolni o'zgartirish"
        description={`Foydalanuvchi rolini ${ROLE_LABELS[selectedRole] ?? selectedRole} ga o'zgartirasizmi? Faol sessiyalar bekor qilinishi mumkin.`}
        subjectName={fullName}
        confirmLabel="Saqlash"
        confirmLoading={saving}
        onCancel={() => setRoleOpen(false)}
        onConfirm={() => void changeRole()}
      />

      <ConfirmModal
        open={blockOpen}
        title={data.user.isBlocked ? "Blokdan chiqarish" : "Foydalanuvchini bloklash"}
        description={
          data.user.isBlocked
            ? "Foydalanuvchi yana tizimga kira oladi."
            : "Foydalanuvchi tizimga kira olmaydi va sessiyalari bekor qilinadi."
        }
        subjectName={fullName}
        confirmLabel={data.user.isBlocked ? "Blokdan chiqarish" : "Bloklash"}
        confirmDanger={!data.user.isBlocked}
        confirmLoading={saving}
        onCancel={() => {
          setBlockOpen(false);
          setBlockReason("");
        }}
        onConfirm={() => void toggleBlock()}
      >
        {!data.user.isBlocked && (
          <div className="mt-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
              Sabab (ixtiyoriy)
            </label>
            <textarea
              className="adm-settings-input min-h-[80px] resize-y"
              placeholder="Bloklash sababi..."
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
            />
            {/* TODO: banReason maydoni schema ga qo'shilganda PATCH ga yuborish */}
          </div>
        )}
      </ConfirmModal>

      <ConfirmModal
        open={deleteOpen}
        title="Foydalanuvchini o'chirish"
        description="Bu amalni qaytarib bo'lmaydi. Barcha bog'liq ma'lumotlar o'chirilishi mumkin."
        subjectName={fullName}
        confirmLabel="O'chirish"
        confirmDanger
        confirmLoading={saving}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void deleteUser()}
      />
    </>
  );
}

function Info({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</dt>
      <dd className="font-bold text-slate-800 mt-0.5 break-words">{children ?? value}</dd>
    </div>
  );
}

function RoleContextCard({ data }: { data: AdminUserDetail }) {
  const ctx = data.roleContext;
  const partner = data.partner;

  return (
    <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
      <h2 className="text-lg font-black text-slate-900 mb-4">Rol konteksti</h2>

      {ctx.type === "hotel_manager" && (
        <>
          <div className="flex items-center gap-3 mb-3">
            <Building2 size={20} className="text-slate-500" />
            <Link
              href={`/admin/hotels/${ctx.hotel.id}`}
              className="text-base font-black text-slate-900 hover:text-slate-600"
            >
              {ctx.hotel.name}
            </Link>
          </div>
          <span className={HOTEL_STATUS_CLS[ctx.hotel.status] ?? "adm-badge gray"}>
            {ctx.hotel.status}
          </span>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <MiniStat label="Jami xonalar" value={String(ctx.hotel.roomCount)} />
            <MiniStat label="Aktiv bronlar" value={String(ctx.hotel.activeBookingCount)} />
          </div>
        </>
      )}

      {(ctx.type === "taxi_partner" || ctx.type === "taxi") && (
        <>
          <div className="flex items-center gap-3 mb-3">
            <Car size={20} className="text-slate-500" />
            <span className="text-sm font-black text-slate-800">Haydovchi profili</span>
          </div>
          {ctx.driverProfile ? (
            <div className="space-y-3">
              {ctx.vehicle && (
                <p className="text-sm font-bold text-slate-700">
                  {ctx.vehicle.make} {ctx.vehicle.model} · {ctx.vehicle.plateNumber}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ring-1 ${
                    ctx.driverProfile.isVerified
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                      : "bg-amber-50 text-amber-700 ring-amber-100"
                  }`}
                >
                  {ctx.driverProfile.isVerified ? (
                    <>
                      <CheckCircle size={10} /> Tasdiqlangan
                    </>
                  ) : (
                    "Tasdiqlanmagan"
                  )}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ring-1 ${
                    ctx.driverProfile.isOnline
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                      : "bg-slate-100 text-slate-600 ring-slate-200"
                  }`}
                >
                  {ctx.driverProfile.isOnline ? "Onlayn" : "Oflayn"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm font-bold text-slate-400">DriverProfile topilmadi</p>
          )}
          <Link
            href={`/admin/taxi/drivers/${data.user.id}`}
            className="inline-flex items-center gap-1 text-xs font-black text-slate-500 hover:text-slate-900 uppercase tracking-wide mt-4"
          >
            Haydovchini ko&apos;rish →
          </Link>
        </>
      )}

      {ctx.type === "guide" && (
        <>
          <div className="flex items-center gap-3 mb-3">
            <MapPinned size={20} className="text-slate-500" />
            <span className="text-sm font-black text-slate-800">Gid profili</span>
          </div>
          <Link
            href={`/admin/guide/guides/${data.user.id}`}
            className="inline-flex items-center gap-1 text-xs font-black text-slate-500 hover:text-slate-900 uppercase tracking-wide"
          >
            Guide profilini ko&apos;rish →
          </Link>
        </>
      )}

      {ctx.type === "home_stay_partner" && (
        <>
          <div className="flex items-center gap-3 mb-3">
            <House size={20} className="text-slate-500" />
            <span className="text-sm font-black text-slate-800">Uy mehmonxonasi</span>
          </div>
          {ctx.listings.length > 0 ? (
            <ul className="space-y-2 mb-3">
              {ctx.listings.map((listing) => (
                <li key={listing.id} className="text-sm font-bold text-slate-700 truncate">
                  {listing.title}
                </li>
              ))}
            </ul>
          ) : null}
          {ctx.partnerId && (
            <Link
              href={`/admin/homestay/listings?partnerId=${ctx.partnerId}`}
              className="inline-flex items-center gap-1 text-xs font-black text-slate-500 hover:text-slate-900 uppercase tracking-wide"
            >
              Uy mehmonxonasini ko&apos;rish →
            </Link>
          )}
        </>
      )}

      {ctx.type === "user" && (
        <>
          <div className="flex items-center gap-3 mb-3">
            <User size={20} className="text-slate-500" />
            <span className="text-sm font-black text-slate-800">Oddiy foydalanuvchi</span>
          </div>
          {ctx.guestStats ? (
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Tashriflar" value={String(ctx.guestStats.visitCount)} />
              <MiniStat label="Jami xarajat" value={formatMoney(ctx.guestStats.totalSpent)} className="col-span-2" />
            </div>
          ) : (
            <p className="text-sm font-bold text-slate-400">Mehmon statistikasi yo&apos;q</p>
          )}
        </>
      )}

      {ctx.type === "other" && (
        <p className="text-sm font-bold text-slate-400">Bu rol uchun maxsus kontekst yo&apos;q</p>
      )}

      {partner && (
        <div className="mt-5 pt-5 border-t border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Hamkorlik</p>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={PARTNER_STATUS_CLS[partner.status] ?? "adm-badge gray"}>{partner.status}</span>
            <span className="text-xs font-bold text-slate-500 uppercase">{partner.type}</span>
          </div>
          <Link
            href={`/admin/partners/${partner.id}`}
            className="inline-flex items-center gap-1 text-xs font-black text-slate-500 hover:text-slate-900 uppercase tracking-wide"
          >
            Hamkorlik arizasini ko&apos;rish →
          </Link>
        </div>
      )}
    </div>
  );
}

function QuickLinksCard({ data, onDelete }: { data: AdminUserDetail; onDelete: () => void }) {
  const ctx = data.roleContext;
  const links: Array<{ href: string; label: string }> = [
    { href: `/admin/audit?actorId=${data.user.id}`, label: "Audit logi" },
  ];

  if (ctx.type === "hotel_manager") {
    links.push({ href: `/admin/hotels/${ctx.hotel.id}`, label: "Hotel detail" });
  }
  if (ctx.type === "taxi_partner" || ctx.type === "taxi") {
    links.push({ href: `/admin/taxi/drivers/${data.user.id}`, label: "Haydovchi detail" });
  }
  if (data.partner) {
    links.push({ href: `/admin/partners/${data.partner.id}`, label: "Hamkor arizasi" });
  }

  return (
    <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
      <h2 className="text-lg font-black text-slate-900 mb-4">Tezkor havolalar</h2>
      <ul className="space-y-2 mb-5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900"
            >
              <ExternalLink size={14} />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="adm-btn w-full justify-center bg-rose-600 text-white border-rose-600 hover:opacity-95"
        onClick={onDelete}
      >
        <Trash2 size={14} />
        Foydalanuvchini o&apos;chirish
      </button>
    </div>
  );
}

function MiniStat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 ${className}`}>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-lg font-black text-slate-900 mt-1">{value}</p>
    </div>
  );
}
