"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { 
  Users, UserPlus, Search, Filter, Loader2, ShieldCheck, 
  CheckCircle, XCircle, Clock, MapPin, Mail, Phone, 
  MoreVertical, Calendar, Info, Globe, ChevronLeft, ChevronRight,
  User, Briefcase, Building2, Compass, Trash2, Edit2, X, Lock,
  Fingerprint, KeyRound, UserRound, Smartphone
} from "lucide-react";

type Partner = {
  id: string;
  type: string;
  status: string;
  displayName: string | null;
  bio: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    phone: string;
    first_name: string;
    last_name: string;
    role: string;
  };
};

type UserOption = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
};

type FormData = {
  userId: string;
  type: string;
  displayName: string;
  bio: string;
  contactEmail: string;
  contactPhone: string;
  status: string;
  // New User Fields
  isNewUser: boolean;
  newUser: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
  }
};

const EMPTY_FORM: FormData = {
  userId: "", type: "agency", displayName: "", bio: "", 
  contactEmail: "", contactPhone: "", status: "approved",
  isNewUser: false,
  newUser: { first_name: "", last_name: "", email: "", phone: "", password: "" }
};

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
  approved: { label: "Aktiv", cls: "bg-emerald-50 text-emerald-600 ring-emerald-100", icon: CheckCircle },
  pending: { label: "Kutilmoqda", cls: "bg-amber-50 text-amber-600 ring-amber-100", icon: Clock },
  rejected: { label: "Rad etilgan", cls: "bg-rose-50 text-rose-600 ring-rose-100", icon: XCircle },
};

const TYPE_CONFIG: Record<string, { label: string; icon: any; cls: string }> = {
  agency: { label: "Agentlik", icon: Briefcase, cls: "bg-blue-50 text-blue-600" },
  hotel: { label: "Mehmonxona", icon: Building2, cls: "bg-teal-50 text-teal-600" },
  guide: { label: "Gid", icon: Compass, cls: "bg-purple-50 text-purple-600" },
};

