"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  HelpCircle,
  Languages,
  Loader2,
  LogOut,
  Settings,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { staffFetch } from "../_lib/staffFetch";

type StaffProfile = {
  firstName: string;
  lastName: string | null;
  fullName: string;
  title: string;
  role: string;
  phone: string | null;
  email: string | null;
  hotelName: string | null;
  initials: string;
  isActive: boolean;
  tasksDone: number;
  tasksDoneMonth: number;
  growth: string;
  shiftsCompletedMonth: number;
  baseSalaryLabel: string | null;
};

const monthLabel = new Intl.DateTimeFormat("uz-UZ", {
  month: "long",
  year: "numeric",
}).format(new Date());

export default function StaffProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await staffFetch("/api/staff/profile", { cache: "no-store" });
      const data = (await res.json()) as {
        profile?: StaffProfile;
        message?: string;
      };
      if (res.status === 401) {
        router.push("/login?next=/staff/profile");
        return;
      }
      if (!res.ok || !data.profile) {
        throw new Error(data.message || "Profil yuklanmadi");
      }
      setProfile(data.profile);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  function openEdit() {
    if (!profile) return;
    setFirstName(profile.firstName);
    setLastName(profile.lastName ?? "");
    setPhone(profile.phone ?? "");
    setEditOpen(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await staffFetch("/api/staff/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim() || null,
          phone: phone.trim() || null,
        }),
      });
      const data = (await res.json()) as {
        profile?: StaffProfile;
        message?: string;
      };
      if (res.status === 401) {
        router.push("/login?next=/staff/profile");
        return;
      }
      if (!res.ok || !data.profile) {
        throw new Error(data.message || "Saqlab bo'lmadi");
      }
      setProfile(data.profile);
      setEditOpen(false);
      toast.success("Profil yangilandi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }
    toast.success("Tizimdan chiqildi");
    router.push("/login");
  }

  if (loading && !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm font-semibold text-[#64748B]">
        <Loader2 size={18} className="animate-spin" />
        Profil yuklanmoqda…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="st-card p-6 text-center text-sm font-semibold text-[#64748B]">
        Profil topilmadi. Admin/HR bilan bog&apos;laning.
      </div>
    );
  }

  const kpis = [
    {
      label: "Mehmonxona",
      value: profile.hotelName ?? "—",
    },
    {
      label: "Bu oy smenalar",
      value: String(profile.shiftsCompletedMonth),
    },
    {
      label: "Bajarilgan vazifa",
      value: String(profile.tasksDone),
    },
    {
      label: "O‘sish (oy)",
      value: profile.growth,
    },
  ];

  return (
    <div className="space-y-4 st-animate">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[24px] font-bold text-[#0d2137]">Profil</h1>
        <Link
          href="/staff/messages"
          className="p-2.5 rounded-xl bg-white border border-[#d8e3fb] text-[#64748B]"
        >
          <Bell size={18} />
        </Link>
      </header>

      <section className="st-card p-5">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-[#0d2137] text-white text-[16px] font-bold flex items-center justify-center">
            {profile.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-bold text-[#0d2137] truncate">
                {profile.fullName}
              </h2>
              {profile.isActive ? (
                <span className="st-badge st-badge-ok">Faol</span>
              ) : (
                <span className="st-badge st-badge-muted">Nofaol</span>
              )}
            </div>
            <div className="text-[12px] font-semibold text-[#64748B]">
              {profile.title}
              {profile.email ? ` · ${profile.email}` : ""}
            </div>
            {profile.phone ? (
              <div className="text-[12px] font-semibold text-[#006781] mt-0.5">
                {profile.phone}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="text-[11px] font-bold text-[#006781]"
            onClick={openEdit}
          >
            Tahrirlash
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl bg-[#f0f3ff] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                {k.label}
              </div>
              <div className="font-display text-[16px] sm:text-[18px] font-bold text-[#0d2137] mt-0.5 truncate">
                {k.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="st-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-[#0d2137]">Mening faoliyatim</h3>
          <span className="text-[11px] font-bold text-[#94A3B8] capitalize">
            {monthLabel}
          </span>
        </div>
        <div className="mt-3 space-y-2">
          <div className="rounded-xl border border-[#d8e3fb] px-3 py-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-[#0d2137]">
                Bajarilgan vazifalar (oy)
              </div>
              <div className="text-[11px] font-semibold text-[#94A3B8]">
                Shu oyda yakunlangan
              </div>
            </div>
            <div className="text-[13px] font-black text-emerald-600 shrink-0">
              {profile.tasksDoneMonth}
            </div>
          </div>
          <div className="rounded-xl border border-[#d8e3fb] px-3 py-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-[#0d2137]">
                Yakunlangan smenalar
              </div>
              <div className="text-[11px] font-semibold text-[#94A3B8]">
                Shu oyda tugagan
              </div>
            </div>
            <div className="text-[13px] font-black text-emerald-600 shrink-0">
              {profile.shiftsCompletedMonth}
            </div>
          </div>
          {profile.baseSalaryLabel ? (
            <div className="rounded-xl border border-[#d8e3fb] px-3 py-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-[#0d2137]">
                  Asosiy oylik
                </div>
                <div className="text-[11px] font-semibold text-[#94A3B8]">
                  HR ma&apos;lumoti
                </div>
              </div>
              <div className="text-[13px] font-black text-[#0d2137] shrink-0">
                {profile.baseSalaryLabel}
              </div>
            </div>
          ) : null}
        </div>
        <p className="mt-3 text-[11px] font-semibold text-[#64748B]">
          Komissiya va bonus hisobi keyinroq qo&apos;shiladi — hozir faqat smena
          va vazifa ko&apos;rsatkichlari.
        </p>
      </section>

      <section className="st-card overflow-hidden">
        {[
          { icon: Settings, label: "Ilova sozlamalari", href: "#" },
          { icon: Languages, label: "Til (O‘zbekcha)", href: "#" },
          {
            icon: HelpCircle,
            label: "Yordam va qo‘llab-quvvatlash",
            href: "/staff/training",
          },
        ].map((row) => (
          <button
            key={row.label}
            type="button"
            onClick={() => {
              if (row.href.startsWith("/")) router.push(row.href);
              else toast.message("Tez orada");
            }}
            className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-[#d8e3fb] last:border-0 text-left hover:bg-[#f9f9ff]"
          >
            <row.icon size={18} className="text-[#006781]" />
            <span className="flex-1 text-[13px] font-bold text-[#0d2137]">
              {row.label}
            </span>
            <ChevronRight size={16} className="text-[#94A3B8]" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => void logout()}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-rose-50"
        >
          <LogOut size={18} className="text-[#F43F5E]" />
          <span className="flex-1 text-[13px] font-bold text-[#F43F5E]">
            Tizimdan chiqish
          </span>
        </button>
      </section>

      <p className="text-center text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider pb-2">
        SafarTrip Staff
      </p>

      {editOpen ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#000917]/40 p-4">
          <form
            onSubmit={(e) => void saveEdit(e)}
            className="w-full max-w-md bg-white rounded-2xl p-5 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-[18px] font-bold text-[#0d2137]">
                Profilni tahrirlash
              </h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="p-2 rounded-lg text-[#64748B] hover:bg-[#f0f3ff]"
              >
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1 block">
                Ism
              </label>
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-[#d8e3fb] bg-[#f9f9ff] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#006781]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1 block">
                Familiya
              </label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-[#d8e3fb] bg-[#f9f9ff] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#006781]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1 block">
                Telefon
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-[#d8e3fb] bg-[#f9f9ff] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#006781]"
                placeholder="+998 90 123 45 67"
                inputMode="tel"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#006781] text-white text-sm font-bold py-3 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Saqlash
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
