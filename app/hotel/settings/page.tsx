"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Settings, Building2, Mail, Phone, MapPin, Globe, Save,
  Loader2, ShieldCheck, CreditCard, Bell, Lock, ArrowLeft, Key, UserCheck
} from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function SettingsPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [activeTab, setActiveTab] = useState<"PROFILE" | "SECURITY">("PROFILE");

  const [form, setForm] = useState({ name: "", city: "", address: "", contactEmail: "", contactPhone: "" });
  const [passForm, setPassForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  async function load() {
    try {
      const res  = await fetch("/api/hotel/me");
      const data = await res.json();
      if (res.ok && data.hotel) {
        setIsStaff(data.isStaff);
        setForm({
          name: data.hotel.name || "",
          city: data.hotel.city || "",
          address: data.hotel.address || "",
          contactEmail: data.hotel.contactEmail || "",
          contactPhone: data.hotel.contactPhone || "",
        });
        // If staff, default to security tab since they can't edit hotel profile
        if (data.isStaff) setActiveTab("SECURITY");
      }
    } catch { toast.error(t("settings.toasts.load_error")); }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/hotel/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) toast.success(t("settings.toasts.save_success"));
      else throw new Error(await (await res.json()).message);
    } catch (e: any) { toast.error(e.message || t("common.error")); }
    setSaving(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) return toast.error(t("settings.toasts.pass_mismatch"));
    setSaving(true);
    try {
      const res = await fetch("/api/hotel/profile/password", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passForm)
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(t("settings.toasts.pass_success"));
        setPassForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else toast.error(d.message);
    } catch { toast.error(t("common.error")); }
    setSaving(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 size={24} className="animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-6">
        <div className="flex items-center gap-4">
           <Link href="/hotel" className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-[var(--primary)] hover:border-slate-300 transition-all">
              <ArrowLeft size={18}/>
           </Link>
           <div>
              <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight flex items-center gap-2">
                 <Settings size={24} className="text-[var(--accent)]"/> {t("settings.title")}
              </h1>
              <p className="text-[13px] font-semibold text-slate-500 mt-1">{t("settings.subtitle")}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
         {/* Sidebar Navigation */}
         <div className="md:col-span-1 space-y-1">
            {!isStaff && (
              <button 
                onClick={() => setActiveTab("PROFILE")}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-black text-[13px] text-left transition-all ${activeTab === "PROFILE" ? 'bg-[var(--bg-light-blue)] text-[var(--primary)]' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                <Building2 size={16}/> {t("settings.tabs.hotel")}
              </button>
            )}
            <button 
              onClick={() => setActiveTab("SECURITY")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-black text-[13px] text-left transition-all ${activeTab === "SECURITY" ? 'bg-[var(--bg-light-blue)] text-[var(--primary)]' : 'text-slate-400 hover:bg-slate-50'}`}
            >
               <Lock size={16}/> {t("settings.tabs.security")}
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-300 font-bold text-[13px] text-left opacity-50 cursor-not-allowed">
               <Bell size={16}/> {t("settings.tabs.notifications")}
            </button>
         </div>

         {/* Main Content */}
         <div className="md:col-span-3 space-y-6">
            {activeTab === "PROFILE" && !isStaff ? (
              <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <div className="p-2 bg-white border border-slate-200 rounded-lg text-[var(--primary)] shadow-sm"><Globe size={18}/></div>
                    <h3 className="font-extrabold text-[var(--primary)] text-[15px]">{t("settings.hotel_info")}</h3>
                </div>
                <div className="p-8 space-y-6">
                    <div>
                      <label className="block text-[11px] font-black text-slate-450 uppercase tracking-widest mb-2 ml-1">{t("settings.hotel_name")} *</label>
                      <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-[var(--accent)] focus:bg-white transition-all shadow-inner"/>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-[11px] font-black text-slate-450 uppercase tracking-widest mb-2 ml-1">{t("settings.city")}</label>
                          <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)] focus:bg-white transition-all"/>
                      </div>
                      <div>
                          <label className="block text-[11px] font-black text-slate-450 uppercase tracking-widest mb-2 ml-1">{t("settings.phone")}</label>
                          <input value={form.contactPhone} onChange={e => setForm({...form, contactPhone: e.target.value})} className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)] focus:bg-white transition-all"/>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-450 uppercase tracking-widest mb-2 ml-1">{t("settings.address")}</label>
                      <textarea rows={2} value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)] focus:bg-white transition-all resize-none"/>
                    </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                    <button type="submit" disabled={saving} className="px-8 py-3 bg-[var(--primary)] text-white text-[13px] font-black rounded-xl hover:bg-[var(--secondary)] transition-all flex items-center gap-2">
                      {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} {t("settings.save_btn")}
                    </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePasswordChange} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <div className="p-2 bg-white border border-slate-200 rounded-lg text-red-500 shadow-sm"><Lock size={18}/></div>
                    <h3 className="font-extrabold text-[var(--primary)] text-[15px]">{t("settings.security_title")}</h3>
                </div>
                <div className="p-8 space-y-6">
                    <div>
                        <label className="block text-[11px] font-black text-slate-450 uppercase tracking-widest mb-2 ml-1">{t("settings.current_pass")}</label>
                        <input type="password" required value={passForm.currentPassword} onChange={e => setPassForm({...passForm, currentPassword: e.target.value})} className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-red-400 transition-all shadow-inner"/>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-[11px] font-black text-slate-450 uppercase tracking-widest mb-2 ml-1">{t("settings.new_pass")}</label>
                          <input type="password" required value={passForm.newPassword} onChange={e => setPassForm({...passForm, newPassword: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)] transition-all"/>
                      </div>
                      <div>
                          <label className="block text-[11px] font-black text-slate-450 uppercase tracking-widest mb-2 ml-1">{t("settings.confirm_pass")}</label>
                          <input type="password" required value={passForm.confirmPassword} onChange={e => setPassForm({...passForm, confirmPassword: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)] transition-all"/>
                      </div>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 items-start">
                       <ShieldCheck className="text-amber-500 shrink-0" size={18}/>
                       <p className="text-[12px] font-semibold text-amber-800 leading-relaxed">
                          {t("settings.pass_hint")}
                       </p>
                    </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black text-[var(--accent)] uppercase"><UserCheck size={14}/> {t("settings.pass_only_you")}</div>
                    <button type="submit" disabled={saving} className="px-8 py-3 bg-slate-900 text-white text-[13px] font-black rounded-xl hover:bg-black transition-all flex items-center gap-2 shadow-lg">
                      {saving ? <Loader2 size={16} className="animate-spin"/> : <Key size={16}/>} {t("settings.update_btn")}
                    </button>
                </div>
              </form>
            )}
         </div>
      </div>
    </div>
  );
}
