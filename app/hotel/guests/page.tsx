"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Users, Search, Plus, Loader2, Mail, Phone, Crown, CalendarDays,
  X, Verified, RefreshCw, ChevronRight, TrendingUp
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface Guest {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  vipStatus: string;
  totalVisits: number;
  totalSpent: number;
  notes: string | null;
  createdAt: string;
}

export default function GuestsPage() {
  const { t } = useLanguage();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);

  // Form State
  const [formData, setFormData] = useState({ firstName: "", lastName: "", phone: "", email: "", vipStatus: "REGULAR", notes: "" });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/hotel/guests");
      const data = await res.json();
      if (res.ok) setGuests(data.guests);
    } catch { toast.error(t("common.error")); }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const filtered = guests.filter(g => 
     g.firstName.toLowerCase().includes(q.toLowerCase()) || 
     (g.lastName && g.lastName.toLowerCase().includes(q.toLowerCase())) ||
     (g.phone && g.phone.includes(q))
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    try {
       const res = await fetch("/api/hotel/guests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
       });
       if(res.ok) {
          toast.success(t("guests.toasts.save_success"));
          setAdding(false);
          setFormData({ firstName: "", lastName: "", phone: "", email: "", vipStatus: "REGULAR", notes: "" });
          void load();
       } else {
          toast.error(t("guests.toasts.save_error"));
       }
    } catch { toast.error(t("guests.toasts.network_error")); }
  }

  return (
    <div className="space-y-8 pb-10 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight flex items-center gap-2">
             <Users size={24} className="text-[var(--accent)]"/> {t("guests.title")}
          </h1>
          <p className="text-[13px] font-semibold text-slate-500 mt-1">
            {t("guests.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => void load()} className="p-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
           </button>
           <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-[13px] font-bold rounded-lg hover:bg-[var(--secondary)] transition-colors shadow-sm">
              <Plus size={16}/> {t("guests.add_new")}
           </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-black text-slate-400 uppercase">{t("guests.stats.total")}</span>
            <span className="text-2xl font-black text-[var(--primary)] mt-1">{guests.length}</span>
         </div>
         <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-black text-amber-500 uppercase flex items-center gap-1"><Crown size={12}/> {t("guests.stats.vip")}</span>
            <span className="text-2xl font-black text-amber-600 mt-1">{guests.filter(g => g.vipStatus !== "REGULAR").length}</span>
         </div>
         <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-black text-green-500 uppercase flex items-center gap-1"><TrendingUp size={12}/> {t("guests.stats.revenue")}</span>
            <span className="text-xl font-black text-green-700 mt-1 uppercase">
               {guests.reduce((sum, g) => sum + Number(g.totalSpent || 0), 0).toLocaleString()} {t("common.currency")}
            </span>
         </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center relative max-w-md">
         <Search size={16} className="absolute left-4 text-slate-400" />
         <input 
            value={q} onChange={e => setQ(e.target.value)}
            placeholder={t("guests.search_placeholder")} 
            className="w-full pl-11 pr-4 py-2.5 text-[13px] font-bold border border-slate-200 rounded-xl outline-none focus:border-[var(--accent)] shadow-sm bg-white" 
         />
      </div>

      {/* Table List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
           <thead>
              <tr className="bg-[var(--bg-light-blue)] border-b border-slate-200 text-[11px] font-black text-[var(--accent)] uppercase tracking-wider">
                 <th className="py-3 px-5">{t("guests.table.name")}</th>
                 <th className="py-3 px-5">{t("guests.table.contact")}</th>
                 <th className="py-3 px-5">{t("guests.table.status")}</th>
                 <th className="py-3 px-5 text-center">{t("guests.table.visits")}</th>
                 <th className="py-3 px-5">{t("guests.table.notes")}</th>
                 <th className="py-3 px-5"></th>
              </tr>
           </thead>
           <tbody className="text-[13px]">
              {loading ? (
                 <tr><td colSpan={6} className="py-16 text-center"><Loader2 size={24} className="animate-spin mx-auto text-slate-300"/></td></tr>
              ) : filtered.length === 0 ? (
                 <tr><td colSpan={6} className="py-16 text-center text-slate-400 font-bold">{t("guests.table.no_data")}</td></tr>
              ) : filtered.map(g => (
                 <tr key={g.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors group cursor-pointer">
                    <td className="py-3 px-5">
                       <div className="font-bold text-[var(--primary)] text-[14px]">{g.firstName} {g.lastName || ""}</div>
                       <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 flex items-center gap-1">
                          <CalendarDays size={10}/> {new Date(g.createdAt).toLocaleDateString()}
                       </div>
                    </td>
                    <td className="py-3 px-5 font-semibold text-slate-600">
                       {g.phone && <div className="flex items-center gap-1"><Phone size={12} className="text-slate-400"/> {g.phone}</div>}
                       {g.email && <div className="flex items-center gap-1 mt-0.5"><Mail size={12} className="text-slate-400"/> {g.email}</div>}
                       {(!g.phone && !g.email) && <span className="text-slate-300">-</span>}
                    </td>
                    <td className="py-3 px-5">
                       {g.vipStatus === "REGULAR" ? (
                          <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[10px] font-black uppercase">{t("guests.table.standard")}</span>
                       ) : (
                          <span className="px-2 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded flex items-center gap-1 w-fit text-[10px] font-black uppercase">
                             <Crown size={10}/> {t("guests.table.vip")}
                          </span>
                       )}
                    </td>
                    <td className="py-3 px-5 text-center font-black text-slate-700">{g.totalVisits} {t("common.unit")}</td>
                    <td className="py-3 px-5 text-[11px] text-slate-500 font-medium max-w-[200px] truncate">
                       {g.notes || <span className="text-slate-300 italic">{t("guests.table.no_notes")}</span>}
                    </td>
                    <td className="py-3 px-5 text-right">
                       <button className="p-1.5 text-slate-400 hover:text-[var(--accent)] hover:bg-[var(--bg-light-blue)] rounded transition-colors opacity-0 group-hover:opacity-100">
                          <ChevronRight size={16}/>
                       </button>
                    </td>
                 </tr>
              ))}
           </tbody>
        </table>
      </div>

      {/* Add Drawer */}
      {adding && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-[var(--primary)] text-[15px]">{t("guests.modal.title")}</h3>
                  <button onClick={() => setAdding(false)} className="p-1.5 text-slate-400 hover:text-slate-600 bg-white rounded-md shadow-sm"><X size={16}/></button>
               </div>
               <form onSubmit={handleAdd} className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("guests.modal.first_name")}</label>
                        <input required value={formData.firstName} onChange={e=>setFormData({...formData, firstName: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[var(--accent)]"/>
                     </div>
                     <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("guests.modal.last_name")}</label>
                        <input value={formData.lastName} onChange={e=>setFormData({...formData, lastName: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[var(--accent)]"/>
                     </div>
                  </div>
                  <div>
                     <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("guests.modal.phone")}</label>
                     <input value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} placeholder={t("guests.modal.phone_placeholder")} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[var(--accent)]"/>
                  </div>
                  <div>
                     <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("guests.modal.vip_status")}</label>
                     <select value={formData.vipStatus} onChange={e=>setFormData({...formData, vipStatus: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[var(--accent)] appearance-none bg-white cursor-pointer">
                        <option value="REGULAR">{t("guests.modal.vip_regular")}</option>
                        <option value="VIP">{t("guests.modal.vip_gold")}</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("guests.modal.notes")}</label>
                     <textarea value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} rows={2} placeholder={t("guests.modal.notes_placeholder")} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-[var(--accent)] resize-none" />
                  </div>
                  <div className="pt-2">
                     <button type="submit" className="w-full py-2.5 bg-[var(--accent)] text-white text-[13px] font-bold rounded-lg hover:bg-[var(--accent-hover)] transition-colors flex items-center justify-center gap-2">
                       <Verified size={16}/> {t("guests.modal.save_btn")}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}

    </div>
  );
}
