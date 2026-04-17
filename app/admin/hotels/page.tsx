"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { 
  Building2, Filter, Loader2, BedDouble, Users, MapPin, 
  MoreVertical, TrendingUp, CheckCircle, AlertCircle, 
  Calendar, Plus, Search, X, ChevronLeft, ChevronRight,
  Mail, Phone, Globe, Shield, Trash2, Edit2
} from "lucide-react";

type Hotel = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: string;
  totalRooms: number;
  createdAt: string;
  partner: {
    id: string;
    user: { first_name: string; last_name: string; email: string };
    displayName: string | null;
  };
  _count: { bookings: number; rooms: number };
};

type PartnerOption = {
  id: string;
  displayName: string | null;
  user: { first_name: string; last_name: string; email: string };
};

type FormData = {
  partnerId: string;
  name: string;
  city: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  totalRooms: string;
  status: string;
};

const EMPTY_FORM: FormData = {
  partnerId: "", name: "", city: "", address: "", 
  contactEmail: "", contactPhone: "", totalRooms: "10", status: "draft"
};

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
  active: { label: "Aktiv", cls: "bg-emerald-50 text-emerald-600 ring-emerald-100", icon: CheckCircle },
  draft: { label: "Qoralama", cls: "bg-amber-50 text-amber-600 ring-amber-100", icon: Calendar },
  suspended: { label: "To'xtatilgan", cls: "bg-rose-50 text-rose-600 ring-rose-100", icon: AlertCircle },
};

