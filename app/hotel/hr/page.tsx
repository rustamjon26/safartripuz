"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3, FileText, Download, Loader2, Calendar, 
  TrendingUp, TrendingDown, DollarSign, Package, UserCog, Printer, ArrowUpRight,
  Settings, Trash2, UserCheck, Key, Mail, Phone, AlertCircle, CheckCircle2, Shield, X, RefreshCw,
  Plus, Search
} from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";

interface Staff { id: string; firstName: string; lastName: string | null; phone: string | null; role: string; isActive: boolean; createdAt: string; user?: { email: string } }

export default function HRPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Staff[]>([]);
  const [adding, setAdding] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [generatedPass, setGeneratedPass] = useState<string | null>(null);

  const { t } = useLanguage();
  // Form
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", role: "RECEPTION", email: "" });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/hotel/hr");
      const d = await res.json();
      if (res.ok) setData(d.staff);
    } catch { toast.error(t("common.toasts.error")); }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const isEdit = !!editingStaff;
      const res = await fetch("/api/hotel/hr", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { ...form, id: editingStaff.id } : form)
      });
      const resData = await res.json();
      if (res.ok) {
        toast.success(isEdit ? t("hr.modal.update_success") : t("hr.modal.add_success"));
        if (!isEdit) setGeneratedPass(resData.generatedPassword);
        else { setAdding(false); setEditingStaff(null); }
        void load();
      } else {
        toast.error(resData.message || t("common.toasts.error"));
      }
    } catch { toast.error(t("common.toasts.error")); }
  }

  async function handleDelete(id: string) {
     if (!confirm(t("hr.modal.confirm_delete"))) return;
     try {
        const res = await fetch(`/api/hotel/hr?id=${id}`, { method: "DELETE" });
        if (res.ok) { toast.success(t("hr.modal.delete_success")); void load(); }
     } catch { toast.error(t("common.toasts.error")); }
  }

  async function toggleStatus(id: string, current: boolean) {
     try {
        const res = await fetch("/api/hotel/hr", {
           method: "PATCH", headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ id, isActive: !current })
        });
        if (res.ok) { toast.success(t("reception.toasts.status_updated")); void load(); }
     } catch { toast.error(t("common.toasts.error")); }
  }

  const roleColors: any = {
    ADMIN: "bg-red-50 text-red-600 border-red-100",
    RECEPTION: "bg-blue-50 text-blue-600 border-blue-100",
    CLEANER: "bg-amber-50 text-amber-600 border-amber-100",
    MANAGER: "bg-purple-50 text-purple-600 border-purple-100",
    WAITER: "bg-green-50 text-green-600 border-green-100",
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight flex items-center gap-2">
             <UserCog size={24} className="text-[var(--accent)]"/> {t("hr.title")}
          </h1>
          <p className="text-[13px] font-semibold text-slate-500 mt-1">
            {t("hr.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => void load()} className="p-2.5 bg-slate-100 text-slate-600 rounded-lg">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
           </button>
           <button onClick={() => { setEditingStaff(null); setAdding(true); setGeneratedPass(null); setForm({firstName:"",lastName:"",phone:"",role:"RECEPTION",email:""}); }} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-[13px] font-bold rounded-lg shadow-sm">
              <Plus size={16}/> {t("hr.add_staff")}
           </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm group">
            <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{t("hr.total_team")}</div>
            <div className="text-2xl font-black text-[var(--primary)]">{data.length}</div>
         </div>
         <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{t("hr.active_staff")}</div>
            <div className="text-2xl font-black text-green-600">{data.filter(s=>s.isActive).length}</div>
         </div>
         <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{t("hr.departments")}</div>
            <div className="text-2xl font-black text-blue-600">{new Set(data.map(s=>s.role)).size}</div>
         </div>
         <div className="bg-[var(--bg-light-blue)] border border-blue-100 rounded-xl p-4 shadow-sm">
            <div className="text-[10px] font-black text-blue-600 uppercase mb-1">{t("hr.new_notification")}</div>
            <div className="text-sm font-bold text-[var(--primary)]">{t("dashboard.no_data")}</div>
         </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
         <table className="w-full text-left border-collapse">
            <thead>
               <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-4 px-6">{t("hr.table.name")}</th>
                  <th className="py-4 px-6">{t("hr.table.role")}</th>
                  <th className="py-4 px-6">{t("hr.table.contact")}</th>
                  <th className="py-4 px-6">{t("hr.table.status")}</th>
                  <th className="py-4 px-6 text-right">{t("hr.table.action")}</th>
               </tr>
            </thead>
            <tbody className="text-[13px] font-bold">
               {loading ? (
                  <tr><td colSpan={5} className="py-20 text-center"><Loader2 size={24} className="animate-spin mx-auto text-slate-300"/></td></tr>
               ) : data.length === 0 ? (
                  <tr><td colSpan={5} className="py-20 text-center text-slate-400">{t("dashboard.no_data")}</td></tr>
               ) : data.map(s => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group">
                     <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                           <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 border border-slate-200">{s.firstName[0]}</div>
                           <div>
                              <div className="text-[14px] text-[var(--primary)] font-black leading-none mb-1">{s.firstName} {s.lastName}</div>
                              <div className="text-[10px] text-slate-400">ID: {s.id.slice(-6).toUpperCase()}</div>
                           </div>
                        </div>
                     </td>
                     <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black border uppercase tracking-wider ${roleColors[s.role] || 'bg-slate-50 text-slate-500'}`}>
                           {t("common.roles." + s.role.toLowerCase())}
                        </span>
                     </td>
                     <td className="py-4 px-6">
                        <div className="space-y-0.5">
                           <div className="flex items-center gap-1.5 text-slate-700"><Mail size={12} className="text-slate-300"/> {s.user?.email || t("hr.table.email_na")}</div>
                           <div className="flex items-center gap-1.5 text-slate-400 font-semibold"><Phone size={12} className="text-slate-300"/> {s.phone || t("hr.table.phone_na")}</div>
                        </div>
                     </td>
                     <td className="py-4 px-6">
                        <button onClick={() => toggleStatus(s.id, s.isActive)} className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border transition-all ${s.isActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                           {s.isActive ? t("hr.status.active") : t("hr.status.inactive")}
                        </button>
                     </td>
                     <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-1">
                           <button 
                              onClick={() => { setEditingStaff(s); setForm({firstName: s.firstName, lastName: s.lastName||"", phone: s.phone||"", role: s.role, email: s.user?.email || ""}); setAdding(true); setGeneratedPass(null); }}
                              className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                           >
                              <Settings size={16}/>
                           </button>
                           <button 
                              onClick={() => handleDelete(s.id)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                           >
                              <Trash2 size={16}/>
                           </button>
                        </div>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>

      {/* Add Staff Modal */}
      {adding && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-[var(--primary)] text-[15px] flex items-center gap-2"><UserCheck size={18}/> {editingStaff ? t("hr.modal.edit_title") : t("hr.modal.add_title")}</h3>
                  <button onClick={() => {setAdding(false); setEditingStaff(null);}} className="p-1.5 text-slate-400 hover:text-slate-600 bg-white rounded-md shadow-sm"><X size={16}/></button>
               </div>
               
               {generatedPass ? (
                 <div className="p-8 text-center space-y-6 animate-in slide-in-from-bottom-4">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600 border border-green-100">
                       <Shield size={32}/>
                    </div>
                    <div>
                       <h2 className="text-xl font-black text-slate-900 mb-2">{t("hr.modal.login_ready")}</h2>
                       <p className="text-sm font-semibold text-slate-500 mb-6 px-4 leading-relaxed">{t("hr.modal.login_desc")}</p>
                       
                       <div className="bg-[var(--bg-light-blue)] border-2 border-dashed border-blue-200 rounded-2xl p-6 relative group mb-8">
                          <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 py-0.5 border border-blue-100 rounded-full flex items-center gap-1 shadow-sm"><Key size={10}/> {t("hr.modal.temp_pass")}</div>
                          <div className="text-2xl font-black text-[var(--primary)] tracking-widest font-mono">{generatedPass}</div>
                       </div>
                    </div>
                    <button onClick={() => {setAdding(false); setGeneratedPass(null);}} className="w-full py-3 bg-[var(--primary)] text-white text-[13px] font-bold rounded-xl hover:bg-[var(--secondary)] transition-all shadow-lg flex items-center justify-center gap-2">
                       {t("hr.modal.got_it")} <CheckCircle2 size={16}/>
                    </button>
                    <p className="text-[10px] font-bold text-red-500 uppercase flex items-center justify-center gap-1"><AlertCircle size={12}/> {t("hr.modal.warning")}</p>
                 </div>
               ) : (
                 <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 pl-1">{t("hr.modal.first_name")}</label>
                          <input required value={form.firstName} onChange={e=>setForm({...form, firstName: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)] shadow-sm bg-slate-50/50"/>
                       </div>
                       <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 pl-1">{t("hr.modal.last_name")}</label>
                          <input value={form.lastName} onChange={e=>setForm({...form, lastName: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)] shadow-sm bg-slate-50/50"/>
                       </div>
                    </div>
                    <div>
                       <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 pl-1">{t("hr.modal.email")}</label>
                       <input required disabled={!!editingStaff} type="email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} placeholder="xodim@safartrip.uz" className={`w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)] shadow-sm ${editingStaff ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50/50'}`}/>
                    </div>
                    <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 pl-1">{t("hr.modal.phone")}</label>
                        <input value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} placeholder="+998 90 ..." className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)] shadow-sm bg-slate-50/50"/>
                    </div>
                    <div>
                       <label className="block text-[11px] font-black text-slate-500 uppercase mb-1 pl-1">{t("hr.modal.role")}</label>
                       <select value={form.role} onChange={e=>setForm({...form, role: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none bg-white cursor-pointer shadow-sm">
                          <option value="RECEPTION">{t("common.roles.receptionist")}</option>
                          <option value="CLEANER">{t("common.roles.cleaner")}</option>
                          <option value="WAITER">{t("common.roles.waiter")}</option>
                          <option value="MANAGER">{t("common.roles.hotel_manager")}</option>
                       </select>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex gap-3">
                       <button type="button" onClick={()=>{setAdding(false); setEditingStaff(null);}} className="flex-1 py-3 text-slate-500 font-bold text-[13px] hover:bg-slate-100 rounded-xl transition-all">{t("hr.modal.cancel")}</button>
                       <button type="submit" className="flex-[2] py-3 bg-[var(--primary)] text-white text-[13px] font-black rounded-xl hover:bg-[var(--secondary)] transition-all shadow-md">
                          {editingStaff ? t("hr.modal.save") : t("hr.modal.add_btn")}
                       </button>
                    </div>
                 </form>
               )}
            </div>
         </div>
      )}
    </div>
  );
}