export default function AdminPartnersPage() {
  const [items, setItems] = useState<Partner[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Partner | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [activeStep, setActiveStep] = useState(1);
  const [eligibleUsers, setEligibleUsers] = useState<UserOption[]>([]);
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
      const res = await fetch(`/api/admin/partners?${params}`, { credentials: "same-origin" });
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

  async function fetchEligibleUsers() {
    try {
      const res = await fetch("/api/admin/users/eligible-partners", { credentials: "same-origin" });
      const data = await res.json();
      setEligibleUsers(data.items || []);
    } catch (e) {
      toast.error("Foydalanuvchilarni yuklab bo'lmadi");
    }
  }

  function openCreate() {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setActiveStep(1);
    void fetchEligibleUsers();
    setShowModal(true);
  }

  function openEdit(partner: Partner) {
    setEditItem(partner);
    setForm({
      ...EMPTY_FORM,
      userId: partner.user.id,
      type: partner.type,
      displayName: partner.displayName ?? "",
      bio: partner.bio ?? "",
      contactEmail: partner.contactEmail ?? "",
      contactPhone: partner.contactPhone ?? "",
      status: partner.status,
      isNewUser: false
    });
    setActiveStep(1);
    setShowModal(true);
  }

  async function handleSave() {
    // Basic validation
    if (form.isNewUser) {
      if (!form.newUser.email || !form.newUser.first_name || !form.newUser.password) {
        toast.error("Yangi foydalanuvchi ma'lumotlarini to'ldiring");
        setActiveStep(1);
        return;
      }
    } else if (!editItem && !form.userId) {
      toast.error("Foydalanuvchini tanlang");
      setActiveStep(1);
      return;
    }

    setSaving(true);
    try {
      const url = editItem ? `/api/admin/partners/${editItem.id}` : "/api/admin/partners";
      const method = editItem ? "PATCH" : "POST";
      
      const payload: any = { ...form };
      if (!form.isNewUser) delete payload.newUser;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "same-origin"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(editItem ? "Hamkor yangilandi!" : "Yangi hamkor va account yaratildi!");
      setShowModal(false);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik saqlashda");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hamkorlikni bekor qilmoqchimisiz?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/partners/${id}`, { 
        method: "DELETE",
        credentials: "same-origin"
      });
      if (!res.ok) throw new Error("O'chirib bo'lmadi");
      toast.success("Muvaffaqiyatli o'chirildi");
      void load();
    } catch (e) {
      toast.error("Xatolik");
    } finally {
      setDeletingId(null);
    }
  }

  const steps = [
    { id: 1, label: "Foydalanuvchi", icon: User },
    { id: 2, label: "Hamkor Turi", icon: Briefcase },
    { id: 3, label: "Profil", icon: ShieldCheck },
  ];

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hamkorlar Boshqaruvi</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">SafarTrip hamkorlari: Agentliklar, Mehmonxonalar va Gidlar</p>
        </div>
        <button className="adm-btn adm-btn-primary shadow-lg shadow-slate-900/20" onClick={openCreate}>
           <UserPlus size={16} />
           Yangi Hamkor
        </button>
      </div>

      {/* Stats Summary */}
      <div className="adm-kpi-grid">
         <div className="adm-kpi-card">
            <div className="adm-kpi-icon teal"><Briefcase size={28} /></div>
            <div className="adm-kpi-content">
               <div className="adm-kpi-label">Agentliklar</div>
               <div className="adm-kpi-value">{items.filter(i => i.type === 'agency').length} ta</div>
            </div>
         </div>
         <div className="adm-kpi-card">
            <div className="adm-kpi-icon blue"><Building2 size={28} /></div>
            <div className="adm-kpi-content">
               <div className="adm-kpi-label">Hotellar</div>
               <div className="adm-kpi-value">{items.filter(i => i.type === 'hotel').length} ta</div>
            </div>
         </div>
         <div className="adm-kpi-card">
            <div className="adm-kpi-icon orange"><Compass size={28} /></div>
            <div className="adm-kpi-content">
               <div className="adm-kpi-label">Gidlar</div>
               <div className="adm-kpi-value">{items.filter(i => i.type === 'guide').length} ta</div>
            </div>
         </div>
      </div>

      {/* Toolbar */}
      <div className="adm-card border-none shadow-xl shadow-slate-200/50 p-6 bg-white overflow-visible">
        <div className="flex flex-col xl:flex-row gap-4 items-center">
           <div className="relative flex-1 w-full">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input 
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all focus:bg-white"
                placeholder="Hamkor nomi, email yoki telefon bo'yicha..."
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
              />
           </div>
           <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner min-w-max">
              {["", "approved", "pending", "rejected"].map((st) => (
                <button 
                  key={st}
                  onClick={() => { setStatusFilter(st); setPage(1); }}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${statusFilter === st ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                >
                  {st === "" ? "Barchasi" : st === "approved" ? "Aktiv" : st === "pending" ? "Kutmoqda" : "Rad"}
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
                     <th className="pl-8">Hamkor</th>
                     <th>Account</th>
                     <th>Turi / Roli</th>
                     <th>Kontakt Ma&apos;lumot</th>
                     <th>Status</th>
                     <th className="pr-8 text-right">Amallar</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={6} className="py-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-slate-300" /></td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-bold">Hamkorlar topilmadi</td></tr>
                  ) : (
                    items.map((i) => {
                       const S = STATUS_CONFIG[i.status] || STATUS_CONFIG.rejected;
                       const T = TYPE_CONFIG[i.type] || TYPE_CONFIG.agency;
                       return (
                         <tr key={i.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="py-6 pl-8">
                               <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${T.cls}`}>
                                     <T.icon size={22} />
                                  </div>
                                  <div>
                                     <div className="text-sm font-black text-slate-900">{i.displayName || i.user.first_name + " " + i.user.last_name}</div>
                                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic line-clamp-1">{i.bio || "Tavsif yo'q"}</div>
                                  </div>
                               </div>
                            </td>
                            <td className="py-6">
                               <div className="text-sm font-black text-slate-900">{i.user.first_name} {i.user.last_name}</div>
                               <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{i.user.role}</div>
                            </td>
                            <td className="py-6">
                               <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${T.cls}`}>{T.label}</span>
                            </td>
                            <td className="py-6">
                               <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Mail size={12} className="text-slate-300" /> {i.contactEmail || i.user.email}</div>
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Phone size={12} className="text-slate-300" /> {i.contactPhone || i.user.phone}</div>
                               </div>
                            </td>
                            <td className="py-6">
                               <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ring-1 shadow-sm ${S.cls}`}>
                                  <S.icon size={10} /> {S.label}
                               </div>
                            </td>
                            <td className="py-6 pr-8 text-right">
                               <div className="flex items-center gap-2 justify-end">
                                  <button className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm" onClick={() => openEdit(i)}><Edit2 size={16} /></button>
                                  <button 
                                    className="p-2.5 rounded-xl bg-rose-50 text-rose-400 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                    onClick={() => handleDelete(i.id)}
                                    disabled={deletingId === i.id}
                                  >
                                     {deletingId === i.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
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
                    <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/10"><Fingerprint size={22} /></div>
                    <div>
                       <h2 className="text-xl font-black text-slate-900 tracking-tight">{editItem ? "Tahrirlash" : "Yangi Hamkor va Account"}</h2>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Account + Partner Profile</p>
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
              <div className="flex-1 p-8 overflow-y-auto space-y-6 scrollbar-thin">
                 {activeStep === 1 && (
                   <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                      {!editItem ? (
                        <div className="space-y-6">
                           <div className="flex p-1 bg-slate-100 rounded-2xl shadow-inner">
                              <button 
                                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!form.isNewUser ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                                onClick={() => setForm({...form, isNewUser: false})}
                              >
                                Mavjud Account
                              </button>
                              <button 
                                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${form.isNewUser ? "bg-white text-slate-900 shadow-sm text-emerald-600" : "text-slate-400 hover:text-slate-600"}`}
                                onClick={() => setForm({...form, isNewUser: true})}
                              >
                                Yangi Account yaratish
                              </button>
                           </div>

                           {!form.isNewUser ? (
                              <div className="animate-in zoom-in-95 duration-200">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1 flex items-center gap-2"><UserRound size={12} /> Foydalanuvchini Tanlang *</label>
                                <select 
                                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-slate-900/5 appearance-none"
                                  value={form.userId}
                                  onChange={(e) => setForm({...form, userId: e.target.value})}
                                >
                                   <option value="">Foydalanuvchilar ro&apos;yxati...</option>
                                   {eligibleUsers.map(u => (
                                     <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</option>
                                   ))}
                                </select>
                                <p className="text-[10px] font-bold text-slate-400 mt-2 px-1">Tizimda allaqachon accounti bor foydalanuvchini tanlang</p>
                              </div>
                           ) : (
                              <div className="animate-in zoom-in-95 duration-200 space-y-4">
                                 <div className="grid grid-cols-2 gap-4">
                                    <div>
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Ism *</label>
                                       <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-slate-900/5" placeholder="Masalan: Aziz" value={form.newUser.first_name} onChange={(e) => setForm({...form, newUser: {...form.newUser, first_name: e.target.value}})} />
                                    </div>
                                    <div>
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Familiya</label>
                                       <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-slate-900/5" placeholder="Masalan: Karim" value={form.newUser.last_name} onChange={(e) => setForm({...form, newUser: {...form.newUser, last_name: e.target.value}})} />
                                    </div>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div>
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Email *</label>
                                       <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-slate-900/5" type="email" placeholder="example@gmail.com" value={form.newUser.email} onChange={(e) => setForm({...form, newUser: {...form.newUser, email: e.target.value}})} />
                                    </div>
                                    <div>
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Telefon</label>
                                       <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-slate-900/5" placeholder="+998 9x xxx xx xx" value={form.newUser.phone} onChange={(e) => setForm({...form, newUser: {...form.newUser, phone: e.target.value}})} />
                                    </div>
                                 </div>
                                 <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1 flex items-center gap-2"><Lock size={12} /> Parol *</label>
                                    <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-slate-900/5" type="password" placeholder="••••••••" value={form.newUser.password} onChange={(e) => setForm({...form, newUser: {...form.newUser, password: e.target.value}})} />
                                    <p className="text-[10px] font-bold text-slate-400 mt-2 px-1">Foydalanuvchi tizimga kirish uchun ushbu paroldan foydalanadi</p>
                                 </div>
                              </div>
                           )}
                        </div>
                      ) : (
                        <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-6 animate-in zoom-in-95 duration-300">
                           <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-slate-900/20">{editItem.user.first_name[0]}{editItem.user.last_name[0]}</div>
                           <div className="flex-1">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">Hamkorlik Egasi Accounti <ShieldCheck size={12} className="text-emerald-500" /></div>
                              <div className="text-2xl font-black text-slate-900">{editItem.user.first_name} {editItem.user.last_name}</div>
                              <div className="flex items-center gap-4 mt-1">
                                 <div className="text-sm font-bold text-slate-400 flex items-center gap-1.5"><Mail size={12} /> {editItem.user.email}</div>
                                 <div className="text-sm font-bold text-slate-400 flex items-center gap-1.5"><Phone size={12} /> {editItem.user.phone}</div>
                              </div>
                           </div>
                        </div>
                      )}
                   </div>
                 )}

                 {activeStep === 2 && (
                   <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Hamkorlik Turi *</label>
                            <select 
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-slate-900/5 appearance-none"
                              value={form.type}
                              onChange={(e) => setForm({...form, type: e.target.value})}
                            >
                               <option value="agency">Sayyohlik Agentligi (User)</option>
                               <option value="hotel">Mehmonxona (Hotel Manager)</option>
                               <option value="guide">Gid (Guide)</option>
                               <option value="taxi">Taksi xizmati (Taxi)</option>
                               <option value="restaurant">Restoran (Manager)</option>
                            </select>
                            <p className="text-[10px] font-bold text-slate-400 mt-2 px-1">Танланган турга қараб Account роли автоматик ўзгаради</p>
                         </div>
                         <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Brend / Tashkilot Nomi</label>
                            <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all" value={form.displayName} onChange={(e) => setForm({...form, displayName: e.target.value})} placeholder="Masalan: SafarTrip Adventure" />
                         </div>
                      </div>
                      <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Status</label>
                         <div className="grid grid-cols-3 gap-3">
                            {["approved", "pending", "rejected"].map(st => (
                               <button 
                                 key={st}
                                 onClick={() => setForm({...form, status: st})}
                                 className={`py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all border ${form.status === st ? "bg-slate-900 text-white border-slate-900 shadow-lg" : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100"}`}
                               >
                                  {st === "approved" ? "Aktiv" : st === "pending" ? "Kutmoqda" : "Rad etilgan"}
                               </button>
                            ))}
                         </div>
                      </div>
                   </div>
                 )}

                 {activeStep === 3 && (
                   <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Biznes Email</label>
                            <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-300" value={form.contactEmail} onChange={(e) => setForm({...form, contactEmail: e.target.value})} placeholder="Masalan: hotel@safartrip.uz" />
                         </div>
                         <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Biznes Telefon</label>
                            <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-300" value={form.contactPhone} onChange={(e) => setForm({...form, contactPhone: e.target.value})} placeholder="+998 9x xxx xx xx" />
                         </div>
                      </div>
                      <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Qisqacha Tavsif (Bio)</label>
                         <textarea className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-300" rows={4} value={form.bio} onChange={(e) => setForm({...form, bio: e.target.value})} placeholder="Hamkor haqida qisqacha ma'lumot kiriting..." />
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
                       <button className="adm-btn adm-btn-primary px-8 py-3.5 shadow-xl shadow-slate-900/10 flex items-center gap-3 active:scale-95" onClick={() => setActiveStep(s => s + 1)}>Keyingisi <ChevronRight size={18} /></button>
                    ) : (
                       <button 
                         className="adm-btn adm-btn-primary px-8 py-3.5 shadow-xl shadow-slate-900/10 flex items-center gap-3 disabled:opacity-50 active:scale-95 transition-all" 
                         onClick={() => void handleSave()}
                         disabled={saving}
                       >
                          {saving ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                          {editItem ? "Saqlash" : (form.isNewUser ? "Account + Hamkorlikni yaratish" : "Hamkorlikni yaratish")}
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
