"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus, Search, Edit2, Trash2, Eye, EyeOff,
  Compass, X, Loader2, MapPin, Clock, DollarSign, Tag,
  MoreVertical, Calendar, Info, Layers, ChevronLeft, ChevronRight,
  CheckCircle, Globe, ListChecks, Image as ImageIcon
} from "lucide-react";

type TourPackage = {
  id: string;
  title: string;
  description: string;
  destination: string;
  days: number;
  nights: number;
  price: string;
  category: string;
  imageUrl: string | null;
  highlights: string[] | null;
  status: string;
  createdAt: string;
};

type FormData = {
  title: string;
  description: string;
  destination: string;
  days: string;
  nights: string;
  price: string;
  category: string;
  imageUrl: string;
  highlights: string[];
  status: string;
};

const EMPTY_FORM: FormData = {
  title: "", description: "", destination: "",
  days: "3", nights: "2", price: "",
  category: "", imageUrl: "", highlights: [], status: "active",
};

const CATEGORIES = ["Togʻ safarlar", "Tarixiy", "Madaniy", "Ekologik", "Oilaviy", "Aktiv dam olish", "Ziyorat"];

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
  active: { label: "Aktiv", cls: "bg-emerald-50 text-emerald-600 ring-emerald-100", icon: Eye },
  inactive: { label: "Nofaol", cls: "bg-slate-100 text-slate-400 ring-slate-200", icon: EyeOff },
  draft: { label: "Qoralama", cls: "bg-amber-50 text-amber-600 ring-amber-100", icon: Info },
};

const DEFAULT_TOUR_IMAGE = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800";

function fmtMoney(v: string | number) {
  const n = Number(v);
  return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(n);
}

