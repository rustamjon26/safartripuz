"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { toast } from "sonner";
import { Loader2, CreditCard, Save, Box, ShieldCheck, Banknote } from "lucide-react";

type ProviderConfig = {
  enabled: boolean;
  merchantId?: string;
  serviceId?: string;
  secretKey?: string;
  cardNumber?: string;
  cardHolder?: string;
};

type PaymentSettings = {
  click: ProviderConfig;
  payme: ProviderConfig;
  uzum: ProviderConfig;
  manual: ProviderConfig;
};

export default function PaymentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PaymentSettings>({
    click: { enabled: false, merchantId: "", serviceId: "", secretKey: "" },
    payme: { enabled: false, merchantId: "", secretKey: "" },
    uzum: { enabled: false, merchantId: "", secretKey: "" },
    manual: { enabled: false, cardNumber: "", cardHolder: "" }
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/settings/payments");
        if (!res.ok) throw new Error("Yuklab bo'lmadi");
        const data = await res.json();
        if (data.click || data.payme || data.uzum || data.manual) {
          setSettings({
            click: { ...settings.click, ...data.click },
            payme: { ...settings.payme, ...data.payme },
            uzum: { ...settings.uzum, ...data.uzum },
            manual: { ...settings.manual, ...data.manual },
          });
        }
      } catch (err: any) {
        toast.error("Sozlamalarni yuklashda xatolik yuz berdi");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error("Saqlab bo'lmadi");
      toast.success("Tolov sozlamalari muvaffaqiyatli saqlandi! 🎉");
    } catch (err) {
      toast.error("Ma'lumotlarni saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  function handleProviderChange(provider: keyof PaymentSettings, field: keyof ProviderConfig, value: string | boolean) {
    setSettings(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value
      }
    }));
  }

  if (loading) {
    return (
      <DashboardShell title="To'lov Sozlamalari" subtitle="To'lov tizimlari integratsiyasini boshqarish">
        <div className="flex items-center justify-center p-20 flex-col gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          <p className="text-slate-500 font-bold">Sozlamalar yuklanmoqda...</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="To'lov Sozlamalari" subtitle="Click, Payme va Uzum to'lovlari integratsiyasi">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Click Provider */}
        <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-50">
            <div className="flex gap-4">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <CreditCard className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 mb-1">Click Integratsiyasi</h2>
                <p className="text-sm text-slate-500">Click Evolution platformasi orqali tolovlarni qabul qilish.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" value="" className="sr-only peer" 
                checked={settings.click.enabled}
                onChange={(e) => handleProviderChange("click", "enabled", e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity ${!settings.click.enabled && "opacity-50 pointer-events-none"}`}>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Merchant ID</label>
              <input 
                type="text" 
                value={settings.click.merchantId}
                onChange={(e) => handleProviderChange("click", "merchantId", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50"
                placeholder="Click Merchant ID"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Service ID</label>
              <input 
                type="text" 
                value={settings.click.serviceId}
                onChange={(e) => handleProviderChange("click", "serviceId", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50"
                placeholder="Click Service ID"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Secret Key</label>
              <input 
                type="password" 
                value={settings.click.secretKey}
                onChange={(e) => handleProviderChange("click", "secretKey", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50"
                placeholder="Click Secret Key"
              />
            </div>
          </div>
        </section>

        {/* Payme Provider */}
        <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-50">
            <div className="flex gap-4">
              <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 mb-1">Payme Integratsiyasi</h2>
                <p className="text-sm text-slate-500">Payme orqali xavfsiz to'lovlarni amalga oshirish.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" value="" className="sr-only peer" 
                checked={settings.payme.enabled}
                onChange={(e) => handleProviderChange("payme", "enabled", e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>
          
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity ${!settings.payme.enabled && "opacity-50 pointer-events-none"}`}>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Merchant ID</label>
              <input 
                type="text" 
                value={settings.payme.merchantId}
                onChange={(e) => handleProviderChange("payme", "merchantId", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-slate-50"
                placeholder="Payme Merchant ID"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Secret Key (Password)</label>
              <input 
                type="password" 
                value={settings.payme.secretKey}
                onChange={(e) => handleProviderChange("payme", "secretKey", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-slate-50"
                placeholder="Payme Secret Key"
              />
            </div>
          </div>
        </section>

        {/* Uzum Provider */}
        <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-50">
            <div className="flex gap-4">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                <Box className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 mb-1">Uzum Bank Integratsiyasi</h2>
                <p className="text-sm text-slate-500">Uzum platformasi yordamida tezkor hisob-kitoblar.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" value="" className="sr-only peer" 
                checked={settings.uzum.enabled}
                onChange={(e) => handleProviderChange("uzum", "enabled", e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity ${!settings.uzum.enabled && "opacity-50 pointer-events-none"}`}>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Merchant ID</label>
              <input 
                type="text" 
                value={settings.uzum.merchantId}
                onChange={(e) => handleProviderChange("uzum", "merchantId", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none bg-slate-50"
                placeholder="Uzum Merchant ID"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Secret Key</label>
              <input 
                type="password" 
                value={settings.uzum.secretKey}
                onChange={(e) => handleProviderChange("uzum", "secretKey", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none bg-slate-50"
                placeholder="Uzum Secret Key"
              />
            </div>
          </div>
        </section>

        {/* Manual Provider */}
        <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-50">
            <div className="flex gap-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <Banknote className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 mb-1">Qo'lda O'tkazma (Kardga-Kard)</h2>
                <p className="text-sm text-slate-500">Mijozlar hisob raqamiga to'g'ridan to'g'ri to'lashlari uchun karta ma'lumotlari.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" value="" className="sr-only peer" 
                checked={settings.manual.enabled}
                onChange={(e) => handleProviderChange("manual", "enabled", e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
          
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity ${!settings.manual.enabled && "opacity-50 pointer-events-none"}`}>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Karta Raqami</label>
              <input 
                type="text" 
                value={settings.manual.cardNumber}
                onChange={(e) => handleProviderChange("manual", "cardNumber", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 font-mono tracking-widest"
                placeholder="8600 1234 ..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Karta Egasi</label>
              <input 
                type="text" 
                value={settings.manual.cardHolder}
                onChange={(e) => handleProviderChange("manual", "cardHolder", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 uppercase"
                placeholder="ALIYEV VALI"
              />
            </div>
          </div>
        </section>

        {/* Global Save Button */}
        <div className="flex justify-end pt-4">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-2xl font-black shadow-xl shadow-slate-900/20 active:scale-95 transition-all outline-none focus:ring-4 focus:ring-slate-200 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>}
            {saving ? "Saqlanmoqda..." : "Saqlash va Tasdiqlash"}
          </button>
        </div>

      </div>
    </DashboardShell>
  );
}
