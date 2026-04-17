"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Megaphone, Star, MessageSquare, Search, Plus, Loader2, RefreshCw,
  TrendingUp, Users, Award, ShieldCheck, X, ThumbsUp, Send
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface Feedback { id: string; guestName: string; rating: number; comment: string | null; source: string; createdAt: string; }

export default function MarketingPage() {
  const { t } = useLanguage();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [metrics, setMetrics] = useState({ avgRating: 0, totalFeedbacks: 0, promoterRate: 0 });
  const [loading, setLoading] = useState(true);
  const [addingFeed, setAddingFeed] = useState(false);
  const [addingPromo, setAddingPromo] = useState(false);
  const [form, setForm] = useState({ guestName: "", rating: "5", comment: "", source: "DIRECT" });
  const [promoForm, setPromoForm] = useState({ title: "", code: "", discount: "", type: "SEASONAL" });
 
  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/hotel/marketing");
      const data = await res.json();
      if (res.ok) { setFeedbacks(data.feedbacks); setMetrics(data.metrics); }
    } catch { toast.error(t("common.toasts.error")); }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function handleSubmitFeedback(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/hotel/marketing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) { 
        toast.success(t("marketing.toasts.feedback_success")); 
        setAddingFeed(false); void load(); 
      }
    } catch { toast.error(t("common.toasts.error")); }
  }

  async function handleSubmitPromo(e: React.FormEvent) {
    e.preventDefault();
    toast.success(t("marketing.toasts.promo_success", { title: promoForm.title }));
    setAddingPromo(false);
    setPromoForm({ title: "", code: "", discount: "", type: "SEASONAL" });
  }
 
  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight flex items-center gap-2">
             <Megaphone size={24} className="text-[var(--accent)]"/> {t("marketing.title")}
          </h1>
          <p className="text-[13px] font-semibold text-slate-500 mt-1">
            {t("marketing.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => void load()} className="p-2.5 bg-slate-100 text-slate-600 rounded-lg">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
           </button>
           <button onClick={() => setAddingFeed(true)} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white text-[13px] font-bold rounded-lg shadow-sm">
              <MessageSquare size={16}/> {t("marketing.add_feedback_btn")}
           </button>
           <button onClick={() => setAddingPromo(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-[13px] font-bold rounded-lg shadow-sm">
              <Plus size={16}/> {t("marketing.new_promo_btn")}
           </button>
        </div>
      </div>
 
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
         <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-2">
               <span className="text-[10px] font-black text-slate-400 uppercase">{t("marketing.metrics.avg_rating")}</span>
               <div className="p-1.5 bg-amber-50 rounded-lg"><Star size={16} className="text-amber-500 fill-amber-500"/></div>
            </div>
            <div className="text-3xl font-black text-[var(--primary)] mb-1">{metrics.avgRating.toFixed(1)} <span className="text-sm text-slate-400">/ 5.0</span></div>
            <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><ThumbsUp size={12}/> {t("marketing.metrics.total_feedbacks", { count: metrics.totalFeedbacks })}</div>
         </div>
         <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-2">
               <span className="text-[10px] font-black text-slate-400 uppercase">{t("marketing.metrics.nps")}</span>
               <div className="p-1.5 bg-green-50 rounded-lg"><TrendingUp size={16} className="text-green-500"/></div>
            </div>
            <div className="text-3xl font-black text-green-600 mb-1">{metrics.promoterRate.toFixed(0)}%</div>
            <span className="text-[11px] font-bold text-slate-500">{t("marketing.metrics.nps_desc")}</span>
         </div>
         <div className="bg-[var(--bg-light-blue)] border border-blue-100 rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <Users size={80} className="absolute -right-4 -bottom-4 text-blue-200 opacity-20"/>
            <div className="relative z-10">
               <span className="text-[10px] font-black text-blue-600 uppercase">{t("marketing.metrics.active_promos")}</span>
               <div className="text-3xl font-black text-[var(--primary)] mb-1">2 <span className="text-sm text-blue-600">{t("marketing.metrics.promo_unit")}</span></div>
               <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-white text-[9px] font-black text-blue-600 rounded-md border border-blue-200 tracking-wider">#HOT_SUMMER</span>
                  <span className="px-2 py-0.5 bg-white text-[9px] font-black text-blue-600 rounded-md border border-blue-200 tracking-wider">#OPENING_20</span>
               </div>
            </div>
         </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Feedback List */}
         <div className="lg:col-span-2 space-y-4">
            <h3 className="font-extrabold text-[var(--primary)] text-[15px] flex items-center gap-2 mb-4">
               <MessageSquare size={18}/> {t("marketing.feedback_list.title")}
            </h3>
            
            <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
               {loading ? (
                 <div className="py-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-slate-300"/></div>
               ) : feedbacks.length === 0 ? (
                 <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-12 text-center text-slate-400 font-bold">{t("marketing.feedback_list.no_data")}</div>
               ) : feedbacks.map(fb => (
                 <div key={fb.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 border border-slate-200">{fb.guestName[0]}</div>
                          <div>
                             <div className="font-bold text-[var(--primary)] text-[14px]">{fb.guestName}</div>
                             <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{t(`marketing.forms.feedback.sources.${fb.source}`)} • {new Date(fb.createdAt).toLocaleDateString()}</div>
                          </div>
                       </div>
                       <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                             <Star key={i} size={14} className={i < fb.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"}/>
                          ))}
                       </div>
                    </div>
                    {fb.comment && <p className="text-[13px] text-slate-600 leading-relaxed font-medium italic">"{fb.comment}"</p>}
                 </div>
               ))}
            </div>
         </div>

         {/* Tools / Loyalty */}
         <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
               <h3 className="font-extrabold text-[var(--primary)] text-[15px] mb-4 flex items-center gap-2"><Award size={18}/> {t("marketing.loyalty.title")}</h3>
               <p className="text-[11px] font-bold text-slate-500 mb-6 leading-relaxed uppercase tracking-tighter">{t("marketing.loyalty.subtitle")}</p>
               
               <div className="space-y-4">
                  {[
                     { label: "Platinum", min: 5, count: (metrics as any).loyalty?.platinum || 0, color: "bg-blue-600", key: 'platinum' },
                     { label: "Gold", min: 2, count: (metrics as any).loyalty?.gold || 0, color: "bg-amber-500", key: 'gold' },
                     { label: "Silver", min: 1, count: (metrics as any).loyalty?.silver || 0, color: "bg-slate-400", key: 'silver' },
                  ].map((lvl, idx) => (
                     <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-[var(--accent)] transition-all">
                        <div className="flex items-center gap-3">
                           <div className={`w-2 h-2 rounded-full ${lvl.color}`}></div>
                           <span className="text-[12px] font-black text-[var(--primary)]">{t(`marketing.loyalty.levels.${lvl.key}`)}</span>
                        </div>
                        <div className="text-right">
                           <div className="text-[12px] font-black text-slate-700">{t("marketing.loyalty.items_count", { count: lvl.count })}</div>
                           <div className="text-[9px] font-bold text-slate-400 uppercase">{t("marketing.loyalty.visits", { count: lvl.min })}</div>
                        </div>
                     </div>
                  ))}
               </div>

               <div className="mt-8 border-t border-slate-100 pt-6">
                  <button onClick={() => setAddingPromo(true)} className="w-full py-2.5 bg-slate-900 text-white text-[11px] font-black uppercase rounded-xl hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 tracking-widest">
                     <Megaphone size={14}/> {t("marketing.new_promo_btn")}
                  </button>
               </div>
            </div>
         </div>
      </div>

      {/* Feed Add Modal */}
      {addingFeed && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-[var(--primary)] text-[15px]">{t("marketing.forms.feedback.title")}</h3>
                  <button onClick={() => setAddingFeed(false)} className="p-1.5 text-slate-400 hover:text-slate-600 bg-white rounded-md shadow-sm"><X size={16}/></button>
               </div>
               <form onSubmit={handleSubmitFeedback} className="p-5 space-y-4">
                  <div>
                     <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("marketing.forms.feedback.guest_name")}</label>
                     <input required value={form.guestName} onChange={e=>setForm({...form, guestName: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[var(--accent)] shadow-inner"/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("marketing.forms.feedback.rating")}</label>
                        <select value={form.rating} onChange={e=>setForm({...form, rating: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white cursor-pointer">
                           {[5,4,3,2,1].map(r => <option key={r} value={r}>{t("marketing.forms.feedback.rating_unit", { count: r })}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("marketing.forms.feedback.source")}</label>
                        <select value={form.source} onChange={e=>setForm({...form, source: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white cursor-pointer">
                           <option value="DIRECT">{t("marketing.forms.feedback.sources.DIRECT")}</option>
                           <option value="GOOGLE">{t("marketing.forms.feedback.sources.GOOGLE")}</option>
                           <option value="TRIPADVISOR">{t("marketing.forms.feedback.sources.TRIPADVISOR")}</option>
                        </select>
                     </div>
                  </div>
                  <div>
                     <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("marketing.forms.feedback.comment")}</label>
                     <textarea value={form.comment} onChange={e=>setForm({...form, comment: e.target.value})} rows={3} placeholder={t("marketing.forms.feedback.comment_placeholder")} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-[var(--accent)] resize-none" />
                  </div>
                  <div className="pt-2">
                     <button type="submit" className="w-full py-2.5 bg-[var(--accent)] text-white text-[13px] font-bold rounded-lg hover:bg-[var(--accent-hover)] transition-colors flex items-center justify-center gap-2">
                       <Send size={16}/> {t("marketing.forms.feedback.save")}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* Promo Add Modal */}
      {addingPromo && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-[var(--primary)] text-[15px]">{t("marketing.forms.promo.title")}</h3>
                  <button onClick={() => setAddingPromo(false)} className="p-1.5 text-slate-400 hover:text-slate-600 bg-white rounded-md shadow-sm"><X size={16}/></button>
               </div>
               <form onSubmit={handleSubmitPromo} className="p-5 space-y-4">
                  <div>
                     <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("marketing.forms.promo.name")}</label>
                     <input required value={promoForm.title} onChange={e=>setPromoForm({...promoForm, title: e.target.value})} placeholder={t("marketing.forms.promo.name_placeholder")} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[var(--accent)] shadow-inner"/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("marketing.forms.promo.code")}</label>
                        <input value={promoForm.code} onChange={e=>setPromoForm({...promoForm, code: e.target.value})} placeholder="AUTUMN20" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[var(--accent)]"/>
                     </div>
                     <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("marketing.forms.promo.discount")}</label>
                        <input value={promoForm.discount} onChange={e=>setPromoForm({...promoForm, discount: e.target.value})} placeholder="15" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[var(--accent)]"/>
                     </div>
                  </div>
                  <div>
                     <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("marketing.forms.promo.type")}</label>
                     <select value={promoForm.type} onChange={e=>setPromoForm({...promoForm, type: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white cursor-pointer">
                        <option value="SEASONAL">{t("marketing.forms.promo.types.SEASONAL")}</option>
                        <option value="EVENT">{t("marketing.forms.promo.types.EVENT")}</option>
                        <option value="LOYALTY">{t("marketing.forms.promo.types.LOYALTY")}</option>
                     </select>
                  </div>
                  <div className="pt-2">
                     <button type="submit" className="w-full py-2.5 bg-[var(--primary)] text-white text-[13px] font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                       <Send size={16}/> {t("marketing.forms.promo.submit")}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}

    </div>
  );
}
