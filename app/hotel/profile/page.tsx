"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Building2, MapPin, Mail, Phone, Save, Loader2,
  Globe, CheckCircle2, Shield, Star,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface HotelFields {
  name: string;
  city: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
}

export default function HotelProfile() {
  const { t } = useLanguage();
  const [fields,  setFields]  = useState<HotelFields>({ name: "", city: "", address: "", contactEmail: "", contactPhone: "" });
  const [status,  setStatus]  = useState<"draft" | "active" | "suspended">("draft");
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  async function load() {
    try {
      const res  = await fetch("/api/hotel/me");
      const data = await res.json();
      if (res.ok && data.hotel) {
        setFields({
          name:         data.hotel.name         || "",
          city:         data.hotel.city         || "",
          address:      data.hotel.address      || "",
          contactEmail: data.hotel.contactEmail || "",
          contactPhone: data.hotel.contactPhone || "",
        });
        setStatus(data.hotel.status || "draft");
      }
    } catch { /* suppress */ } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/hotel/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error(t("profile.toasts.error"));
      toast.success(t("profile.toasts.success"));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("profile.toasts.error"));
    } finally { setSaving(false); }
  }

  const STATUS_CONFIG = {
    draft:     { label: t("profile.status.draft"),  cls: "h-badge-amber", Icon: Globe   },
    active:    { label: t("profile.status.active"),     cls: "h-badge-green", Icon: CheckCircle2 },
    suspended: { label: t("profile.status.suspended"), cls: "h-badge-red", Icon: Shield },
  };

  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 size={36} className="animate-spin text-amber-500" />
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t("common.loading")}</p>
    </div>
  );

  return (
    <div className="max-w-3xl space-y-6 h-animate">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t("profile.title")}</h1>
          <p className="text-sm font-semibold text-slate-400 mt-1">
            {t("profile.subtitle")}
          </p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="h-btn h-btn-gold shrink-0">
          {saving
            ? <><Loader2 size={16} className="animate-spin" /> {t("profile.saving")}</>
            : saved
            ? <><CheckCircle2 size={16} /> {t("profile.saved")}</>
            : <><Save size={16} /> {t("profile.save_btn")}</>}
        </button>
      </div>

      {/* Hotel identity card */}
      <div className="h-banner !py-8 !px-8">
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#d4af37,#b8901b)", boxShadow: "0 12px 28px rgba(212,175,55,0.4)" }}>
            <Building2 size={36} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {fields.name || t("profile.placeholder_name")}
            </h2>
            {fields.city && (
              <div className="flex items-center gap-1.5 text-slate-400 font-medium text-sm mt-1">
                <MapPin size={13} />
                {fields.city}{fields.address ? `, ${fields.address}` : ""}
              </div>
            )}
            <div className="flex items-center gap-2 mt-3">
              <span className={`h-badge ${sc.cls}`}>
                <sc.Icon size={10} /> {sc.label}
              </span>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={12} fill={s <= 4 ? "#d4af37" : "none"} color="#d4af37" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Basic info */}
      <div className="h-card-flat overflow-hidden">
        <div className="flex items-center gap-3 px-7 py-5 border-b border-slate-100"
          style={{ background: "#fafbfc" }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(212,175,55,0.1)", color: "#b8901b" }}>
            <Building2 size={16} />
          </div>
          <h3 className="font-black text-slate-900">{t("profile.sections.basic")}</h3>
        </div>
        <div className="p-7 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="h-label">{t("profile.labels.name")}</label>
            <input className="h-input"
              placeholder={t("profile.placeholders.name")}
              value={fields.name}
              onChange={e => setFields({ ...fields, name: e.target.value })} />
          </div>
          <div>
            <label className="h-label">{t("profile.labels.city")}</label>
            <div className="relative">
              <MapPin size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input className="h-input pl-11"
                placeholder={t("profile.placeholders.city")}
                value={fields.city}
                onChange={e => setFields({ ...fields, city: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="h-label">{t("profile.labels.address")}</label>
            <input className="h-input"
              placeholder={t("profile.placeholders.address")}
              value={fields.address}
              onChange={e => setFields({ ...fields, address: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Contact info */}
      <div className="h-card-flat overflow-hidden">
        <div className="flex items-center gap-3 px-7 py-5 border-b border-slate-100"
          style={{ background: "#fafbfc" }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "#eff6ff", color: "#2563eb" }}>
            <Phone size={16} />
          </div>
          <h3 className="font-black text-slate-900">{t("profile.sections.contact")}</h3>
        </div>
        <div className="p-7 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="h-label">{t("profile.labels.email")}</label>
            <div className="relative">
              <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input className="h-input pl-11" type="email"
                placeholder={t("profile.placeholders.email")}
                value={fields.contactEmail}
                onChange={e => setFields({ ...fields, contactEmail: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="h-label">{t("profile.labels.phone")}</label>
            <div className="relative">
              <Phone size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input className="h-input pl-11" type="tel"
                placeholder={t("profile.placeholders.phone")}
                value={fields.contactPhone}
                onChange={e => setFields({ ...fields, contactPhone: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      {/* Save button (bottom) */}
      <div className="flex justify-end pt-2 pb-6">
        <button onClick={handleSave} disabled={saving}
          className="h-btn h-btn-gold">
          {saving
            ? <><Loader2 size={16} className="animate-spin" /> {t("profile.saving")}</>
            : <><Save size={16} /> {t("profile.save_btn")}</>}
        </button>
      </div>
    </div>
  );
}
