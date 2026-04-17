"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3, FileText, Download, Loader2, Calendar, 
  TrendingUp, TrendingDown, DollarSign, Package, UserCog, Printer, ArrowUpRight
} from "lucide-react";
import { utils, writeFile } from "xlsx";
import { useLanguage } from "@/context/LanguageContext";

export default function ReportsPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/hotel/reports");
      const result = await res.json();
      if (res.ok) setData(result);
    } catch { toast.error(t("common.toasts.error")); }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const handleExport = (type: "PDF" | "EXCEL") => {
    if (!data?.dailyTrend) return;
    
    if (type === "EXCEL") {
      // Professional XLSX Export using SheetJS
      const headers = ["Sana", "Xonalar (Rooms)", "Restoran (F&B)", "Jami Tushum"];
      const rows = data.dailyTrend.map((t: any) => ({
        "Sana": new Date(t.date).toLocaleDateString('uz-UZ'),
        "Xonalar (Rooms)": Number(t.roomRev),
        "Restoran (F&B)": Number(t.foodRev),
        "Jami Tushum": Number(t.total)
      }));

      const worksheet = utils.json_to_sheet(rows);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, t("reports.excel_sheet"));

      // Set column widths for better readability
      const wscols = [
        { wch: 15 }, // Sana
        { wch: 20 }, // Xonalar
        { wch: 20 }, // Restoran
        { wch: 20 }, // Jami
      ];
      worksheet["!cols"] = wscols;

      writeFile(workbook, `hisobot_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(t("reports.toast.excel_ready"));
    } else {
      // PDF Export via Print optimization
      window.print();
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <Loader2 size={24} className="animate-spin text-slate-400 mb-3" />
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t("reports.loading")}</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight flex items-center gap-2">
             <BarChart3 size={24} className="text-[var(--accent)]"/> {t("reports.title")}
          </h1>
          <p className="text-[13px] font-semibold text-slate-500 mt-1">
            {t("reports.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => handleExport("EXCEL")} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-[12px] font-black rounded-lg hover:bg-green-700 transition-all uppercase tracking-wider">
              <Download size={16}/> {t("reports.export_excel")}
           </button>
           <button onClick={() => handleExport("PDF")} className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-[12px] font-black rounded-lg hover:bg-red-700 transition-all uppercase tracking-wider">
              <FileText size={16}/> {t("reports.export_pdf")}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Monthly Revenue Summary */}
         <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-extrabold text-[var(--primary)] text-[15px] flex items-center gap-2">
                  <DollarSign size={18} className="text-green-500"/> {t("reports.monthly_revenue")}
               </h3>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded border border-slate-100">{t("reports.all_sectors")}</span>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="py-3 px-2">{t("reports.headers.date")}</th>
                        <th className="py-3 px-2 text-right">{t("reports.headers.rooms")}</th>
                        <th className="py-3 px-2 text-right">{t("reports.headers.fb")}</th>
                        <th className="py-3 px-2 text-right font-black">{t("reports.headers.total")}</th>
                     </tr>
                  </thead>
                  <tbody className="text-[13px] font-bold text-slate-600">
                     {data?.dailyTrend?.length > 0 ? data.dailyTrend.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                           <td className="py-3 px-2">{new Date(item.date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' })}</td>
                           <td className="py-3 px-2 text-right text-slate-400">{Number(item.roomRev).toLocaleString()}</td>
                           <td className="py-3 px-2 text-right text-slate-400">{Number(item.foodRev).toLocaleString()}</td>
                           <td className="py-3 px-2 text-right text-[var(--primary)] font-black">{Number(item.total).toLocaleString()} {t("common.currency")}</td>
                        </tr>
                     )) : (
                        <tr><td colSpan={4} className="py-20 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">{t("reports.no_data")}</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Sector Stats */}
         <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
               <h3 className="font-extrabold text-[var(--primary)] text-[15px] mb-6 flex items-center gap-2">
                  <TrendingUp size={18} className="text-[var(--accent)]"/> {t("reports.monthly_kpis")}
               </h3>
               <div className="space-y-4">
                  {[
                     { label: t("reports.occupancy_label"), value: `${Math.round(data?.summary?.occupancyRate || 0)}%`, icon: Calendar, color: "text-blue-500" },
                     { label: t("reports.adr_label"), value: `${Math.round(data?.summary?.adr || 0).toLocaleString()} ${t("common.currency")}`, icon: DollarSign, color: "text-green-500" },
                     { label: t("reports.revpar_label"), value: `${Math.round(data?.summary?.revpar || 0).toLocaleString()} ${t("common.currency")}`, icon: TrendingUp, color: "text-purple-500" },
                  ].map((m, i) => (
                     <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                           <m.icon size={16} className={m.color} />
                           <span className="text-[12px] font-bold text-slate-600">{m.label}</span>
                        </div>
                        <span className="font-black text-[var(--primary)] text-[13px]">{m.value}</span>
                     </div>
                  ))}
               </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
               <h3 className="font-extrabold text-[var(--primary)] text-[15px] mb-4 flex items-center gap-2">
                  <Package size={18} className="text-amber-500"/> {t("reports.operational_costs")}
               </h3>
               <div className="space-y-3">
                  <div className="flex justify-between text-[12px] font-black">
                     <span className="text-slate-500 uppercase tracking-tighter">{t("reports.staff_salaries")}</span>
                     <span className="text-slate-800">{Number(data?.summary?.staffCosts || 0).toLocaleString()} {t("common.currency")}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (data?.summary?.staffCosts / (data?.summary?.totalRevenue || 1)) * 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-[12px] font-black pt-2">
                     <span className="text-slate-500 uppercase tracking-tighter">{t("reports.logistics")}</span>
                     <span className="text-slate-800">{Number(data?.summary?.logisticsCosts || 0).toLocaleString()} {t("common.currency")}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-amber-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (data?.summary?.logisticsCosts / (data?.summary?.totalRevenue || 1)) * 100)}%` }} />
                  </div>
               </div>
               
               <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="flex justify-between items-center bg-[var(--primary)] text-white p-4 rounded-xl shadow-lg">
                     <div>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-70">{t("reports.net_profit")}</p>
                        <h4 className="text-lg font-black">{Number(data?.summary?.netProfit || 0).toLocaleString()} {t("common.currency")}</h4>
                     </div>
                     <ArrowUpRight size={20} className="text-green-400"/>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
