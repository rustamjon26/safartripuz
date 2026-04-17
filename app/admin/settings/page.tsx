"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Settings, Save, Shield, Laptop, Bell, Globe, Mail, Phone, Loader2, Info } from "lucide-react";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    siteName: "SafarTrip",
    contactEmail: "admin@safartrip.uz",
    contactPhone: "+998 71 234 56 78",
    maintenanceMode: false,
    enableNotifications: true,
    defaultCurrency: "UZS",
  });

  useEffect(() => {
    // Simulate loading settings from DB
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Sozlamalar muvaffaqiyatli saqlandi!");
    } catch (e) {
      toast.error("Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 size={40} className="animate-spin mx-auto text-slate-300" />
        <p className="text-sm font-bold text-slate-400 mt-4 font-nunito">Tizim sozlamalari yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tizim Sozlamalari</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">Platformaning global konfiguratsiyalarini boshqarish</p>
        </div>
        <button
          className="adm-btn adm-btn-primary shadow-lg shadow-slate-900/20 px-8 py-3.5"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Saqlash
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: General Settings */}
        <div className="lg:col-span-2 space-y-8">
          {/* General Section */}
          <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-visible">
            <div className="adm-card-header bg-white border-b border-slate-50 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Globe size={18} />
              </div>
              <span className="text-lg font-black text-slate-900 tracking-tight">Umumiy Ma&apos;lumotlar</span>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Sayt Nomi</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                      value={settings.siteName}
                      onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Asosiy Valyuta</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none"
                      value={settings.defaultCurrency}
                      onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
                    >
                      <option value="UZS">O&apos;zbek so&apos;mi (UZS)</option>
                      <option value="USD">AQSH Dollari (USD)</option>
                      <option value="EUR">Yevro (EUR)</option>
                    </select>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Aloqa Emaili</label>
                    <div className="relative">
                       <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                       <input
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                        value={settings.contactEmail}
                        onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                      />
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Aloqa Telefoni</label>
                    <div className="relative">
                       <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                       <input
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                        value={settings.contactPhone}
                        onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                      />
                    </div>
                 </div>
              </div>
            </div>
          </div>

          {/* Security & Maintenance */}
          <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-visible">
            <div className="adm-card-header bg-white border-b border-slate-50 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                <Shield size={18} />
              </div>
              <span className="text-lg font-black text-slate-900 tracking-tight">Xavfsizlik va Texnik Ishlar</span>
            </div>
            <div className="p-8 space-y-6">
               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-4">
                     <div className={`p-3 rounded-xl ${settings.maintenanceMode ? "bg-amber-500 text-white" : "bg-white text-slate-400 border border-slate-200"}`}>
                        <Laptop size={20} />
                     </div>
                     <div>
                        <div className="text-sm font-black text-slate-900">Texnik Ishlar Rejimi (Maintenance Mode)</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Saytni vaqtincha yopib qo&apos;yish</div>
                     </div>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                    className={`w-14 h-8 rounded-full relative transition-colors ${settings.maintenanceMode ? "bg-amber-500" : "bg-slate-200"}`}
                  >
                     <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${settings.maintenanceMode ? "left-7" : "left-1"}`} />
                  </button>
               </div>
               
               <div className="flex items-center gap-4 p-4 text-amber-600 bg-amber-50 rounded-2xl text-xs font-bold ring-1 ring-amber-100">
                  <Info size={16} className="shrink-0" />
                  Diqqat: Texnik ishlar rejimi yoqilganda faqat super-adminlar saytdan foydalana oladi.
               </div>
            </div>
          </div>
        </div>

        {/* Right: Notifications & Logs */}
        <div className="space-y-8">
           <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
              <div className="adm-card-header bg-white border-b border-slate-50 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Bell size={18} />
                </div>
                <span className="text-lg font-black text-slate-900 tracking-tight">Bildirishnomalar</span>
              </div>
              <div className="p-6">
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-slate-600">Email Bildirishnomalar</span>
                       <input 
                         type="checkbox" 
                         checked={settings.enableNotifications} 
                         onChange={() => setSettings({...settings, enableNotifications: !settings.enableNotifications})}
                         className="w-4 h-4 accent-slate-900"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-slate-600">Telegram Bot (Webhook)</span>
                       <span className="text-[9px] font-black text-emerald-500 uppercase">Faol</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-slate-600">SMS Xabarnomalar</span>
                       <span className="text-[9px] font-black text-slate-300 uppercase">O&apos;chirilgan</span>
                    </div>
                 </div>
                 <hr className="my-6 border-slate-100" />
                 <button className="w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-black shadow-lg shadow-slate-900/10 active:scale-95 transition-all">
                    Sinov Xabarini Yuborish
                 </button>
              </div>
           </div>

           <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                 <Shield size={20} className="text-emerald-400" />
                 <span className="text-sm font-black tracking-tight">Tizim Xavfsizligi</span>
              </div>
              <p className="text-[11px] font-bold text-slate-400 mb-6 leading-relaxed">
                 Barcha harakatlar audit loglariga yozib boriladi. Xavfsizlik choralari har 24 soatda avtomatik tekshiriladi.
              </p>
              <div className="space-y-3">
                 <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/10">
                    <span className="text-[10px] font-bold">Oxirgi skan</span>
                    <span className="text-[10px] font-black text-emerald-400">2 soat avval</span>
                 </div>
                 <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/10">
                    <span className="text-[10px] font-bold">Zaxira nusxa</span>
                    <span className="text-[10px] font-black text-blue-400">Har kunlik</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
