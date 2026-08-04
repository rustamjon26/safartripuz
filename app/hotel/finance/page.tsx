"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Receipt, Wallet, Search, CreditCard, Banknote, DollarSign,
  Loader2, RefreshCw, X, Verified, MoveDownRight, MoveUpRight, ArrowRight, Printer, FileText
} from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import type { HotelFinanceAnalytics } from "@/lib/hotel/getHotelFinanceAnalytics";

interface FolioItem { id: string; category: string; description: string; amount: number; isPaid: boolean; createdAt: string; }
interface Payment { id: string; method: string; amount: number; createdAt: string; }
interface Booking {
  id: string; guestName: string; checkInDate: string; roomCount: number;
  totalAmount: number; paidAmount: number; status: string;
  roomType: { name: string } | null;
  folioItems: FolioItem[]; payments: Payment[];
}

const EMPTY_ANALYTICS: HotelFinanceAnalytics = {
  kpis: [],
  revenueSeries: [],
  topRooms: [],
  paymentHistory: [],
};

function formatSom(n: number): string {
  return Math.round(n).toLocaleString("uz-UZ");
}

export default function FinancePage() {
  const { t } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [analytics, setAnalytics] = useState<HotelFinanceAnalytics>(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);

  // Forms
  const [actionType, setActionType] = useState<"PAYMENT" | "CHARGE">("PAYMENT");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [category, setCategory] = useState("MINIBAR");
  const [desc, setDesc] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hotel/finance");
      const data = (await res.json()) as {
        bookings?: Booking[];
        analytics?: HotelFinanceAnalytics;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? t("common.error"));
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      setAnalytics(data.analytics ?? EMPTY_ANALYTICS);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = bookings.filter(b => b.guestName.toLowerCase().includes(q.toLowerCase()) && b.status !== "CANCELLED");

  async function handleAction(e: React.FormEvent) {
     e.preventDefault();
     if(!activeBooking) return;
     try {
        if(actionType === "PAYMENT") {
           const res = await fetch("/api/hotel/finance/payment", {
              method: "POST", headers: { "Content-Type" : "application/json" },
              body: JSON.stringify({ bookingId: activeBooking.id, amount: Number(amount), method })
           });
           if(res.ok) { toast.success(t("finance.toasts.payment_success")); setActiveBooking(null); void load(); }
        } else {
           const res = await fetch("/api/hotel/finance/folio", {
              method: "POST", headers: { "Content-Type" : "application/json" },
              body: JSON.stringify({ bookingId: activeBooking.id, amount: Number(amount), category, description: desc })
           });
           if(res.ok) { toast.success(t("finance.toasts.charge_success")); setActiveBooking(null); void load(); }
        }
     } catch { toast.error(t("housekeeping.toasts.update_error")); }
  }

  const maxRev = Math.max(
    ...analytics.revenueSeries.map((d) => Math.max(d.current, d.previous)),
    1,
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight flex items-center gap-2">
             <Receipt size={24} className="text-[var(--accent)]"/> Moliya va hisobotlar
          </h1>
          <p className="text-[13px] font-semibold text-slate-500 mt-1">
            Mehmonxonangizning moliyaviy o‘sishini kuzatib boring. {t("finance.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
           <Link
             href="/hotel/invoices/new"
             className="flex items-center gap-2 px-3.5 py-2.5 bg-[#0d2137] text-white rounded-lg text-[12px] font-bold hover:bg-[#16324f]"
           >
              <FileText size={16} /> Invoys yaratish
           </Link>
           <button onClick={() => void load()} className="flex items-center gap-2 p-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> {t("common.refresh")}
           </button>
        </div>
      </div>

      {/* Live analytics from hotel bookings / payments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {(analytics.kpis.length ? analytics.kpis : [
          { id: "revenue", label: "Umumiy tushum", value: 0, unit: "so‘m (30 kun)", hint: "—", tone: "flat" as const },
          { id: "adr", label: "O‘rtacha kunlik narx (ADR)", value: 0, unit: "so‘m / xona-kecha", hint: "—", tone: "flat" as const },
          { id: "revpar", label: "RevPAR", value: 0, unit: "so‘m / xona-kun", hint: "—", tone: "flat" as const },
          { id: "collected", label: "Yig‘ilgan to‘lov", value: 0, unit: "so‘m (30 kun)", hint: "—", tone: "flat" as const },
        ]).map((kpi) => (
          <div key={kpi.id} className="bg-white border border-[#d8e3fb] rounded-2xl p-5 shadow-sm">
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">{kpi.label}</div>
            <div className="mt-2 font-display text-[26px] font-bold text-[#0d2137] leading-none">
              {loading ? "…" : formatSom(kpi.value)}
            </div>
            <div className="mt-1 text-[12px] font-semibold text-slate-400">{kpi.unit}</div>
            <div className={`mt-2 text-[12px] font-bold ${
              kpi.tone === "down" ? "text-amber-600" : kpi.tone === "flat" ? "text-slate-400" : "text-emerald-600"
            }`}>
              {kpi.hint} · o‘tgan 30 kunga nisbatan
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white border border-[#d8e3fb] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display text-[18px] font-bold text-[#0d2137]">Tushum dinamikasi</h2>
              <p className="text-[12px] font-semibold text-slate-500">Haftalik yig‘ilgan to‘lov — joriy vs o‘tgan</p>
            </div>
            <div className="flex gap-3 text-[11px] font-bold">
              <span className="inline-flex items-center gap-1.5 text-[#006781]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#006781]" /> Joriy
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> O‘tgan
              </span>
            </div>
          </div>
          {analytics.revenueSeries.length === 0 ? (
            <div className="h-[160px] flex items-center justify-center text-[13px] font-semibold text-slate-400">
              Hali to‘lovlar yo‘q
            </div>
          ) : (
            <div className="flex items-end gap-3 sm:gap-5 h-[160px]">
              {analytics.revenueSeries.map((d) => (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="w-full flex items-end justify-center gap-1 h-[120px]">
                    <div
                      className="w-3 sm:w-4 rounded-t-md bg-slate-300 min-h-[2px]"
                      style={{ height: `${Math.max(2, (d.previous / maxRev) * 100)}%` }}
                      title={`O‘tgan: ${formatSom(d.previous)}`}
                    />
                    <div
                      className="w-3 sm:w-4 rounded-t-md bg-[#006781] min-h-[2px]"
                      style={{ height: `${Math.max(2, (d.current / maxRev) * 100)}%` }}
                      title={`Joriy: ${formatSom(d.current)}`}
                    />
                  </div>
                  <div className="text-[10px] font-bold text-slate-400">{d.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-[#d8e3fb] rounded-2xl p-5 shadow-sm">
          <h2 className="font-display text-[18px] font-bold text-[#0d2137] mb-4">Top daromadli xonalar</h2>
          <div className="space-y-3">
            {analytics.topRooms.length === 0 ? (
              <p className="text-[13px] font-semibold text-slate-400 py-6 text-center">
                30 kun ichida bron yo‘q
              </p>
            ) : (
              analytics.topRooms.map((room) => (
                <div key={room.name} className="rounded-xl border border-[#d8e3fb] bg-[#f9f9ff] p-3">
                  <div className="flex justify-between gap-2">
                    <div className="text-[13px] font-bold text-[#0d2137]">{room.name}</div>
                    <div className="text-[13px] font-black text-[#006781]">{formatSom(room.revenue)}</div>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 mt-1">
                    {room.bookings} ta bron · {room.occupancy}% bandlik
                  </div>
                </div>
              ))
            )}
          </div>
          <Link href="/hotel/rooms" className="mt-4 inline-flex text-[12px] font-bold text-[#006781]">
            Barcha xonalar →
          </Link>
        </div>
      </div>

      <div className="bg-white border border-[#d8e3fb] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-display text-[18px] font-bold text-[#0d2137]">To‘lovlar tarixi</h2>
          <span className="text-[11px] font-bold text-slate-400 uppercase">Jonli</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-[#d8e3fb]">
                <th className="py-2 pr-3">Mehmon</th>
                <th className="py-2 px-3">Usul</th>
                <th className="py-2 px-3">Vaqt</th>
                <th className="py-2 px-3 text-right">Summa</th>
                <th className="py-2 pl-3">Holat</th>
              </tr>
            </thead>
            <tbody>
              {analytics.paymentHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[13px] font-semibold text-slate-400">
                    Hali to‘lov qayd etilmagan
                  </td>
                </tr>
              ) : (
                analytics.paymentHistory.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-3 text-[13px] font-bold text-[#0d2137]">{p.guest}</td>
                    <td className="py-3 px-3 text-[12px] font-semibold text-slate-500">{p.method}</td>
                    <td className="py-3 px-3 text-[12px] font-semibold text-slate-400">{p.when}</td>
                    <td className="py-3 px-3 text-[13px] font-black text-right text-[#006781]">
                      {formatSom(p.amount)}
                    </td>
                    <td className="py-3 pl-3">
                      <span className={p.status === "success" ? "h-badge h-badge-ok" : "h-badge h-badge-wait"}>
                        {p.status === "success" ? "Muvaffaqiyatli" : "Kutilmoqda"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live folio KPI (existing API) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase mb-2"><Wallet size={14}/> {t("finance.stats.expected")}</div>
            <div className="text-2xl font-black text-[var(--primary)] cursor-default">
               {bookings.reduce((acc, b) => acc + Number(b.totalAmount), 0).toLocaleString()} <span className="text-sm text-slate-400">{t("common.currency")}</span>
            </div>
         </div>
         <div className="bg-green-50 border border-green-100 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-black text-green-600 uppercase mb-2"><MoveDownRight size={14}/> {t("finance.stats.actual")}</div>
            <div className="text-2xl font-black text-green-700 cursor-default">
               {bookings.reduce((acc, b) => acc + Number(b.paidAmount), 0).toLocaleString()} <span className="text-sm text-green-600/60">{t("common.currency")}</span>
            </div>
         </div>
         <div className="bg-red-50 border border-red-100 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-black text-red-500 uppercase mb-2"><MoveUpRight size={14}/> {t("finance.stats.debt")}</div>
            <div className="text-xl font-black text-red-600 cursor-default flex items-center justify-between">
               <span>
                 {bookings.reduce((acc, b) => acc + b.folioItems.reduce((sum, f) => sum + Number(f.amount), 0), 0).toLocaleString()}
                 <span className="text-sm text-red-600/60 ml-1">{t("common.currency")}</span>
               </span>
               <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded text-red-500">{t("finance.stats.additional")}</span>
            </div>
         </div>
      </div>

      {/* Search */}
      <div className="flex items-center relative max-w-sm">
         <Search size={16} className="absolute left-4 text-slate-400" />
         <input 
            value={q} onChange={e => setQ(e.target.value)}
            placeholder={t("finance.search_placeholder")} 
            className="w-full pl-11 pr-4 py-2.5 text-[13px] font-bold border border-slate-200 rounded-xl outline-none focus:border-[var(--accent)] shadow-sm bg-white" 
         />
      </div>

      {/* Bookings Folio List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[400px]">
         <table className="w-full text-left">
            <thead>
               <tr className="bg-[var(--bg-light-blue)] border-b border-slate-200 text-[11px] font-black text-[var(--primary)] uppercase tracking-wider">
                  <th className="py-3 px-5">{t("finance.table.guest")}</th>
                  <th className="py-3 px-5">{t("finance.table.folio_status")}</th>
                  <th className="py-3 px-5">{t("finance.table.paid")}</th>
                  <th className="py-3 px-5">{t("finance.table.actions")}</th>
               </tr>
            </thead>
            <tbody className="text-[13px]">
               {loading ? (
                  <tr><td colSpan={4} className="py-16 text-center"><Loader2 size={24} className="animate-spin mx-auto text-slate-300"/></td></tr>
               ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="py-16 text-center text-slate-400 font-bold">{t("finance.table.no_data")}</td></tr>
               ) : filtered.map(b => {
                  const roomsCost = Number(b.totalAmount);
                  const extrasCost = b.folioItems.reduce((acc, f) => acc + Number(f.amount), 0);
                  const totalDebt = roomsCost + extrasCost;
                  const paid = Number(b.paidAmount);
                  const remains = totalDebt - paid;
                  
                  return (
                     <tr key={b.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-5">
                           <div className="font-bold text-[var(--primary)] text-[14px]">
                              {b.guestName}
                           </div>
                           <div className="text-[11px] font-bold text-slate-400 mt-1 uppercase flex items-center gap-1">
                              {b.roomType?.name || t("finance.table.room_fallback")} ({b.roomCount} {t("common.unit")})
                           </div>
                        </td>
                        <td className="py-4 px-5">
                           <div className="flex flex-col gap-1">
                              <div className="text-[11px] font-bold text-slate-500 flex justify-between w-40">
                                 <span>{t("finance.table.room_cost")}:</span> <span className="text-slate-800">{roomsCost.toLocaleString()}</span>
                              </div>
                              <div className="text-[11px] font-bold text-red-500 flex justify-between w-40 border-b border-slate-200 pb-1">
                                 <span>{t("finance.table.extra")}:</span> <span>+{extrasCost.toLocaleString()}</span>
                              </div>
                              <div className="text-[13px] font-black text-slate-900 flex justify-between w-40 pt-1">
                                 <span>{t("finance.table.total_debt")}:</span> <span>{totalDebt.toLocaleString()}</span>
                              </div>
                           </div>
                        </td>
                        <td className="py-4 px-5">
                           <div className="font-black text-green-600 text-[14px] mb-1">{paid.toLocaleString()} {t("common.currency")}</div>
                           {remains > 0 ? (
                              <div className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded uppercase w-fit inline-block">
                                 {t("finance.table.remains")}: {remains.toLocaleString()}
                              </div>
                           ) : remains === 0 ? (
                              <div className="text-[10px] font-black text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded uppercase w-fit inline-block">{t("finance.table.settled")}</div>
                           ) : (
                              <div className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded uppercase w-fit inline-block">{t("finance.table.overpaid")}: {Math.abs(remains).toLocaleString()}</div>
                           )}
                        </td>
                        <td className="py-4 px-5">
                           <button onClick={() => { setAmount(""); setDesc(""); setActiveBooking(b); }} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-[11px] font-black uppercase rounded shadow-sm border border-slate-200 hover:bg-white hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all flex items-center gap-1">
                              {t("finance.table.manage")} <ArrowRight size={12}/>
                           </button>
                        </td>
                     </tr>
                  );
               })}
            </tbody>
         </table>
      </div>

      {/* Modal Actions */}
      {activeBooking && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                  <div>
                     <h3 className="font-bold text-[var(--primary)] text-[15px]">{t("finance.modal.title", { name: activeBooking.guestName })}</h3>
                  </div>
                  <button onClick={() => setActiveBooking(null)} className="p-1.5 text-slate-400 hover:text-slate-600 bg-white rounded-md shadow-sm"><X size={16}/></button>
               </div>
               
                <div className="p-4 bg-slate-100/50 flex gap-2">
                  <button onClick={()=>setActionType("PAYMENT")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-black uppercase transition-all ${actionType==='PAYMENT'?'bg-[var(--accent)] text-white shadow-sm':'bg-white text-slate-500 border border-slate-200'}`}>
                     <Banknote size={14}/> {t("finance.modal.tab_payment")}
                  </button>
                  <button onClick={()=>setActionType("CHARGE")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-black uppercase transition-all ${actionType==='CHARGE'?'bg-red-500 text-white shadow-sm':'bg-white text-slate-500 border border-slate-200'}`}>
                     <DollarSign size={14}/> {t("finance.modal.tab_charge")}
                  </button>
                  <button onClick={() => window.print()} className="flex items-center justify-center gap-2 px-3 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg text-[12px] font-black transition-all hover:bg-slate-50">
                     <Printer size={14}/>
                  </button>
               </div>

               {/* Hidden Print Invoice Template */}
               <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-10 text-slate-900 overflow-visible">
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                     <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter">SafarTrip PMS</h1>
                        <p className="text-sm font-bold text-slate-500">{t("dashboard.pms_ad_desc")}</p>
                     </div>
                     <div className="text-right">
                        <h2 className="text-xl font-black uppercase">{t("finance.invoice.title")} #INV-{activeBooking.id.slice(-6).toUpperCase()}</h2>
                        <p className="text-sm font-bold">{t("finance.invoice.date")}: {new Date().toLocaleDateString()}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-10 mb-10">
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t("finance.invoice.to")}:</p>
                        <p className="text-lg font-black">{activeBooking.guestName}</p>
                        <p className="text-sm font-bold text-slate-500 italic">{activeBooking.roomType?.name || t("finance.table.room_fallback")} - {activeBooking.roomCount} {t("common.unit")}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t("finance.invoice.status")}:</p>
                        <p className={`text-lg font-black ${(activeBooking.totalAmount + activeBooking.folioItems.reduce((acc,f)=>acc+Number(f.amount), 0)) > activeBooking.paidAmount ? 'text-red-600' : 'text-green-600'}`}>
                           {(activeBooking.totalAmount + activeBooking.folioItems.reduce((acc,f)=>acc+Number(f.amount), 0)) > activeBooking.paidAmount ? t("finance.invoice.unpaid") : t("finance.invoice.paid")}
                        </p>
                     </div>
                  </div>

                  <table className="w-full text-left mb-10 border-collapse">
                     <thead>
                        <tr className="border-b-2 border-slate-900 text-[11px] font-black uppercase">
                           <th className="py-2">{t("finance.invoice.item_name")}</th>
                           <th className="py-2 text-right">{t("finance.invoice.item_total")}</th>
                        </tr>
                     </thead>
                     <tbody className="text-[13px] font-bold">
                        <tr className="border-b border-slate-200">
                           <td className="py-3">{t("finance.invoice.rent")}</td>
                           <td className="py-3 text-right">{activeBooking.totalAmount.toLocaleString()}</td>
                        </tr>
                        {activeBooking.folioItems.map((item, idx) => (
                           <tr key={idx} className="border-b border-slate-100">
                              <td className="py-3">{item.description} ({item.category})</td>
                              <td className="py-3 text-right">{item.amount.toLocaleString()}</td>
                           </tr>
                        ))}
                     </tbody>
                     <tfoot>
                        <tr className="border-t-2 border-slate-900 text-lg font-black">
                           <td className="py-4">{t("finance.invoice.total")}:</td>
                           <td className="py-4 text-right">
                              {(activeBooking.totalAmount + activeBooking.folioItems.reduce((acc,f)=>acc+Number(f.amount), 0)).toLocaleString()} {t("common.currency")}
                           </td>
                        </tr>
                        <tr className="text-green-600">
                           <td className="py-1 text-sm font-black">{t("finance.invoice.paid_label")}:</td>
                           <td className="py-1 text-right text-sm font-black">-{activeBooking.paidAmount.toLocaleString()}</td>
                        </tr>
                        <tr className="border-t border-slate-100 text-slate-900">
                           <td className="py-2 text-xl font-black">{t("finance.invoice.balance")}:</td>
                           <td className="py-2 text-right text-xl font-black">
                              {(activeBooking.totalAmount + activeBooking.folioItems.reduce((acc,f)=>acc+Number(f.amount), 0) - activeBooking.paidAmount).toLocaleString()} {t("common.currency")}
                           </td>
                        </tr>
                     </tfoot>
                  </table>

                  <div className="mt-20 pt-10 border-t border-slate-200 grid grid-cols-2 gap-10">
                     <div className="text-center italic text-xs text-slate-400">
                        {t("finance.invoice.footer")}
                     </div>
                     <div className="text-right">
                        <div className="inline-block w-48 border-b border-slate-900 mb-1"></div>
                        <p className="text-[10px] font-black uppercase text-slate-400">{t("finance.invoice.signature")}</p>
                     </div>
                  </div>
               </div>

               <form onSubmit={handleAction} className="p-5 space-y-4">
                  <div>
                     <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{actionType === 'PAYMENT' ? t("finance.modal.amount_payment") : t("finance.modal.amount_charge")}</label>
                     <input required type="number" min="0" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-black outline-none focus:border-[var(--accent)] bg-slate-50"/>
                  </div>
                  
                  {actionType === "PAYMENT" ? (
                     <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("finance.modal.method")}</label>
                        <select value={method} onChange={e=>setMethod(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none bg-white">
                           <option value="CASH">{t("finance.methods.CASH")}</option>
                           <option value="CARD">{t("finance.methods.CARD")}</option>
                           <option value="TRANSFER">{t("finance.methods.TRANSFER")}</option>
                        </select>
                     </div>
                  ) : (
                     <>
                        <div>
                           <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("finance.modal.category")}</label>
                           <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none bg-white">
                              <option value="MINIBAR">{t("finance.categories.MINIBAR")}</option>
                              <option value="RESTAURANT">{t("finance.categories.RESTAURANT")}</option>
                              <option value="LAUNDRY">{t("finance.categories.LAUNDRY")}</option>
                              <option value="DAMAGES">{t("finance.categories.DAMAGES")}</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("finance.modal.notes")}</label>
                           <input required value={desc} onChange={e=>setDesc(e.target.value)} placeholder={t("finance.modal.notes_placeholder")} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-[var(--accent)]"/>
                        </div>
                     </>
                  )}

                  <div className="pt-2">
                     <button type="submit" className={`w-full py-2.5 text-white text-[13px] font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${actionType==='PAYMENT'?'bg-green-600 hover:bg-green-700':'bg-red-500 hover:bg-red-600'}`}>
                       <Verified size={16}/> {actionType === 'PAYMENT' ? t("finance.modal.submit_payment") : t("finance.modal.submit_charge")}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}

    </div>
  );
}
