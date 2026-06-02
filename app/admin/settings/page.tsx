"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bell,
  CreditCard,
  Globe,
  Loader2,
  Mail,
  Percent,
  Phone,
  Save,
  Settings,
  Shield,
} from "lucide-react";
import type { GeneralSettings } from "@/lib/admin/generalSettings";
import { DEFAULT_GENERAL_SETTINGS } from "@/lib/admin/generalSettings";
import { formatDateTime } from "@/lib/formatDate";

const CURRENCY_OPTIONS: Array<{ value: GeneralSettings["defaultCurrency"]; label: string }> = [
  { value: "UZS", label: "O'zbek so'mi (UZS)" },
  { value: "USD", label: "AQSH dollari (USD)" },
  { value: "EUR", label: "Yevro (EUR)" },
];

const RELATED_LINKS = [
  {
    href: "/admin/settings/commission",
    label: "Komissiya foizlari",
    description: "Mehmonxona, homestay, gid va taksi komissiyalari",
    icon: Percent,
    tone: "teal",
  },
  {
    href: "/admin/settings/payments",
    label: "To'lov provayderlari",
    description: "Click, Payme, Uzum va manual to'lov sozlamalari",
    icon: CreditCard,
    tone: "navy",
  },
  {
    href: "/admin/audit",
    label: "Audit jurnali",
    description: "Admin harakatlari va tizim voqealari",
    icon: Shield,
    tone: "slate",
  },
] as const;

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const data = (await res.json()) as {
        settings?: GeneralSettings;
        updatedAt?: string | null;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || "Sozlamalarni yuklab bo'lmadi");
      }

      if (data.settings) setSettings(data.settings);
      setUpdatedAt(data.updatedAt ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sozlamalarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = (await res.json()) as {
        settings?: GeneralSettings;
        updatedAt?: string | null;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || "Sozlamalarni saqlab bo'lmadi");
      }

      if (data.settings) setSettings(data.settings);
      setUpdatedAt(data.updatedAt ?? null);
      toast.success("Tizim sozlamalari saqlandi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sozlamalarni saqlab bo'lmadi");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 size={40} className="animate-spin mx-auto text-[var(--adm-accent,#0E7490)]" />
        <p className="text-sm font-bold text-slate-400 mt-4">Tizim sozlamalari yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F0FDFA] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#0E7490]">
            <Settings size={14} />
            Platforma sozlamalari
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0D2137]">Tizim sozlamalari</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500">
            SafarTrip platformasining umumiy kontakt ma&apos;lumotlari, valyuta va bildirishnoma
            parametrlarini boshqaring.
          </p>
          {updatedAt ? (
            <p className="mt-2 text-xs font-bold text-slate-400">
              Oxirgi yangilanish: {formatDateTime(updatedAt)}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          className="adm-btn adm-btn-primary shrink-0 px-8 py-3.5 disabled:opacity-60"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Saqlash
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <section className="adm-card overflow-visible border border-slate-200/80 bg-white shadow-[var(--adm-shadow-sm)]">
            <div className="adm-card-header flex items-center gap-3 border-b border-slate-100 bg-white px-6 py-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#0D2137]">
                <Globe size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-[#0D2137]">Umumiy ma&apos;lumotlar</h2>
                <p className="text-xs font-semibold text-slate-500">
                  Sayt nomi, valyuta va aloqa ma&apos;lumotlari
                </p>
              </div>
            </div>

            <div className="space-y-6 p-6 md:p-8">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Field label="Sayt nomi">
                  <input
                    className="adm-settings-input"
                    value={settings.siteName}
                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    placeholder="SafarTrip"
                  />
                </Field>

                <Field label="Asosiy valyuta">
                  <select
                    className="adm-settings-input"
                    value={settings.defaultCurrency}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        defaultCurrency: e.target.value as GeneralSettings["defaultCurrency"],
                      })
                    }
                  >
                    {CURRENCY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Field label="Aloqa emaili">
                  <div className="relative">
                    <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      className="adm-settings-input pl-11"
                      type="email"
                      value={settings.contactEmail}
                      onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                      placeholder="admin@safartrip.uz"
                    />
                  </div>
                </Field>

                <Field label="Aloqa telefoni">
                  <div className="relative">
                    <Phone size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      className="adm-settings-input pl-11"
                      value={settings.contactPhone}
                      onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                      placeholder="+998 71 234 56 78"
                    />
                  </div>
                </Field>
              </div>
            </div>
          </section>

          <section className="adm-card overflow-visible border border-slate-200/80 bg-white shadow-[var(--adm-shadow-sm)]">
            <div className="adm-card-header flex items-center gap-3 border-b border-slate-100 bg-white px-6 py-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F0FDFA] text-[#0E7490]">
                <Bell size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-[#0D2137]">Bildirishnomalar</h2>
                <p className="text-xs font-semibold text-slate-500">
                  Platforma darajasidagi email bildirishnomalarini boshqaring
                </p>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <label className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div>
                  <div className="text-sm font-black text-[#0D2137]">Email bildirishnomalar</div>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                    Yangi bronlar, to&apos;lovlar va moderatorlik voqealari haqida adminlarga email
                    yuborish.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableNotifications}
                  onChange={(e) =>
                    setSettings({ ...settings, enableNotifications: e.target.checked })
                  }
                  className="mt-1 h-5 w-5 rounded border-slate-300 accent-[#0D2137]"
                />
              </label>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="adm-card overflow-hidden border border-slate-200/80 bg-white shadow-[var(--adm-shadow-sm)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#0D2137]">
                Bog&apos;liq sozlamalar
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {RELATED_LINKS.map((item) => {
                const Icon = item.icon;
                const iconClass =
                  item.tone === "teal"
                    ? "bg-[#F0FDFA] text-[#0E7490]"
                    : item.tone === "navy"
                      ? "bg-[#EFF6FF] text-[#0D2137]"
                      : "bg-slate-100 text-slate-600";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-start gap-3 px-5 py-4 transition hover:bg-slate-50"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-black text-[#0D2137]">{item.label}</div>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="rounded-[24px] bg-gradient-to-br from-[#0D2137] to-[#1A4B7A] p-6 text-white shadow-[var(--adm-shadow-md)]">
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-[#5EEAD4]" />
              <h2 className="text-sm font-black tracking-tight">Xavfsizlik</h2>
            </div>
            <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-300">
              Barcha admin o&apos;zgarishlari audit jurnaliga yoziladi. To&apos;lov va komissiya
              sozlamalari alohida sahifalarda boshqariladi.
            </p>
            <Link
              href="/admin/audit"
              className="mt-5 inline-flex items-center rounded-xl bg-white/10 px-4 py-2.5 text-xs font-black text-white transition hover:bg-white/15"
            >
              Audit jurnalini ko&apos;rish
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}
