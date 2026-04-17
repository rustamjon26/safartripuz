"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, DollarSign, Users, CalendarCheck, 
  Loader2, RefreshCw, BarChart4, ArrowUpRight, ArrowDownRight, Target
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface Metric { label: string; value: number; unit?: string; icon: any; color: string; bg: string; }
interface Trend { date: string; amount: number; }

export default function RevenuePage() {
  const { t, language } = useLanguage();
  const [data, setData] = useState<{ metrics: any, dailyTrend: Trend[] } | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/hotel/revenue");
      const result = await res.json();
      if (res.ok) setData(result);
    } catch { toast.error(t("common.toasts.error")); }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <Loader2 size={24} className="animate-spin text-slate-400 mb-3" />
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t("revenue.loading")}</p>
    </div>
  );

  const metrics = data ? [
    { label: t("revenue.metrics.total_revenue"), value: data.metrics.totalRevenue, unit: t("common.currency"), icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
    { label: t("revenue.metrics.adr"), value: data.metrics.adr, unit: t("common.currency"), icon: Target, color: "text-blue-600", bg: "bg-blue-50" },
    { label: t("revenue.metrics.occupancy"), value: data.metrics.occupancyRate, unit: "%", icon: Users, color: "text-[var(--accent)]", bg: "bg-[var(--bg-light-blue)]" },
    { label: t("revenue.metrics.revpar"), value: data.metrics.revpar, unit: t("common.currency"), icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
  ] : [];

  const maxAmt = data ? Math.max(...data.dailyTrend.map(t => t.amount), 1000) : 1000;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight flex items-center gap-2">
             <BarChart4 size={24} className="text-[var(--accent)]"/> {t("revenue.title")}
          </h1>
          <p className="text-[13px] font-semibold text-slate-500 mt-1">
            {t("revenue.subtitle")}
          </p>
        </div>
        <button onClick={() => void load()} className="p-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">
           <RefreshCw size={16} />
        </button>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         {metrics.map((m, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-[var(--accent)] transition-all">
               <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-xl ${m.bg} ${m.color}`}>
                     <m.icon size={18} strokeWidth={2.5}/>
                  </div>
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{m.label}</span>
               </div>
               <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-[var(--primary)] leading-none">{m.value.toLocaleString()}</span>
                  <span className="text-[11px] font-bold text-slate-400 mb-0.5 lowercase">{m.unit}</span>
               </div>
            </div>
         ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* Daily Revenue Chart */}
         <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-8">
               <h3 className="font-extrabold text-[var(--primary)] text-[15px]">{t("revenue.charts.daily_revenue")}</h3>
               <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black rounded-lg">
                  <ArrowUpRight size={14}/> {t("revenue.charts.growth", { percent: 12 })}
               </div>
            </div>

            <div className="h-[200px] flex items-end justify-between gap-4 px-2">
               {data?.dailyTrend.map((t_item, idx) => {
                  const h = (t_item.amount / maxAmt) * 100;
                  return (
                     <div key={idx} className="flex-1 flex flex-col items-center gap-3 group relative">
                        {/* Bar */}
                        <div className="w-full bg-slate-100 rounded-t-lg transition-all relative overflow-hidden group-hover:bg-[var(--bg-light-blue)]" style={{ height: '100%' }}>
                           <div className="absolute bottom-0 left-0 right-0 bg-[var(--accent)] rounded-t-lg transition-all duration-700" 
                                style={{ height: `${Math.max(h, 2)}%` }} />
                           
                           {/* Hover Value */}
                           <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[var(--primary)] text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                              {t_item.amount.toLocaleString()} {t("common.currency")}
                           </div>
                        </div>
                        {/* Label */}
                        <span className="text-[10px] font-black text-slate-400 uppercase">
                           {new Date(t_item.date).toLocaleDateString(language === 'uz' ? 'uz-UZ' : 'en-US', { day: 'numeric', month: 'short' })}
                        </span>
                     </div>
                  );
               })}
            </div>
         </div>

         {/* Distribution / Side Stats */}
         <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-full">
               <h3 className="font-extrabold text-[var(--primary)] text-[15px] mb-6">{t("revenue.charts.source_occupancy")}</h3>
               
               <div className="space-y-5">
                  {(data as any)?.sources ? (data as any).sources.map((s: any, idx: number) => (
                     <div key={idx}>
                        <div className="flex justify-between items-center text-[12px] font-bold mb-1.5">
                           <span className="text-slate-600">{s.label}</span>
                           <span className="text-[var(--primary)]">{s.val}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                           <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.val}%` }} />
                        </div>
                     </div>
                  )) : (
                     <div className="text-center py-10 text-slate-300 font-bold uppercase text-[10px] tracking-widest">{t("revenue.charts.no_data")}</div>
                  )}
               </div>

               <div className="mt-10 p-4 rounded-xl bg-slate-50 border border-slate-200 border-dashed">
                  <p className="text-[11px] font-bold text-slate-500 leading-relaxed text-center italic">
                     {t("revenue.insights.seasonal", { percent: 15 })}
                  </p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
