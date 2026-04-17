"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { User, Phone, Mail, Save, Loader2, Shield, Key } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useCurrentUser } from "@/components/dashboard/useCurrentUser";

type ProfileData = {
  first_name: string;
  last_name: string;
  phone: string;
};

export default function ProfilePage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileData>({ first_name: "", last_name: "", phone: "" });

  // Populate form when user loads
  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name ?? "",
        last_name:  user.last_name  ?? "",
        phone:      user.phone      ?? "",
      });
    }
  }, [user]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Xatolik");
      toast.success("Profil ma'lumotlari yangilandi ✓");
    } catch {
      // Fallback: /api/auth/me may not have PATCH — show info
      toast.info("Profil tahrirlash hozircha mavjud emas. Tez orada qo'shiladi.");
    } finally {
      setSaving(false);
    }
  }

  const roleLabel: Record<string, string> = {
    user:  "Sayohatchi",
    hotel: "Hotel egasi",
    guide: "Gid",
    taxi:  "Taxi haydovchi",
    admin: "Administrator",
  };

  return (
    <DashboardShell title="Mening Profilim" subtitle="Shaxsiy ma'lumotlar va hisob sozlamalari">
      {/* Profile Header Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/20 text-white flex items-center justify-center text-2xl font-black shrink-0">
          {!userLoading && user ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() : "?"}
        </div>
        <div className="text-center sm:text-left">
          <h2 className="text-xl font-black text-white">
            {userLoading ? "Yuklanmoqda..." : `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Foydalanuvchi"}
          </h2>
          <p className="text-slate-400 text-sm mt-1">{user?.email}</p>
          <span className="inline-block mt-3 text-xs font-black px-3 py-1.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
            <Shield size={11} className="inline mr-1.5" />
            {user?.role ? (roleLabel[user.role.toLowerCase()] ?? user.role) : "—"}
          </span>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-100">
          <User size={18} className="text-slate-400" />
          <h3 className="font-black text-slate-900">Shaxsiy Ma'lumotlar</h3>
        </div>
        <form onSubmit={saveProfile} className="p-6 space-y-5 max-w-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Ism</label>
              <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })}
                placeholder="Ismi"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-900 outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 transition-all" />
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Familiya</label>
              <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })}
                placeholder="Familiyasi"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-900 outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 transition-all" />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2 flex items-center gap-1">
              <Mail size={11} /> Email (o'zgartirib bo'lmaydi)
            </label>
            <input value={user?.email ?? ""} disabled
              className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-500 cursor-not-allowed" />
          </div>

          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2 flex items-center gap-1">
              <Phone size={11} /> Telefon raqam
            </label>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="+998901234567"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-900 outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 transition-all" />
          </div>

          <div className="pt-2">
            <button type="submit" disabled={saving || userLoading}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-black py-3 px-8 rounded-2xl transition-all shadow-lg shadow-slate-900/20">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? "Saqlanmoqda..." : "Ma'lumotlarni Saqlash"}
            </button>
          </div>
        </form>
      </div>

      {/* Account Section */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mt-6">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-100">
          <Key size={18} className="text-slate-400" />
          <h3 className="font-black text-slate-900">Hisob Xavfsizligi</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <div className="font-bold text-slate-900 text-sm">Parolni o'zgartirish</div>
              <div className="text-xs text-slate-500 mt-0.5">Parolingizni muntazam yangilab turing</div>
            </div>
            <button className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
              O'zgartirish →
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-3">
            <div>
              <div className="font-bold text-slate-900 text-sm">Hisob turi</div>
              <div className="text-xs text-slate-500 mt-0.5">{user?.role ? (roleLabel[user.role.toLowerCase()] ?? user.role) : "—"}</div>
            </div>
            <Shield size={18} className="text-slate-400" />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
