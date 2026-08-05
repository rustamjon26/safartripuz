"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  User,
  Phone,
  Mail,
  Save,
  Loader2,
  Shield,
  Key,
  CheckCircle2,
  MapPin,
  Calendar,
  X,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useCurrentUser } from "@/components/dashboard/useCurrentUser";
import {
  isGooglePhonePlaceholder,
  normalizeUzPhone,
} from "@/lib/phone";

type ProfileData = {
  first_name: string;
  last_name: string;
  phone: string;
};

function displayPhone(phone: string | null | undefined): string {
  if (!phone || isGooglePhonePlaceholder(phone)) return "";
  return phone;
}

type UserStats = {
  travelPlans: number;
  bookings: number;
  totalSpent: number;
};

const inputClass =
  "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-medium text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all";

export default function ProfilePage() {
  const { user, loading: userLoading, refetch, setUser } = useCurrentUser();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileData>({
    first_name: "",
    last_name: "",
    phone: "",
  });
  const [stats, setStats] = useState<UserStats | null>(null);

  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [hasPassword, setHasPassword] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
        phone: displayPhone(user.phone),
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/user/profile/password", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { hasPassword?: boolean };
        if (!cancelled && typeof data.hasPassword === "boolean") {
          setHasPassword(data.hasPassword);
        }
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/user/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.stats) setStats(data.stats);
        }
      } catch {
        /* optional */
      }
    }
    if (user) void loadStats();
  }, [user]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim()) {
      toast.error("Ism majburiy");
      return;
    }
    const phoneNormalized = normalizeUzPhone(form.phone);
    if (!phoneNormalized) {
      toast.error(
        "Telefon formati noto‘g‘ri. Masalan: +998901234567 yoki 901234567",
      );
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: phoneNormalized,
        }),
      });
      const data = (await res.json()) as {
        user?: typeof user;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message || "Saqlashda xatolik");
      if (data.user) {
        setUser({
          id: data.user.id,
          first_name: data.user.first_name,
          last_name: data.user.last_name,
          email: data.user.email,
          phone: data.user.phone,
          role: data.user.role,
        });
        setForm({
          first_name: data.user.first_name ?? "",
          last_name: data.user.last_name ?? "",
          phone: displayPhone(data.user.phone),
        });
      } else {
        await refetch();
      }
      toast.success("Profil ma'lumotlari yangilandi ✓");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  }

  function openPasswordModal() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPwdOpen(true);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (hasPassword && !currentPassword) {
      toast.error("Joriy parolni kiriting");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Yangi parol kamida 8 belgi bo‘lishi kerak");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Yangi parol tasdiqi mos kelmadi");
      return;
    }
    setPwdSaving(true);
    try {
      const res = await fetch("/api/user/profile/password", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(hasPassword ? { currentPassword } : {}),
          newPassword,
        }),
      });
      const data = (await res.json()) as {
        message?: string;
        setOnly?: boolean;
      };
      if (!res.ok) throw new Error(data.message || "Parol o‘zgarmadi");
      toast.success(data.message || "Parol yangilandi ✓");
      setHasPassword(true);
      setPwdOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setPwdSaving(false);
    }
  }

  const roleLabel: Record<string, string> = {
    user: "Sayohatchi",
    hotel_manager: "Hotel egasi",
    guide: "Gid",
    taxi: "Taxi haydovchi",
    taxi_partner: "Taxi hamkor",
    home_stay_partner: "Homestay egasi",
    admin: "Administrator",
    super_admin: "Super admin",
    support: "Support",
  };

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  const statRow = [
    { label: "Sayohatlar", value: stats?.travelPlans ?? 0, icon: MapPin },
    { label: "Bronlar", value: stats?.bookings ?? 0, icon: Calendar },
    {
      label: "Xarajat",
      value: stats ? `${stats.totalSpent.toLocaleString()}` : "0",
      icon: Shield,
    },
  ];

  return (
    <DashboardShell
      title="Mening Profilim"
      subtitle="Shaxsiy ma'lumotlar va hisob sozlamalari"
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 mb-6 text-white">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500 to-blue-600 blur-md opacity-60 scale-110" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-blue-600 p-1">
              <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center text-3xl font-black text-white">
                {!userLoading ? initials : "?"}
              </div>
            </div>
          </div>
          <h2 className="text-xl font-black text-white">
            {userLoading
              ? "Yuklanmoqda..."
              : `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() ||
                "Foydalanuvchi"}
          </h2>
          <p className="text-gray-300 text-sm mt-1">{user?.email}</p>
          <span className="inline-block mt-3 text-xs font-black px-3 py-1.5 rounded-full bg-white/20 text-white border border-white/30">
            {user?.role
              ? (roleLabel[user.role.toLowerCase()] ?? user.role)
              : "—"}
          </span>

          <div className="grid grid-cols-3 gap-4 w-full max-w-md mt-8">
            {statRow.map((s) => (
              <div
                key={s.label}
                className="bg-white/10 border border-white/20 rounded-2xl p-4 text-center backdrop-blur-sm"
              >
                <s.icon size={16} className="text-amber-300 mx-auto mb-2" />
                <p className="text-white font-black text-2xl">{s.value}</p>
                <p className="text-gray-300 text-xs uppercase tracking-widest mt-0.5">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Link
        href="/support-chat"
        className="mb-6 flex items-center gap-4 bg-white rounded-3xl border border-gray-200 shadow-sm p-5 hover:border-amber-300 hover:bg-amber-50/40 transition-colors"
      >
        <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <MessageCircle size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-gray-900 text-sm">Support chat</div>
          <p className="text-xs text-gray-600 mt-0.5">
            SafarTrip jamoasiga yozing — mehmonxona, taxi, gid va boshqa savollar
          </p>
        </div>
        <span className="text-sm font-bold text-amber-600 shrink-0">Ochish →</span>
      </Link>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <User size={18} className="text-amber-500" />
          <h3 className="font-black text-gray-900">Shaxsiy Ma&apos;lumotlar</h3>
        </div>
        <form onSubmit={saveProfile} className="space-y-5 max-w-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2">
                Ism
              </label>
              <input
                required
                value={form.first_name}
                onChange={(e) =>
                  setForm({ ...form, first_name: e.target.value })
                }
                placeholder="Ismi"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2">
                Familiya{" "}
                <span className="font-medium normal-case tracking-normal text-gray-400">
                  (ixtiyoriy)
                </span>
              </label>
              <input
                value={form.last_name}
                onChange={(e) =>
                  setForm({ ...form, last_name: e.target.value })
                }
                placeholder="Familiyasi"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2 flex items-center gap-1">
              <Mail size={11} /> Email (o&apos;zgartirib bo&apos;lmaydi)
            </label>
            <input
              value={user?.email ?? ""}
              disabled
              className={`${inputClass} opacity-60 cursor-not-allowed`}
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2 flex items-center gap-1">
              <Phone size={11} /> Telefon raqam
            </label>
            <input
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+998 90 123 45 67"
              inputMode="tel"
              autoComplete="tel"
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Format: +998XXXXXXXXX yoki 90XXXXXXX
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || userLoading}
              className="inline-flex items-center gap-2 btn-amber disabled:opacity-40 text-white font-black py-3 px-8 rounded-2xl transition-all"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {saving ? "Saqlanmoqda..." : "Ma'lumotlarni Saqlash"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden mt-6">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200">
          <Key size={18} className="text-amber-500" />
          <h3 className="font-black text-gray-900">Hisob Xavfsizligi</h3>
        </div>
        <div className="p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <div>
              <div className="font-bold text-gray-900 text-sm">
                Email tasdiqlangan
              </div>
              <div className="text-xs text-gray-600 mt-0.5">{user?.email}</div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 size={12} /> Tasdiqlangan
            </span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200 gap-3">
            <div>
              <div className="font-bold text-gray-900 text-sm">
                {hasPassword ? "Parolni o'zgartirish" : "Parol o'rnatish"}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">
                {hasPassword
                  ? "Parolingizni muntazam yangilab turing"
                  : "Google orqali kirdingiz — email/parol uchun parol o‘rnating"}
              </div>
            </div>
            <button
              type="button"
              onClick={openPasswordModal}
              className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors shrink-0"
            >
              {hasPassword ? "O'zgartirish →" : "O'rnatish →"}
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <div>
              <div className="font-bold text-gray-900 text-sm">Hisob turi</div>
              <div className="text-xs text-gray-600 mt-0.5">
                {user?.role
                  ? (roleLabel[user.role.toLowerCase()] ?? user.role)
                  : "—"}
              </div>
            </div>
            <Shield size={18} className="text-gray-500" />
          </div>
        </div>
      </div>

      {pwdOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !pwdSaving && setPwdOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-900 text-lg">
                {hasPassword ? "Parolni o'zgartirish" : "Parol o'rnatish"}
              </h3>
              <button
                type="button"
                disabled={pwdSaving}
                onClick={() => setPwdOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            {!hasPassword ? (
              <p className="mb-3 text-sm text-gray-600">
                Google hisobida parol yo‘q. Yangi parol o‘rnating — keyin
                email/parol bilan ham kirishingiz mumkin.
              </p>
            ) : null}
            <form onSubmit={changePassword} className="flex flex-col gap-3">
              {hasPassword ? (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                    Joriy parol
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
              ) : null}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Yangi parol
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Yangi parol (tasdiq)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={pwdSaving}
                className="mt-2 inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white font-bold py-3 px-5 rounded-xl"
              >
                {pwdSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Key size={16} />
                )}
                {pwdSaving
                  ? "Saqlanmoqda..."
                  : hasPassword
                    ? "Parolni yangilash"
                    : "Parolni o'rnatish"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
