"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  UserCog,
  Trash2,
  UserCheck,
  Key,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle2,
  Shield,
  X,
  RefreshCw,
  Plus,
  Settings,
  Copy,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface Staff {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  user?: { email: string };
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-50 text-red-600 border-red-100",
  RECEPTION: "bg-blue-50 text-blue-600 border-blue-100",
  CLEANER: "bg-amber-50 text-amber-600 border-amber-100",
  MANAGER: "bg-purple-50 text-purple-600 border-purple-100",
  WAITER: "bg-green-50 text-green-600 border-green-100",
};

function roleI18nKey(role: string): string {
  const r = role.toUpperCase();
  if (r === "RECEPTION" || r === "RECEPTIONIST") return "receptionist";
  if (r === "CLEANER") return "cleaner";
  if (r === "WAITER") return "waiter";
  if (r === "MANAGER" || r === "ADMIN") return "hotel_manager";
  return "receptionist";
}

function randomPassword(): string {
  const chunk = Math.random().toString(36).slice(-8);
  return `St@ff${chunk}`;
}

export default function HRPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Staff[]>([]);
  const [adding, setAdding] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [generatedPass, setGeneratedPass] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const { t } = useLanguage();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    role: "RECEPTION",
    email: "",
    password: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hotel/hr");
      const d = (await res.json()) as { staff?: Staff[]; message?: string };
      if (!res.ok) throw new Error(d.message ?? t("common.toasts.error"));
      setData(d.staff ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.toasts.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingStaff(null);
    setGeneratedPass(null);
    setLoginEmail("");
    setForm({
      firstName: "",
      lastName: "",
      phone: "",
      role: "RECEPTION",
      email: "",
      password: "",
    });
    setAdding(true);
  }

  function openEdit(s: Staff) {
    setEditingStaff(s);
    setGeneratedPass(null);
    setLoginEmail(s.user?.email ?? "");
    setForm({
      firstName: s.firstName,
      lastName: s.lastName || "",
      phone: s.phone || "",
      role: s.role,
      email: s.user?.email || "",
      password: "",
    });
    setAdding(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStaff && form.password.trim() && form.password.trim().length < 8) {
      toast.error("Parol kamida 8 belgidan iborat bo‘lishi kerak");
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!editingStaff;
      const body = isEdit
        ? {
            id: editingStaff.id,
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone,
            role: form.role,
            ...(form.password.trim()
              ? { password: form.password.trim() }
              : {}),
          }
        : {
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone,
            role: form.role,
            email: form.email.trim().toLowerCase(),
            ...(form.password.trim()
              ? { password: form.password.trim() }
              : {}),
          };

      const res = await fetch("/api/hotel/hr", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const resData = (await res.json()) as {
        generatedPassword?: string;
        passwordUpdated?: boolean;
        message?: string;
      };
      if (!res.ok) throw new Error(resData.message || t("common.toasts.error"));

      if (!isEdit && resData.generatedPassword) {
        setGeneratedPass(resData.generatedPassword);
        setLoginEmail(form.email.trim().toLowerCase());
        toast.success(t("hr.modal.add_success"));
      } else {
        toast.success(
          resData.passwordUpdated
            ? t("hr.modal.password_updated")
            : t("hr.modal.update_success"),
        );
        setAdding(false);
        setEditingStaff(null);
      }
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.toasts.error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("hr.modal.confirm_delete"))) return;
    try {
      const res = await fetch(`/api/hotel/hr?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t("common.toasts.error"));
      toast.success(t("hr.modal.delete_success"));
      void load();
    } catch {
      toast.error(t("common.toasts.error"));
    }
  }

  async function toggleStatus(id: string, current: boolean) {
    try {
      const res = await fetch("/api/hotel/hr", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !current }),
      });
      if (!res.ok) throw new Error(t("common.toasts.error"));
      toast.success(t("reception.toasts.status_updated"));
      void load();
    } catch {
      toast.error(t("common.toasts.error"));
    }
  }

  async function copyPass() {
    if (!generatedPass) return;
    try {
      await navigator.clipboard.writeText(generatedPass);
      toast.success("Nusxa olindi");
    } catch {
      toast.error("Nusxa olinmadi");
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight flex items-center gap-2">
            <UserCog size={24} className="text-[var(--accent)]" /> {t("hr.title")}
          </h1>
          <p className="text-[13px] font-semibold text-slate-500 mt-1">
            {t("hr.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="p-2.5 bg-slate-100 text-slate-600 rounded-lg"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-[13px] font-bold rounded-lg shadow-sm"
          >
            <Plus size={16} /> {t("hr.add_staff")}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#d8e3fb] bg-[#f0f7ff] px-4 py-3 text-[12px] font-semibold text-[#0d2137] leading-relaxed">
        Sidebar dagi “SIM” tanlov olib tashlandi. Haqiqiy vakolat — shu yerda:
        xodimga <strong>email + parol</strong> berasiz, u{" "}
        <code className="text-[11px] bg-white px-1 rounded border">/login</code>{" "}
        orqali o‘z panelliga kiradi.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase mb-1">
            {t("hr.total_team")}
          </div>
          <div className="text-2xl font-black text-[var(--primary)]">{data.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase mb-1">
            {t("hr.active_staff")}
          </div>
          <div className="text-2xl font-black text-green-600">
            {data.filter((s) => s.isActive).length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase mb-1">
            {t("hr.departments")}
          </div>
          <div className="text-2xl font-black text-blue-600">
            {new Set(data.map((s) => s.role)).size}
          </div>
        </div>
        <div className="bg-[var(--bg-light-blue)] border border-blue-100 rounded-xl p-4 shadow-sm">
          <div className="text-[10px] font-black text-blue-600 uppercase mb-1">
            {t("hr.new_notification")}
          </div>
          <div className="text-sm font-bold text-[var(--primary)]">
            Parolni o‘zingiz belgilaysiz
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="py-4 px-6">{t("hr.table.name")}</th>
              <th className="py-4 px-6">{t("hr.table.role")}</th>
              <th className="py-4 px-6">{t("hr.table.contact")}</th>
              <th className="py-4 px-6">{t("hr.table.status")}</th>
              <th className="py-4 px-6 text-right">{t("hr.table.action")}</th>
            </tr>
          </thead>
          <tbody className="text-[13px] font-bold">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <Loader2 size={24} className="animate-spin mx-auto text-slate-300" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-20 text-center text-slate-400">
                  Hali xodim yo‘q — “Vakolat berish” orqali qo‘shing
                </td>
              </tr>
            ) : (
              data.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 border border-slate-200">
                        {s.firstName[0]}
                      </div>
                      <div>
                        <div className="text-[14px] text-[var(--primary)] font-black leading-none mb-1">
                          {s.firstName} {s.lastName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ID: {s.id.slice(-6).toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-black border uppercase tracking-wider ${ROLE_COLORS[s.role] || "bg-slate-50 text-slate-500"}`}
                    >
                      {t(`common.roles.${roleI18nKey(s.role)}`)}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Mail size={12} className="text-slate-300" />{" "}
                        {s.user?.email || t("hr.table.email_na")}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                        <Phone size={12} className="text-slate-300" />{" "}
                        {s.phone || t("hr.table.phone_na")}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <button
                      type="button"
                      onClick={() => void toggleStatus(s.id, s.isActive)}
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border transition-all ${s.isActive ? "bg-green-50 text-green-600 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}
                    >
                      {s.isActive ? t("hr.status.active") : t("hr.status.inactive")}
                    </button>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Tahrirlash / parol"
                      >
                        <Settings size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(s.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="O‘chirish"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {adding ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-[var(--primary)] text-[15px] flex items-center gap-2">
                <UserCheck size={18} />{" "}
                {editingStaff ? t("hr.modal.edit_title") : t("hr.modal.add_title")}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setEditingStaff(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 bg-white rounded-md shadow-sm"
              >
                <X size={16} />
              </button>
            </div>

            {generatedPass ? (
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600 border border-green-100">
                  <Shield size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 mb-2">
                    {t("hr.modal.login_ready")}
                  </h2>
                  <p className="text-sm font-semibold text-slate-500 mb-4 px-4 leading-relaxed">
                    {t("hr.modal.login_desc")}
                  </p>
                  <div className="text-[12px] font-bold text-slate-600 mb-2">
                    {loginEmail}
                  </div>
                  <div className="bg-[var(--bg-light-blue)] border-2 border-dashed border-blue-200 rounded-2xl p-6 relative mb-4">
                    <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 py-0.5 border border-blue-100 rounded-full flex items-center gap-1 shadow-sm">
                      <Key size={10} /> {t("hr.modal.temp_pass")}
                    </div>
                    <div className="text-2xl font-black text-[var(--primary)] tracking-widest font-mono break-all">
                      {generatedPass}
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyPass()}
                      className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#006781]"
                    >
                      <Copy size={12} /> Nusxa olish
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setGeneratedPass(null);
                  }}
                  className="w-full py-3 bg-[var(--primary)] text-white text-[13px] font-bold rounded-xl hover:bg-[var(--secondary)] transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {t("hr.modal.got_it")} <CheckCircle2 size={16} />
                </button>
                <p className="text-[10px] font-bold text-red-500 uppercase flex items-center justify-center gap-1">
                  <AlertCircle size={12} /> {t("hr.modal.warning")}
                </p>
              </div>
            ) : (
              <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 pl-1">
                      {t("hr.modal.first_name")}
                    </label>
                    <input
                      required
                      value={form.firstName}
                      onChange={(e) =>
                        setForm({ ...form, firstName: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)] shadow-sm bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 pl-1">
                      {t("hr.modal.last_name")}
                    </label>
                    <input
                      value={form.lastName}
                      onChange={(e) =>
                        setForm({ ...form, lastName: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)] shadow-sm bg-slate-50/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 pl-1">
                    {t("hr.modal.email")}
                  </label>
                  <input
                    required
                    disabled={!!editingStaff}
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="xodim@mehmonxona.uz"
                    className={`w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)] shadow-sm ${editingStaff ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-50/50"}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 pl-1">
                    {t("hr.modal.phone")}
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+998 90 ..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)] shadow-sm bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 pl-1">
                    {t("hr.modal.role")}
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none bg-white cursor-pointer shadow-sm"
                  >
                    <option value="RECEPTION">
                      {t("common.roles.receptionist")}
                    </option>
                    <option value="CLEANER">{t("common.roles.cleaner")}</option>
                    <option value="WAITER">{t("common.roles.waiter")}</option>
                    <option value="MANAGER">
                      {t("common.roles.hotel_manager")} (smena)
                    </option>
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1 pl-1">
                    <label className="block text-[11px] font-black text-slate-500 uppercase">
                      {editingStaff
                        ? t("hr.modal.password_edit")
                        : t("hr.modal.password")}
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, password: randomPassword() })
                      }
                      className="text-[10px] font-black uppercase text-[#006781] hover:underline"
                    >
                      {t("hr.modal.generate")}
                    </button>
                  </div>
                  <input
                    type="text"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder={editingStaff ? "••••••••" : "Kamida 8 belgi"}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)] shadow-sm bg-slate-50/50 font-mono"
                  />
                  <p className="mt-1.5 text-[11px] font-semibold text-slate-400 pl-1">
                    {editingStaff
                      ? t("hr.modal.password_edit_hint")
                      : t("hr.modal.password_hint")}
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(false);
                      setEditingStaff(null);
                    }}
                    className="flex-1 py-3 text-slate-500 font-bold text-[13px] hover:bg-slate-100 rounded-xl transition-all"
                  >
                    {t("hr.modal.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-[2] py-3 bg-[var(--primary)] text-white text-[13px] font-black rounded-xl hover:bg-[var(--secondary)] transition-all shadow-md disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                    {editingStaff ? t("hr.modal.save") : t("hr.modal.add_btn")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
