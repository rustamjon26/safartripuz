"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Receipt, Wallet, Search, CreditCard, Banknote, DollarSign,
  Loader2, RefreshCw, X, Verified, MoveDownRight, MoveUpRight, ArrowRight, Printer
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface FolioItem { id: string; category: string; description: string; amount: number; isPaid: boolean; createdAt: string; }
interface Payment { id: string; method: string; amount: number; createdAt: string; }
interface Booking {
  id: string; guestName: string; checkInDate: string; roomCount: number;
  totalAmount: number; paidAmount: number; status: string;
  roomType: { name: string } | null;
  folioItems: FolioItem[]; payments: Payment[];
}

export default function FinancePage() {
  const { t } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);

  // Forms
  const [actionType, setActionType] = useState<"PAYMENT" | "CHARGE">("PAYMENT");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [category, setCategory] = useState("MINIBAR");
  const [desc, setDesc] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/hotel/finance");
      const data = await res.json();
      if (res.ok) setBookings(data.bookings);
    } catch { toast.error(t("common.error")); }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

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

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight flex items-center gap-2">
             <Receipt size={24} className="text-[var(--accent)]"/> {t("finance.title")}
          </h1>
          <p className="text-[13px] font-semibold text-slate-500 mt-1">
            {t("finance.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => void load()} className="flex items-center gap-2 p-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> {t("common.refresh")}
           </button>
        </div>
      </div>

      {/* Overview KPI */}
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