export default function AdminHotelsPage() {
  const [items, setItems] = useState<Hotel[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Hotel | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [activeStep, setActiveStep] = useState(1);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        page: String(page), 
        limit: String(limit),
        q: q
      });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/hotels?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      toast.error("Xatolik yuklashda");
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, page, limit]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
  }, [q, statusFilter, page, load]);

  async function fetchEligiblePartners() {
    try {
      const res = await fetch("/api/admin/partners/eligible-hotels");
      const data = await res.json();
      setPartners(data.items || []);
    } catch (e) {
      toast.error("Hamkorlarni yuklab bo'lmadi");
    }
  }

  function openCreate() {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setActiveStep(1);
    void fetchEligiblePartners();
    setShowModal(true);
  }

  function openEdit(hotel: Hotel) {
    setEditItem(hotel);
    setForm({
      partnerId: hotel.partner.id,
      name: hotel.name,
      city: hotel.city ?? "",
      address: hotel.address ?? "",
      contactEmail: hotel.contactEmail ?? "",
      contactPhone: hotel.contactPhone ?? "",
      totalRooms: String(hotel.totalRooms),
      status: hotel.status
    });
    setActiveStep(1);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.city || (!editItem && !form.partnerId)) {
      toast.error("Majburiy maydonlarni to'ldiring");
      setActiveStep(1);
      return;
    }
    setSaving(true);
    try {
      const url = editItem ? `/api/admin/hotels/${editItem.id}` : "/api/admin/hotels";
      const method = editItem ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          totalRooms: Number(form.totalRooms)
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(editItem ? "Mehmonxona yangilandi!" : "Yangi mehmonxona yaratildi!");
      setShowModal(false);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik saqlashda");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("O'chirib tashlamoqchimisiz?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/hotels/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("O'chirib bo'lmadi");
      toast.success("O'chirildi");
      void load();
    } catch (e) {
      toast.error("Xatolik");
    } finally {
      setDeletingId(null);
    }
  }

  const steps = [
    { id: 1, label: "Umumiy", icon: Shield },
    { id: 2, label: "Manzil", icon: MapPin },
    { id: 3, label: "Sozlamalar", icon: Building2 },
  ];

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mehmonxonalar</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">Jami {total} ta mehmonxona mavjud</p>
        </div>
        <button className="adm-btn adm-btn-primary shadow-lg shadow-slate-900/20" onClick={openCreate}>
           <Plus size={16} />
           Yangi Qo&apos;shish
        </button>
      </div>

      {/* Stats Summary */}
      <div className="adm-kpi-grid">
        <div className="adm-kpi-card">
          <div className="adm-kpi-icon teal"><Shield size={28} /></div>
          <div className="adm-kpi-content">
             <div className="adm-kpi-label">Aktiv Hotellar</div>
             <div className="adm-kpi-value">{items.filter(h => h.status === 'active').length} ta</div>
          </div>
        </div>
        <div className="adm-kpi-card">
          <div className="adm-kpi-icon blue"><BedDouble size={28} /></div>
          <div className="adm-kpi-content">
             <div className="adm-kpi-label">Jami Xonalar</div>
             <div className="adm-kpi-value">{items.reduce((acc, h) => acc + h.totalRooms, 0)}</div>
          </div>
        </div>
        <div className="adm-kpi-card">
          <div className="adm-kpi-icon orange"><TrendingUp size={28} /></div>
          <div className="adm-kpi-content">
             <div className="adm-kpi-label">Amaldagi Bronlar</div>
             <div className="adm-kpi-value">{items.reduce((acc, h) => acc + h._count.bookings, 0)}</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="adm-card border-none shadow-xl shadow-slate-200/50 p-6 bg-white overflow-visible">
        <div className="flex flex-col xl:flex-row gap-4 items-center">
           <div className="relative flex-1 w-full">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input 
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-slate-900/5"
                placeholder="Mehmonxona nomi yoki shahri bo'yicha qidirish..."
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
              />
           </div>
           <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner min-w-max">
              {["", "active", "draft", "suspended"].map((st) => (
                <button 
                  key={st}
                  onClick={() => { setStatusFilter(st); setPage(1); }}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${statusFilter === st ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                >
                  {st === "" ? "Barchasi" : st === "active" ? "Aktiv" : st === "draft" ? "Draft" : "To'xtatilgan"}
                </button>
              ))}
           </div>
        </div>
      </div>

      {/* Table */}
      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Mehmonxona</th>
                <th>Hamkor</th>
                <th>Kontakt</th>
                <th>Statistika</th>
                <th>Holati</th>
                <th className="pr-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-slate-300" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-bold">Hech narsa topilmadi</td></tr>
              ) : (
                items.map((h) => {
                  const S = STATUS_CONFIG[h.status] || STATUS_CONFIG.suspended;
                  return (
                    <tr key={h.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-6 pl-8">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/10">
                               <Building2 size={24} />
                            </div>
                            <div>
                               <div className="text-sm font-black text-slate-900">{h.name}</div>
                               <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                  <MapPin size={10} className="text-slate-300" />
                                  {h.city}, {h.address || "Manzil kiritilmagan"}
                               </div>
                            </div>
                         </div>
                      </td>
                      <td className="py-6">
                         <div className="text-sm font-black text-slate-900">{h.partner.user.first_name} {h.partner.user.last_name}</div>
                         <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{h.partner.displayName || "Hamkor"}</div>
                      </td>
                      <td className="py-6">
                         <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                               <Mail size={10} /> {h.contactEmail || "—"}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                               <Phone size={10} /> {h.contactPhone || "—"}
                            </div>
                         </div>
                      </td>
                      <td className="py-6">
                        <div className="flex items-center gap-4">
                           <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-300 uppercase">Xonalar</span>
                              <span className="text-xs font-black text-slate-600">{h.totalRooms}</span>
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-300 uppercase">Bron</span>
                              <span className="text-xs font-black text-slate-600">{h._count.bookings}</span>
                           </div>
                        </div>
                      </td>
                      <td className="py-6">
                         <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ring-1 shadow-sm ${S.cls}`}>
                            <S.icon size={10} /> {S.label}
                         </div>
                      </td>
                      <td className="py-6 pr-8 text-right">
                         <div className="flex items-center gap-2 justify-end">
                            <button className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm" onClick={() => openEdit(h)}><Edit2 size={16} /></button>
                            <button 
                              className="p-2.5 rounded-xl bg-rose-50 text-rose-400 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                              onClick={() => handleDelete(h.id)}
                              disabled={deletingId === h.id}
                            >
                               {deletingId === h.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
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
           <div className="p-6 border-t border-slate-50 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-bold text-slate-400">Jami {total} tadan {(page-1)*limit+1}-{Math.min(page*limit, total)} ko&apos;rsatilmoqda</span>
              <div className="flex items-center gap-1">
                 {Array.from({length: totalPages}).map((_, i) => (
                   <button key={i} onClick={() => setPage(i+1)} className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${page === i+1 ? "bg-slate-900 text-white shadow-lg" : "bg-white border border-slate-200 text-slate-400 hover:bg-slate-50"}`}>{i+1}</button>
                 ))}
              </div>
           </div>
        )}
      </div>

      {/* Professional Wizard Modal */}
      {showModal && (
        <div className="adm-modal-overlay">
          <div className="adm-modal max-w-2xl border-none shadow-2xl overflow-hidden flex flex-col" style={{maxHeight: '90dvh'}}>
             {/* Header */}
             <div className="px-8 py-6 border-b border-slate-50 bg-white flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                   <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/10"><Building2 size={22} /></div>
                   <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">{editItem ? "Tahrirlash" : "Yangi Mehmonxona"}</h2>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">SafarTrip Hotel Wizard</p>
                   </div>
                </div>
                <button className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm" onClick={() => setShowModal(false)}><X size={20} /></button>
             </div>

             {/* Steps */}
             <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-center gap-6 overflow-x-auto">
                {steps.map((s, idx) => (
                  <div key={s.id} className="flex items-center gap-3">
                     <button 
                       onClick={() => setActiveStep(s.id)}
                       className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${activeStep === s.id ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-100" : "text-slate-400"}`}
                     >
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black ${activeStep === s.id ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"}`}>{s.id}</div>
                        <span className="text-[10px] font-black uppercase tracking-wider">{s.label}</span>
                     </button>
                     {idx < steps.length - 1 && <div className="h-px w-6 bg-slate-200" />}
                  </div>
                ))}
             </div>

             {/* Body */}
             <div className="flex-1 p-8 overflow-y-auto space-y-6">
                {activeStep === 1 && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                     {!editItem && (
                       <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Hamkorni Tanlang *</label>
                          <select 
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-slate-900/5 appearance-none"
                            value={form.partnerId}
                            onChange={(e) => setForm({...form, partnerId: e.target.value})}
                          >
                             <option value="">Hamkorlar ro&apos;yxati...</option>
                             {partners.map(p => (
                               <option key={p.id} value={p.id}>{p.user.first_name} {p.user.last_name} ({p.user.email})</option>
                             ))}
                          </select>
                       </div>
                     )}
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Mehmonxona Nomi *</label>
                        <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Masalan: Grand Hotel Zomin" />
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Shahar *</label>
                        <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all" value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} placeholder="Masalan: Zomin" />
                     </div>
                  </div>
                )}

                {activeStep === 2 && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">To&apos;liq Manzil</label>
                        <textarea className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all" rows={2} value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} placeholder="Ko&apos;cha, uy raqami, mo&apos;ljal..." />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Kontakt Email</label>
                           <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all" value={form.contactEmail} onChange={(e) => setForm({...form, contactEmail: e.target.value})} placeholder="hotel@gmail.com" />
                        </div>
                        <div>
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Kontakt Telefon</label>
                           <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all" value={form.contactPhone} onChange={(e) => setForm({...form, contactPhone: e.target.value})} placeholder="+998 90 123 45 67" />
                        </div>
                     </div>
                  </div>
                )}

                {activeStep === 3 && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Jami Xonalar Soni</label>
                        <input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all" value={form.totalRooms} onChange={(e) => setForm({...form, totalRooms: e.target.value})} />
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Status</label>
                        <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 appearance-none" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                           <option value="active">Aktiv (Sotuvga tayyor)</option>
                           <option value="draft">Qoralama (Hali tayyor emas)</option>
                           <option value="suspended">To&apos;xtatilgan</option>
                        </select>
                     </div>
                  </div>
                )}
             </div>

             {/* Footer */}
             <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between sticky bottom-0 z-10">
                <button 
                   className={`p-3 rounded-2xl border border-slate-200 bg-white text-slate-400 hover:text-slate-900 transition-all ${activeStep === 1 ? "opacity-0 invisible" : ""}`}
                   onClick={() => setActiveStep(s => s - 1)}
                >
                   <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-3">
                   <button className="px-6 py-3 rounded-2xl text-xs font-black text-slate-400 hover:text-slate-900 transition-all" onClick={() => setShowModal(false)}>Chiqish</button>
                   {activeStep < 3 ? (
                      <button className="adm-btn adm-btn-primary px-8 py-3.5 shadow-xl shadow-slate-900/10 flex items-center gap-3" onClick={() => setActiveStep(s => s + 1)}>Keyingisi <ChevronRight size={18} /></button>
                   ) : (
                      <button 
                        className="adm-btn adm-btn-primary px-8 py-3.5 shadow-xl shadow-slate-900/10 flex items-center gap-3 disabled:opacity-50" 
                        onClick={() => void handleSave()}
                        disabled={saving}
                      >
                         {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                         {editItem ? "Saqlash" : "Yaratish"}
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