export default function AdminToursPage() {
  const [items, setItems] = useState<TourPackage[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<TourPackage | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState(1);
  const [highlightInput, setHighlightInput] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q, page: String(page), limit: String(limit) });
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/admin/tours?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      toast.error("Xatolik yuklashda");
    } finally {
      setLoading(false);
    }
  }, [q, page, limit, filterStatus]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
  }, [q, page, filterStatus, load]);

  function openCreate() {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setActiveTab(1);
    setShowModal(true);
  }

  function openEdit(tour: TourPackage) {
    setEditItem(tour);
    setForm({
      title: tour.title,
      description: tour.description,
      destination: tour.destination,
      days: String(tour.days),
      nights: String(tour.nights),
      price: String(tour.price),
      category: tour.category,
      imageUrl: tour.imageUrl ?? "",
      highlights: Array.isArray(tour.highlights) ? tour.highlights : [],
      status: tour.status,
    });
    setActiveTab(1);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.title || !form.price || !form.destination || !form.category) {
      toast.error("Majburiy maydonlarni to'ldiring");
      setActiveTab(1);
      return;
    }
    setSaving(true);
    try {
      const url = editItem ? `/api/admin/tours/${editItem.id}` : "/api/admin/tours";
      const method = editItem ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          days: Number(form.days),
          nights: Number(form.nights),
          price: Number(form.price),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(editItem ? "Tur yangilandi!" : "Yangi tur yaratildi!");
      setShowModal(false);
      void load();
    } catch (e) {
      toast.error("Xatolik saqlashda");
    } finally {
      setSaving(false);
    }
  }

  function addHighlight() {
    if (!highlightInput.trim()) return;
    setForm({ ...form, highlights: [...form.highlights, highlightInput.trim()] });
    setHighlightInput("");
  }

  function removeHighlight(index: number) {
    setForm({ ...form, highlights: form.highlights.filter((_, i) => i !== index) });
  }

  const steps = [
    { id: 1, label: "Umumiy", icon: Globe },
    { id: 2, label: "Kontent", icon: ListChecks },
    { id: 3, label: "Media", icon: ImageIcon },
  ];

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tur Paketlar</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">Jami {total} ta tur paketi mavjud</p>
        </div>
        <button className="adm-btn adm-btn-primary shadow-lg shadow-slate-900/20" onClick={openCreate}>
          <Plus size={16} />
          Yangi Tur Qo&apos;shish
        </button>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 p-6 bg-white overflow-visible">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Tur nomi, joylashuvi yoki kategoriyasi bo'yicha..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
            />
          </div>
          <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner">
            {["all", "active", "draft"].map((st) => (
              <button 
                key={st}
                onClick={() => { setFilterStatus(st); setPage(1); }}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${filterStatus === st ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              >
                {st === "all" ? "Barchasi" : st === "active" ? "Aktiv" : "Draft"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="w-12"></th>
                <th>Safar Nomi</th>
                <th>Kategoriya</th>
                <th>Muddati</th>
                <th>Narxi</th>
                <th>Status</th>
                <th className="pr-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="py-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-slate-300" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="py-20 text-center text-slate-400"><p className="font-black">Turlar topilmadi</p></td></tr>
              ) : (
                items.map((tour) => {
                  const S = STATUS_CONFIG[tour.status] || STATUS_CONFIG.inactive;
                  return (
                    <tr key={tour.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-6 pl-8">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 shadow-sm">
                          <img 
                            src={tour.imageUrl || DEFAULT_TOUR_IMAGE} 
                            alt={tour.title} 
                            className="w-full h-full object-cover" 
                            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_TOUR_IMAGE; }}
                          />
                        </div>
                      </td>
                      <td className="py-6">
                        <div className="text-sm font-black text-slate-900 leading-tight mb-1">{tour.title}</div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><MapPin size={10} />{tour.destination}</div>
                      </td>
                      <td className="py-6"><span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-600 rounded-lg text-[10px] font-black uppercase tracking-wider">{tour.category}</span></td>
                      <td className="py-6 text-xs font-black text-slate-500">{tour.days}k / {tour.nights}t</td>
                      <td className="py-6 text-sm font-black text-slate-900">{fmtMoney(tour.price)}</td>
                      <td className="py-6"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ring-1 ${S.cls}`}>{S.label}</span></td>
                      <td className="py-6 pr-8 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <button className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all" onClick={() => openEdit(tour)}><Edit2 size={16} /></button>
                          <button className="p-2.5 rounded-xl bg-rose-50 text-rose-400 hover:bg-rose-600 hover:text-white transition-all" onClick={() => { if(confirm("O'chirilsinmi?")) void fetch(`/api/admin/tours/${tour.id}`, {method: 'DELETE'}).then(() => load()); }}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-6 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-400">Jami {total} tadan {(page - 1) * limit + 1} - {Math.min(page * limit, total)} ko&apos;rsatildi</div>
            <div className="flex items-center gap-1">
               {Array.from({ length: totalPages }).map((_, i) => (
                 <button key={i} onClick={() => setPage(i + 1)} className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${page === i + 1 ? "bg-slate-900 text-white shadow-lg" : "bg-white border border-slate-200 text-slate-400"}`}>{i + 1}</button>
               ))}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="adm-modal-overlay">
          <div className="adm-modal max-w-3xl border-none shadow-2xl overflow-hidden flex flex-col" style={{maxHeight: '90dvh'}}>
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-50 bg-white flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/10"><Compass size={22} /></div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">{editItem ? "Turni Tahrirlash" : "Yangi Tur Qo'shish"}</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">SafarTrip Professional Wizard</p>
                </div>
              </div>
              <button 
                className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                onClick={() => setShowModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100 overflow-x-auto">
               <div className="flex items-center justify-center min-w-max gap-8 px-4">
                  {steps.map((s, idx) => (
                    <div key={s.id} className="flex items-center gap-3">
                       <button 
                         onClick={() => setActiveTab(s.id)}
                         className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${activeTab === s.id ? "bg-white text-slate-900 shadow-md ring-1 ring-slate-200" : "text-slate-400 hover:text-slate-600"}`}
                       >
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${activeTab === s.id ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"}`}>{s.id}</div>
                          <span className="text-xs font-black uppercase tracking-wider whitespace-nowrap">{s.label}</span>
                       </button>
                       {idx < steps.length - 1 && <div className="h-px w-8 bg-slate-200" />}
                    </div>
                  ))}
               </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-8 overflow-y-auto space-y-8">
               {activeTab === 1 && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="space-y-6">
                       <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Safar Sarlavhasi *</label>
                          <input 
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                            placeholder="Masalan: Zominning go'zal tabiati boyicha sayohat"
                            value={form.title}
                            onChange={(e) => setForm({...form, title: e.target.value})}
                          />
                       </div>
                       <div className="grid grid-cols-2 gap-4 text-slate-900">
                          <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Kun</label>
                             <input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all text-slate-900" value={form.days} onChange={(e) => setForm({...form, days: e.target.value})} />
                          </div>
                          <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Tun</label>
                             <input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all text-slate-900" value={form.nights} onChange={(e) => setForm({...form, nights: e.target.value})} />
                          </div>
                       </div>
                    </div>
                    <div className="space-y-6">
                       <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Kategoriya *</label>
                          <select 
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                            value={form.category}
                            onChange={(e) => setForm({...form, category: e.target.value})}
                          >
                             <option value="">Tanlang...</option>
                             {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                       </div>
                       <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Narxi (UZS) *</label>
                          <div className="relative">
                             <input 
                               type="number" 
                               className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-5 pr-14 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                               placeholder="1 200 000"
                               value={form.price}
                               onChange={(e) => setForm({...form, price: e.target.value})}
                             />
                             <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">Sum</span>
                          </div>
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === 2 && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Batafsil Tavsif *</label>
                       <textarea 
                         rows={5}
                         className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                         placeholder="Tur haqida batafsil ma'lumot kiriting..."
                         value={form.description}
                         onChange={(e) => setForm({...form, description: e.target.value})}
                       />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Qulayliklar (Highlights)</label>
                       <div className="flex gap-4 mb-4">
                          <input 
                             className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                             placeholder="Masalan: Transport xizmati"
                             value={highlightInput}
                             onChange={(e) => setHighlightInput(e.target.value)}
                             onKeyDown={(e) => e.key === 'Enter' && addHighlight()}
                          />
                          <button 
                            className="bg-slate-900 text-white rounded-2xl px-6 py-3 text-xs font-black shadow-lg shadow-slate-900/10 active:scale-95 transition-all"
                            onClick={addHighlight}
                          >Qo&apos;shish</button>
                       </div>
                       <div className="flex flex-wrap gap-2">
                          {form.highlights.map((h, i) => (
                            <div key={i} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-900 rounded-xl text-xs font-bold border border-slate-200 animate-in zoom-in-95">
                               {h}
                               <button onClick={() => removeHighlight(i)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={14} /></button>
                            </div>
                          ))}
                          {form.highlights.length === 0 && <p className="text-xs font-bold text-slate-400 italic px-1">Hali hech qanday qulaylik qo&apos;shilmadi.</p>}
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === 3 && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Safar Manzili *</label>
                          <div className="relative">
                             <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                             <input 
                               className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                               placeholder="Masalan: Zomin tumani, Jizzax viloyati"
                               value={form.destination}
                               onChange={(e) => setForm({...form, destination: e.target.value})}
                             />
                          </div>
                       </div>
                       <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Status</label>
                          <select 
                            className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 focus:outline-none"
                            value={form.status}
                            onChange={(e) => setForm({...form, status: e.target.value})}
                          >
                             <option value="active">Aktiv (Saytda ko&apos;rinadi)</option>
                             <option value="draft">Draft (Faqat adminda)</option>
                             <option value="inactive">Nofaol</option>
                          </select>
                       </div>
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Asosiy Rasm URL</label>
                       <div className="flex flex-col md:flex-row gap-6 items-start">
                          <input 
                            className="flex-1 w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                            placeholder="https://images.unsplash.com/..."
                            value={form.imageUrl}
                            onChange={(e) => setForm({...form, imageUrl: e.target.value})}
                          />
                          <div className="w-full md:w-56 aspect-[16/10] bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-inner relative group">
                             <img 
                               src={form.imageUrl || DEFAULT_TOUR_IMAGE} 
                               alt="Preview" 
                               className="w-full h-full object-cover"
                               onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_TOUR_IMAGE; }}
                             />
                             {!form.imageUrl && <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">Standard Rasm</div>}
                          </div>
                       </div>
                    </div>
                 </div>
               )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-50 flex items-center justify-between sticky bottom-0 z-10">
               <div className="flex items-center gap-2">
                  <button 
                    className={`p-3 rounded-2xl border border-slate-200 bg-white text-slate-400 hover:text-slate-900 transition-all ${activeTab === 1 ? "opacity-0 invisible" : ""}`}
                    onClick={() => setActiveTab(t => t - 1)}
                  >
                     <ChevronLeft size={20} />
                  </button>
               </div>
               <div className="flex items-center gap-3">
                  <button className="px-8 py-3.5 rounded-2xl text-xs font-black text-slate-400 hover:text-slate-900 transition-all" onClick={() => setShowModal(false)}>Chiqish</button>
                  {activeTab < 3 ? (
                    <button 
                      className="adm-btn adm-btn-primary px-10 py-3.5 shadow-xl shadow-slate-900/10 flex items-center gap-3"
                      onClick={() => setActiveTab(t => t + 1)}
                    >
                      Keyingisi
                      <ChevronRight size={18} />
                    </button>
                  ) : (
                    <button 
                      className="adm-btn adm-btn-primary px-10 py-3.5 shadow-xl shadow-slate-900/10 flex items-center gap-3"
                      disabled={saving}
                      onClick={() => void handleSave()}
                    >
                      {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                      {editItem ? "O'zgarishlarni Saqlash" : "Turni Yaratish"}
                    </button>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
