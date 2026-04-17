"use client";

import { useEffect, useState, use } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { toast } from "sonner";
import { Loader2, CreditCard, ShieldCheck, Box, Banknote } from "lucide-react";
import { useRouter } from "next/navigation";
import { ListChecks, MapPin, Tag } from "lucide-react";

export default function CheckoutPage({ params }: { params: Promise<{ planId: string }> }) {
  const router = useRouter();
  const { planId } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  
  const [plan, setPlan] = useState<any>(null);
  const [providers, setProviders] = useState<any>({ click: false, payme: false, uzum: false });

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`/api/travel-plans/${planId}`);
        if (!res.ok) throw new Error("Ma'lumot topilmadi");
        const data = await res.json();
        setPlan(data);
        setLoading(false);
      } catch (e) {
        toast.error("Sayohat ma'lumotlarini yuklab bo'lmadi");
        setLoading(false);
      }
    }
    init();
  }, [planId]);

  async function pay(provider: string) {
    setPaying(true);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, provider })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");

      window.location.href = data.paymentUrl;
    } catch (err: any) {
      toast.error(err.message);
      setPaying(false);
    }
  }

  if (loading) {
     return (
        <DashboardShell title="To'lovni amalga oshirish" subtitle="...">
           <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin" /></div>
        </DashboardShell>
     );
  }

  return (
    <DashboardShell title="To'lovni tanlang" subtitle="O'zingizga qulay usulda to'lovni amalga oshiring">
      <div className="max-w-xl mx-auto pt-8 pb-16">
        
        {/* Plan Summary Card */}
        {plan && (
          <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm mb-8">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-50">
              <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shrink-0">
                <ListChecks size={28} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 leading-tight">
                  {plan.tourPackage?.title || plan.destination}
                </h2>
                <p className="text-slate-500 font-bold text-sm flex items-center gap-1.5 mt-1">
                  <MapPin size={14} className="text-slate-400" /> {plan.destination}
                </p>
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Tag size={12} /> Umumiy To'lov
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-black text-3xl text-slate-900 tracking-tight">
                    {Number(plan.totalAmount).toLocaleString()}
                  </span>
                  <span className="text-sm font-black text-slate-500 uppercase">so'm</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <button disabled={paying} onClick={() => pay("CLICK")} className="w-full bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-blue-500 hover:shadow-lg transition-all group active:scale-95 disabled:opacity-50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                 <CreditCard className="w-8 h-8" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-black text-slate-800">Click Evolution</h3>
                <p className="text-sm font-medium text-slate-500">Karta orqali tezkor to'lov</p>
              </div>
            </div>
          </button>

          <button disabled={paying} onClick={() => pay("PAYME")} className="w-full bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-teal-500 hover:shadow-lg transition-all group active:scale-95 disabled:opacity-50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                 <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-black text-slate-800">Payme</h3>
                <p className="text-sm font-medium text-slate-500">Xavfsiz va ishonchli transfer</p>
              </div>
            </div>
          </button>
          
          <button disabled={paying} onClick={() => pay("UZUM")} className="w-full bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-purple-500 hover:shadow-lg transition-all group active:scale-95 disabled:opacity-50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                 <Box className="w-8 h-8" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-black text-slate-800">Uzum Bank</h3>
                <p className="text-sm font-medium text-slate-500">Uzum hisobidan to'lash</p>
              </div>
            </div>
          </button>

          <button disabled={paying} onClick={() => pay("MANUAL")} className="w-full bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-emerald-500 hover:shadow-lg transition-all group active:scale-95 disabled:opacity-50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                 <Banknote className="w-8 h-8" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-black text-slate-800">Karta orqali (Ruchnoy)</h3>
                <p className="text-sm font-medium text-slate-500">Hisob raqamiga pul o'tkazish</p>
              </div>
            </div>
          </button>
        </div>

      </div>
    </DashboardShell>
  );
}
