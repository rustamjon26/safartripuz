"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Package, Search, Plus, Loader2, RefreshCw, X, Verified,
  MoveDown, MoveUp, AlertTriangle, History, ArrowRight
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface Transaction { id: string; type: "IN" | "OUT"; quantity: number; notes: string | null; createdAt: string; }
interface Item { 
  id: string; name: string; category: string; unit: string; 
  quantity: number; minQuantity: number; transactions: Transaction[]; 
}

export default function InventoryPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [activeItem, setActiveItem] = useState<Item | null>(null);

  // Forms
  const [form, setForm] = useState({ name: "", category: "GENERAL", unit: "PCS", quantity: "0", minQuantity: "5" });
  const [transForm, setTransForm] = useState({ type: "IN", quantity: "", notes: "" });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/hotel/inventory");
      const data = await res.json();
      if (res.ok) setItems(data.items || []);
    } catch { toast.error(t("common.error")); }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/hotel/inventory", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) { toast.success(t("services.inv.toasts.add_success")); setAdding(false); void load(); }
    } catch { toast.error(t("common.error")); }
  }

  async function handleTrans(e: React.FormEvent) {
    e.preventDefault();
    if (!activeItem) return;
    try {
      const res = await fetch(`/api/hotel/inventory/${activeItem.id}/transaction`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transForm)
      });
      if (res.ok) { toast.success(t("services.inv.toasts.update_success")); setActiveItem(null); void load(); }
    } catch { toast.error(t("common.error")); }
  }

  const filtered = (items || []).filter(i => i.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-10 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight flex items-center gap-2">
             <Package size={24} className="text-[var(--accent)]"/> {t("services.inv.title")}
          </h1>
          <p className="text-[13px] font-semibold text-slate-500 mt-1">
            {t("services.inv.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => void load()} className="p-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
           </button>
           <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-[13px] font-bold rounded-lg hover:bg-[var(--secondary)]">
              <Plus size={16}/> {t("services.inv.add_item_btn")}
           </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[110px]">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t("services.inv.total_items")}</span>
            <div className="text-3xl font-black text-[var(--primary)]">{items.length}</div>
         </div>
         <div className={`border rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[110px] transition-all ${items.filter(i => Number(i.quantity) <= Number(i.minQuantity)).length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
            <span className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-2 ${items.filter(i => Number(i.quantity) <= Number(i.minQuantity)).length > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
               <AlertTriangle size={14}/> {t("services.inv.low_stock")}
            </span>
            <div className={`text-3xl font-black ${items.filter(i => Number(i.quantity) <= Number(i.minQuantity)).length > 0 ? 'text-amber-700' : 'text-[var(--primary)]'}`}>
               {items.filter(i => Number(i.quantity) <= Number(i.minQuantity)).length}
            </div>
         </div>
      </div>

      {/* Search and Table Section */}
      <div className="space-y-6">

      {/* Search */}
      <div className="max-w-sm relative">
         <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
         <input 
            value={q} onChange={e => setQ(e.target.value)}
            placeholder={t("services.inv.search_placeholder")} 
            className="w-full pl-11 pr-4 py-2.5 text-[13px] font-bold border border-slate-200 rounded-xl bg-white focus:border-[var(--accent)] outline-none" 
         />
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
         <table className="w-full text-left">
            <thead>
               <tr className="bg-[var(--bg-light-blue)] border-b border-slate-200 text-[11px] font-black text-[var(--primary)] uppercase tracking-widest">
                  <th className="py-3 px-5">{t("services.inv.table.name")}</th>
                  <th className="py-3 px-5">{t("services.inv.table.category")}</th>
                  <th className="py-3 px-5 text-center">{t("services.inv.table.quantity")}</th>
                  <th className="py-3 px-5">{t("services.inv.table.last_action")}</th>
                  <th className="py-3 px-5"></th>
               </tr>
            </thead>
            <tbody className="text-[13px]">
               {loading ? (
                  <tr><td colSpan={5} className="py-16 text-center"><Loader2 size={24} className="animate-spin mx-auto text-slate-300"/></td></tr>
               ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="py-16 text-center text-slate-400 font-bold">{t("services.inv.no_data")}</td></tr>
               ) : filtered.map(i => (
                  <tr key={i.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                     <td className="py-4 px-5 font-bold text-[var(--primary)]">
                        {i.name}
                        {Number(i.quantity) <= Number(i.minQuantity) && <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-[9px] uppercase font-black">{t("services.inv.status_low")}</span>}
                     </td>
                     <td className="py-4 px-5">
                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase">{t(`services.inv.categories.${i.category}`)}</span>
                     </td>
                     <td className="py-4 px-5 text-center">
                        <div className="font-black text-slate-700 text-[15px]">{Number(i.quantity)} {t(`services.inv.units.${i.unit}`)}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Min: {i.minQuantity}</div>
                     </td>
                     <td className="py-4 px-5">
                        {i.transactions[0] ? (
                           <div className="flex items-center gap-2">
                              {i.transactions[0].type === "IN" ? <MoveDown size={14} className="text-green-500"/> : <MoveUp size={14} className="text-red-500"/>}
                              <div className="text-[11px] font-semibold text-slate-500">
                                 {i.transactions[0].type === "IN" ? t("services.inv.action_in") : t("services.inv.action_out")} • {i.transactions[0].quantity} {t(`services.inv.units.${i.unit}`)}
                              </div>
                           </div>
                        ) : <span className="text-slate-300">-</span>}
                     </td>
                     <td className="py-4 px-5 text-right">
                        <button onClick={() => { setTransForm({ type: "IN", quantity: "", notes: "" }); setActiveItem(i); }} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-[11px] font-black uppercase rounded hover:bg-[var(--accent)] hover:text-white transition-all">
                           {t("services.inv.table.manage")} <ArrowRight size={12} className="inline ml-1" />
                        </button>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
      </div>

      {/* Add Modal */}
      {adding && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-[var(--primary)] text-[15px]">{t("services.inv.modal_add_title")}</h3>
                  <button onClick={() => setAdding(false)} className="p-1.5 text-slate-400 hover:text-slate-600 bg-white rounded-md shadow-sm opacity-80 hover:opacity-100"><X size={16}/></button>
               </div>
               <form onSubmit={handleAdd} className="p-5 space-y-4">
                  <div>
                     <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("services.inv.form.name")}</label>
                     <input required value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:border-[var(--accent)] shadow-inner"/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("services.inv.form.category")}</label>
                        <select value={form.category} onChange={e=>setForm({...form, category: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white outline-none">
                           <option value="GENERAL">{t("services.inv.categories.GENERAL")}</option>
                           <option value="FOOD">{t("services.inv.categories.FOOD")}</option>
                           <option value="CLEANING">{t("services.inv.categories.CLEANING")}</option>
                           <option value="OFFICE">{t("services.inv.categories.OFFICE")}</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("services.inv.form.unit")}</label>
                        <select value={form.unit} onChange={e=>setForm({...form, unit: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white outline-none">
                           <option value="PCS">{t("services.inv.units.PCS")}</option>
                           <option value="KG">{t("services.inv.units.KG")}</option>
                           <option value="L">{t("services.inv.units.L")}</option>
                           <option value="BOX">{t("services.inv.units.BOX")}</option>
                        </select>
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("services.inv.form.initial_stock")}</label>
                        <input type="number" value={form.quantity} onChange={e=>setForm({...form, quantity: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white outline-none"/>
                     </div>
                     <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("services.inv.form.min_stock")}</label>
                        <input type="number" value={form.minQuantity} onChange={e=>setForm({...form, minQuantity: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white outline-none"/>
                     </div>
                  </div>
                  <div className="pt-2">
                     <button type="submit" className="w-full py-2.5 bg-[var(--accent)] text-white text-[13px] font-bold rounded-lg hover:bg-[var(--accent-hover)] transition-colors flex items-center justify-center gap-2">
                       <Verified size={16}/> {t("services.inv.form.save")}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* Transaction Modal */}
      {activeItem && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                  <div>
                     <h3 className="font-bold text-[var(--primary)] text-[15px]">{activeItem.name}</h3>
                     <p className="text-[10px] font-black text-slate-400 uppercase">{t("services.inv.modal_trans_title")}</p>
                  </div>
                  <button onClick={() => setActiveItem(null)} className="p-1.5 text-slate-400 hover:text-slate-600 bg-white rounded-md shadow-sm opacity-80 hover:opacity-100">{t("common.close")}</button>
               </div>
               
               <div className="p-4 bg-slate-50 flex gap-2">
                  <button onClick={()=>setTransForm({...transForm, type: "IN"})} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-black uppercase transition-all ${transForm.type==='IN'?'bg-green-600 text-white shadow-md shadow-green-200':'bg-white text-slate-400 border border-slate-200'}`}>
                     <MoveDown size={14}/> {t("services.inv.trans_form.type_in")}
                  </button>
                  <button onClick={()=>setTransForm({...transForm, type: "OUT"})} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-black uppercase transition-all ${transForm.type==='OUT'?'bg-red-600 text-white shadow-md shadow-red-200':'bg-white text-slate-400 border border-slate-200'}`}>
                     <MoveUp size={14}/> {t("services.inv.trans_form.type_out")}
                  </button>
               </div>

               <form onSubmit={handleTrans} className="p-5 space-y-4">
                  <div>
                     <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("services.inv.trans_form.amount")} ({t(`services.inv.units.${activeItem.unit}`)}) *</label>
                     <input required type="number" min="1" value={transForm.quantity} onChange={e=>setTransForm({...transForm, quantity: e.target.value})} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-black outline-none focus:border-[var(--accent)] bg-white"/>
                  </div>
                  <div>
                     <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("services.inv.trans_form.notes")}</label>
                     <input required value={transForm.notes} onChange={e=>setTransForm({...transForm, notes: e.target.value})} placeholder={t("services.inv.trans_form.notes_placeholder")} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-[var(--accent)]"/>
                  </div>
                  <div className="pt-2">
                     <button type="submit" className={`w-full py-2.5 text-white text-[13px] font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${transForm.type==='IN'?'bg-green-600 hover:bg-green-700':'bg-red-600 hover:bg-red-700'}`}>
                       {t("services.inv.trans_form.submit")}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}

    </div>
  );
}
