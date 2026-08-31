"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

type StaffRow = {
  id: string;
  hotelId: string;
  hotelName: string;
  userId: string | null;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  role: string;
  title: string;
  isActive: boolean;
  email: string | null;
  platformRole: string | null;
  createdAt: string;
};

const JOB_ROLES = [
  { value: "RECEPTION", label: "Retsepsionist" },
  { value: "CLEANER", label: "Farrosh" },
  { value: "WAITER", label: "Ofitsiant" },
  { value: "MANAGER", label: "Menejer / Staff" },
] as const;

type Props = {
  hotelId: string;
  hotelName: string;
};

export function AdminHotelStaffPanel({ hotelId, hotelName }: Props) {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "RECEPTION" as (typeof JOB_ROLES)[number]["value"],
    password: "",
    reassign: true,
  });
  const [lastPassword, setLastPassword] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/hotels/${hotelId}/staff`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as { staff?: StaffRow[]; message?: string };
      if (!res.ok) throw new Error(data.message || "Xodimlar yuklanmadi");
      setStaff(data.staff ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function linkStaff(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setLastPassword(null);
    try {
      const res = await fetch(`/api/admin/hotels/${hotelId}/staff`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          firstName: form.firstName.trim() || undefined,
          lastName: form.lastName.trim() || null,
          phone: form.phone.trim() || null,
          role: form.role,
          password: form.password.trim() || undefined,
          reassign: form.reassign,
        }),
      });
      const data = (await res.json()) as {
        staff?: StaffRow;
        generatedPassword?: string | null;
        passwordWasGenerated?: boolean;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message || "Ulab bo‘lmadi");
      toast.success(`Xodim ${hotelName} ga ulandi`);
      if (data.generatedPassword) {
        setLastPassword(data.generatedPassword);
      }
      setOpen(false);
      setForm({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        role: "RECEPTION",
        password: "",
        reassign: true,
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setSaving(false);
    }
  }

  async function unlink(staffId: string) {
    if (!confirm("Xodimni mehmonxonadan ajratasizmi?")) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/hotels/${hotelId}/staff?staffId=${encodeURIComponent(staffId)}`,
        { method: "DELETE", credentials: "include" },
      );
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Ajratib bo‘lmadi");
      toast.success("Xodim ajratildi");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: StaffRow) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/hotels/${hotelId}/staff`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: row.id, isActive: !row.isActive }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Yangilanmadi");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-black text-slate-900">Staff / Xodimlar</h2>
          <p className="text-xs font-bold text-slate-400 mt-0.5">
            Super admin mehmonxonaga HotelStaff profilini ulaydi
          </p>
        </div>
        <button
          type="button"
          className="adm-btn adm-btn-primary"
          onClick={() => setOpen((v) => !v)}
        >
          <UserPlus size={14} />
          Xodim ulash
        </button>
      </div>

      {lastPassword ? (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm font-bold text-amber-800">
          Vaqtinchalik parol:{" "}
          <code className="font-mono text-amber-950">{lastPassword}</code>
          <button
            type="button"
            className="ml-3 text-xs underline"
            onClick={() => {
              void navigator.clipboard.writeText(lastPassword);
              toast.success("Nusxa olindi");
            }}
          >
            Nusxa
          </button>
        </div>
      ) : null}

      {open ? (
        <form
          onSubmit={(e) => void linkStaff(e)}
          className="mb-5 grid grid-cols-1 md:grid-cols-2 gap-3 rounded-2xl bg-slate-50 border border-slate-100 p-4"
        >
          <div className="md:col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
              Email (mavjud yoki yangi)
            </label>
            <input
              required
              type="email"
              className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="staff@hotel.uz"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
              Ism (yangi user uchun)
            </label>
            <input
              className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
              Familiya
            </label>
            <input
              className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
              Lavozim
            </label>
            <select
              className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold"
              value={form.role}
              onChange={(e) =>
                setForm({
                  ...form,
                  role: e.target.value as (typeof JOB_ROLES)[number]["value"],
                })
              }
            >
              {JOB_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
              Telefon
            </label>
            <input
              className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+998…"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
              Parol (ixtiyoriy)
            </label>
            <input
              type="text"
              className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Bo‘sh = avto-parol"
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 md:col-span-2">
            <input
              type="checkbox"
              checked={form.reassign}
              onChange={(e) => setForm({ ...form, reassign: e.target.checked })}
            />
            Boshqa mehmonxonadan ko‘chirib ulash (reassign)
          </label>
          <div className="md:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="adm-btn adm-btn-primary"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Ulash
            </button>
            <button
              type="button"
              className="adm-btn"
              onClick={() => setOpen(false)}
            >
              Bekor
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="py-10 flex items-center justify-center gap-2 text-sm font-bold text-slate-400">
          <Loader2 size={16} className="animate-spin" />
          Yuklanmoqda…
        </div>
      ) : staff.length === 0 ? (
        <p className="py-8 text-center text-sm font-bold text-slate-400">
          Hali xodim ulanmagan
        </p>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-4">Xodim</th>
                <th>Lavozim</th>
                <th>Rol</th>
                <th>Holat</th>
                <th className="pr-4">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((row) => (
                <tr key={row.id}>
                  <td className="pl-4 py-3">
                    <div className="font-black text-slate-800">
                      {row.firstName}
                      {row.lastName ? ` ${row.lastName}` : ""}
                    </div>
                    <div className="text-xs font-bold text-slate-400">
                      {row.email ?? "—"}
                      {row.phone ? ` · ${row.phone}` : ""}
                    </div>
                  </td>
                  <td className="py-3 text-sm font-bold text-slate-600">
                    {row.title}
                  </td>
                  <td className="py-3 text-xs font-bold text-slate-500">
                    {row.platformRole ?? "—"}
                  </td>
                  <td className="py-3">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void toggleActive(row)}
                      className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ring-1 ${
                        row.isActive
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                          : "bg-slate-100 text-slate-500 ring-slate-200"
                      }`}
                    >
                      {row.isActive ? "Faol" : "Nofaol"}
                    </button>
                  </td>
                  <td className="pr-4 py-3">
                    <div className="flex items-center gap-2">
                      {row.userId ? (
                        <Link
                          href={`/admin/users/${row.userId}`}
                          className="text-xs font-black text-slate-500 hover:text-slate-900"
                        >
                          User
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void unlink(row.id)}
                        className="p-2 rounded-lg text-rose-500 hover:bg-rose-50"
                        title="Ajratish"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
