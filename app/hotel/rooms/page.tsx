"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BedDouble, Plus, Edit3, Trash2, Users, Baby,
  Loader2, X, CheckCircle2, XCircle, DollarSign,
  Search, Tag, Layers, RefreshCw, Image as ImageIcon,
  CheckCircle, Hash, Building
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface PhysicalRoom {
  id: string;
  roomTypeId: string;
  roomNumber: string;
  floor: string | null;
  status: string; // AVAILABLE, OCCUPIED, CLEANING, MAINTENANCE, BLOCKED
  isActive: boolean;
}

interface RoomType {
  id: string;
  name: string;
  description: string | null;
  capacityAdults: number;
  capacityChildren: number;
  basePrice: number;
  isActive: boolean;
  images: any; // URL strings array
  rooms?: PhysicalRoom[];
}

const EMPTY_TYPE_FORM = {
  name: "", description: "", capacityAdults: 2,
  capacityChildren: 0, basePrice: 0, isActive: true, images: [] as string[]
};

const EMPTY_PHYSICAL_FORM = {
  roomTypeId: "", roomNumber: "", floor: "", status: "AVAILABLE", isActive: true
};

export default function HotelRooms() {
  const { t } = useLanguage();
  const [activeTab,   setActiveTab]   = useState<"types" | "physical">("types");
  
  const [roomTypes,   setRoomTypes]   = useState<RoomType[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  
  // Drawer states
  const [drawerMode,  setDrawerMode]  = useState<"none" | "type" | "physical">("none");
  const [closing,     setClosing]     = useState(false);
  
  // Form states
  const [editingType, setEditingType] = useState<RoomType | null>(null);
  const [typeForm,    setTypeForm]    = useState(EMPTY_TYPE_FORM);
  const [imgInput,    setImgInput]    = useState("");
  
  const [editingPhy,  setEditingPhy]  = useState<PhysicalRoom | null>(null);
  const [phyForm,     setPhyForm]     = useState(EMPTY_PHYSICAL_FORM);

  const [submitting,  setSubmitting]  = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch("/api/hotel/rooms");
      const data = await res.json();
      if (res.ok) setRoomTypes(data.rooms || []);
    } catch { /* suppress */ } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  function handleCloseSlideOver() {
    setClosing(true);
    setTimeout(() => {
      setDrawerMode("none");
      setClosing(false);
    }, 300);
  }

  // ==== Room Types Methods ====
  function openAddType() {
    setEditingType(null);
    setTypeForm(EMPTY_TYPE_FORM);
    setDrawerMode("type");
  }
  function openEditType(r: RoomType) {
    setEditingType(r);
    setTypeForm({ 
      name: r.name, description: r.description || "", 
      capacityAdults: r.capacityAdults, capacityChildren: r.capacityChildren, 
      basePrice: r.basePrice ? Number(r.basePrice) : 0, isActive: r.isActive,
      images: Array.isArray(r.images) ? r.images : []
    });
    setDrawerMode("type");
  }

  async function handleTypeSubmit() {
    if (!typeForm.name.trim()) { toast.error(t("rooms.toasts.name_required")); return; }
    setSubmitting(true);
    try {
      const url    = editingType ? `/api/hotel/rooms/${editingType.id}` : "/api/hotel/rooms";
      const method = editingType ? "PATCH" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(typeForm) });
      if (!res.ok) throw new Error(t("common.toasts.error"));
      toast.success(t("rooms.toasts.save_success"));
      handleCloseSlideOver();
      void load();
    } catch (e) { toast.error((e as Error).message); } finally { setSubmitting(false); }
  }

  async function handleTypeDelete(id: string) {
    if (!confirm(t("rooms.toasts.delete_confirm_type"))) return;
    try {
      const res = await fetch(`/api/hotel/rooms/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t("common.toasts.error"));
      toast.success(t("rooms.toasts.delete_success"));
      void load();
    } catch (e) { toast.error((e as Error).message); }
  }

  // ==== Physical Rooms Methods ====
  function openAddPhy() {
    if (roomTypes.length === 0) { toast.error(t("rooms.toasts.type_required")); return; }
    setEditingPhy(null);
    setPhyForm({ ...EMPTY_PHYSICAL_FORM, roomTypeId: roomTypes[0].id });
    setDrawerMode("physical");
  }
  function openEditPhy(r: PhysicalRoom) {
    setEditingPhy(r);
    setPhyForm({ 
      roomTypeId: r.roomTypeId, roomNumber: r.roomNumber, 
      floor: r.floor || "", status: r.status, isActive: r.isActive
    });
    setDrawerMode("physical");
  }

  async function handlePhySubmit() {
    if (!phyForm.roomNumber.trim()) { toast.error(t("rooms.toasts.room_number_required")); return; }
    setSubmitting(true);
    try {
      const url    = editingPhy ? `/api/hotel/physical-rooms/${editingPhy.id}` : "/api/hotel/physical-rooms";
      const method = editingPhy ? "PATCH" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(phyForm) });
      const data   = await res.json();
      if (!res.ok) throw new Error(data.message || t("common.toasts.error"));
      toast.success(t("rooms.toasts.room_save_success"));
      handleCloseSlideOver();
      void load();
    } catch (e) { toast.error((e as Error).message); } finally { setSubmitting(false); }
  }

  async function handlePhyDelete(id: string) {
    if (!confirm(t("rooms.toasts.delete_confirm_room"))) return;
    try {
      const res = await fetch(`/api/hotel/physical-rooms/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t("common.toasts.error"));
      void load();
    } catch { toast.error(t("common.toasts.error")); }
  }

  // Prepare Views
  const typeResults = roomTypes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  const allPhysicalRooms = roomTypes.flatMap(rt => (rt.rooms || []).map(pr => ({ ...pr, categoryName: rt.name })));
  const phyResults = allPhysicalRooms.filter(pr => pr.roomNumber.toLowerCase().includes(search.toLowerCase()) || pr.categoryName.toLowerCase().includes(search.toLowerCase()));

  // Helpers
  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case "AVAILABLE": return <span className="h-badge h-badge-green"><CheckCircle size={12}/> {t("rooms.status.AVAILABLE")}</span>;
      case "OCCUPIED": return <span className="h-badge h-badge-red"><BedDouble size={12}/> {t("rooms.status.OCCUPIED")}</span>;
      case "CLEANING": return <span className="h-badge h-badge-blue"><RefreshCw size={12} className="animate-spin-slow"/> {t("rooms.status.CLEANING")}</span>;
      case "MAINTENANCE": return <span className="h-badge h-badge-amber">{t("rooms.status.MAINTENANCE")}</span>;
      default: return <span className="h-badge h-badge-gray">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">

      {/* CRM Minimal Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight">{t("rooms.title")}</h1>
          <p className="text-[13px] font-semibold text-slate-500 mt-1">{t("rooms.subtitle")}</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200/50">
          <button onClick={() => setActiveTab("types")}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "types" ? "bg-white text-[var(--primary)] shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
            <Layers size={16} /> {t("rooms.tabs.types")} ({roomTypes.length})
          </button>
          <button onClick={() => setActiveTab("physical")}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "physical" ? "bg-white text-[var(--primary)] shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
            <Hash size={16} /> {t("rooms.tabs.physical")} ({allPhysicalRooms.length})
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={activeTab === "types" ? t("rooms.search.types") : t("rooms.search.physical")}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-semibold focus:border-[var(--accent)] outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
           <button onClick={() => void load()} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg border border-slate-200">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
           </button>
           <button onClick={activeTab === "types" ? openAddType : openAddPhy} 
             className="flex items-center gap-1.5 px-4 py-2 bg-[var(--primary)] text-white text-[13px] font-bold rounded-lg hover:bg-[var(--secondary)] transition-colors shadow-sm">
             <Plus size={16} />
             {t("rooms.add_new")}
           </button>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[500px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-400">
            <Loader2 size={32} className="animate-spin mb-4" />
            <p className="font-bold text-sm tracking-widest uppercase">{t("common.loading")}</p>
          </div>
        ) : activeTab === "types" ? (
          /* TYPES TAB */
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5">{t("rooms.table.type_info")}</th>
                <th className="py-3 px-5">{t("rooms.table.images")}</th>
                <th className="py-3 px-5">{t("rooms.table.capacity")}</th>
                <th className="py-3 px-5">{t("rooms.table.base_price")}</th>
                <th className="py-3 px-5">{t("rooms.table.rooms_count")}</th>
                <th className="py-3 px-5 text-right">{t("rooms.table.actions")}</th>
              </tr>
            </thead>
            <tbody className="text-[14px]">
              {typeResults.length === 0 ? (
                 <tr><td colSpan={6} className="text-center py-20 text-slate-500 font-medium">{t("rooms.table.no_data")}</td></tr>
              ) : typeResults.map(r => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-5">
                    <div className="font-bold text-[var(--primary)] flex items-center gap-2">
                       {r.name} {!r.isActive && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-600 uppercase font-black tracking-wider">{t("rooms.table.inactive")}</span>}
                    </div>
                    <div className="text-[12px] text-slate-500 line-clamp-1 mt-0.5">{r.description || "-"}</div>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[13px]">
                      <ImageIcon size={14} className="text-slate-400" />
                      {(Array.isArray(r.images) && r.images.length > 0) ? t("rooms.table.loaded_count", { count: r.images.length }) : <span className="opacity-50">-</span>}
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex gap-3">
                       <span className="flex items-center gap-1 font-bold text-slate-700 text-[13px]"><Users size={14} className="text-slate-400"/> {r.capacityAdults}</span>
                       <span className="flex items-center gap-1 font-bold text-slate-700 text-[13px]"><Baby size={14} className="text-slate-400"/> {r.capacityChildren}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5 font-black text-slate-800 text-[13px]">
                     {Number(r.basePrice).toLocaleString()}
                  </td>
                  <td className="py-4 px-5">
                     <span className="px-2 py-1 bg-[var(--bg-light-blue)] text-[var(--secondary)] font-bold rounded-md text-[12px]">
                       {t("rooms.table.linked_count", { count: r.rooms?.length || 0 })}
                     </span>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <button onClick={() => openEditType(r)} className="p-1.5 text-slate-400 hover:text-[var(--accent)] hover:bg-slate-100 rounded-md transition-colors mr-1"><Edit3 size={15} strokeWidth={2.5}/></button>
                    <button onClick={() => handleTypeDelete(r.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={15} strokeWidth={2.5}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* PHYSICAL ROOMS TAB */
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5">{t("rooms.table.room_number")}</th>
                <th className="py-3 px-5">{t("rooms.table.category")}</th>
                <th className="py-3 px-5">{t("rooms.table.floor")}</th>
                <th className="py-3 px-5">{t("rooms.table.status")}</th>
                <th className="py-3 px-5 text-right">{t("rooms.table.actions")}</th>
              </tr>
            </thead>
            <tbody className="text-[14px]">
              {phyResults.length === 0 ? (
                 <tr><td colSpan={5} className="text-center py-20 text-slate-500 font-medium">{t("rooms.table.no_rooms")}</td></tr>
              ) : phyResults.map(pr => (
                <tr key={pr.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-5">
                     <div className="font-extrabold text-[var(--primary)] flex items-center gap-2">
                        <Hash size={14} className="text-slate-400"/>
                        {pr.roomNumber}
                        {!pr.isActive && <span className="w-2 h-2 rounded-full bg-slate-300" title="Aktiv Emas"/>}
                     </div>
                  </td>
                  <td className="py-3 px-5 font-bold text-slate-700 text-[13px]">{pr.categoryName}</td>
                  <td className="py-3 px-5 font-semibold text-slate-500 text-[13px]">{pr.floor || "-"}</td>
                  <td className="py-3 px-5"><StatusBadge status={pr.status} /></td>
                  <td className="py-3 px-5 text-right">
                    <button onClick={() => openEditPhy(pr)} className="p-1.5 text-slate-400 hover:text-[var(--accent)] hover:bg-slate-100 rounded-md transition-colors mr-1"><Edit3 size={15} strokeWidth={2.5}/></button>
                    <button onClick={() => handlePhyDelete(pr.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={15} strokeWidth={2.5}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ==================================================
          SLIDEOVERS (DRAWERS)
          ================================================== */}
      
      {drawerMode !== "none" && (
        <>
          <div className="h-slide-over-overlay" onClick={handleCloseSlideOver} />
          <div className={`h-slide-over ${closing ? "closing" : ""} w-[480px] max-w-full border-l border-slate-200/50 shadow-2xl`}>
            
            {drawerMode === "type" && (
              /* --- ROOM TYPE DRAWER --- */
              <>
                <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between">
                  <div>
                     <h3 className="text-base font-black text-[var(--primary)] font-display">{editingType ? t("rooms.modal.type_title_edit") : t("rooms.modal.type_title_add")}</h3>
                     <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{t("rooms.modal.type_subtitle")}</p>
                  </div>
                  <button onClick={handleCloseSlideOver} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-lg"><X size={18} /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">
                   {/* Main info */}
                    <div className="space-y-4">
                     <div>
                       <label className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 block">{t("rooms.modal.name")}</label>
                       <input value={typeForm.name} onChange={e=>setTypeForm({...typeForm, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-[14px] outline-none focus:border-[var(--accent)]" placeholder={t("rooms.modal.name_placeholder")}/>
                     </div>
                     <div>
                       <label className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 block">{t("rooms.modal.desc")}</label>
                       <textarea value={typeForm.description} onChange={e=>setTypeForm({...typeForm, description: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[var(--accent)] min-h-[80px]" placeholder={t("rooms.modal.desc_placeholder")}/>
                     </div>
                   </div>

                   {/* Capacity & Price */}
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-200/60 pt-6">
                     <div>
                       <label className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 block">{t("rooms.modal.adults")}</label>
                       <div className="relative">
                         <Users size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                         <input type="number" min={1} value={typeForm.capacityAdults} onChange={e=>setTypeForm({...typeForm, capacityAdults: +e.target.value})} className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 font-black text-center text-[15px] outline-none focus:border-[var(--accent)]"/>
                       </div>
                     </div>
                     <div>
                       <label className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 block">{t("rooms.modal.children")}</label>
                       <div className="relative">
                         <Baby size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                         <input type="number" min={0} value={typeForm.capacityChildren} onChange={e=>setTypeForm({...typeForm, capacityChildren: +e.target.value})} className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 font-black text-center text-[15px] outline-none focus:border-[var(--accent)]"/>
                       </div>
                     </div>
                     <div className="col-span-2">
                       <label className="text-[12px] font-extrabold text-[#16a34a] uppercase tracking-wider mb-2 block">{t("rooms.modal.price")}</label>
                       <input type="number" value={typeForm.basePrice || ""} onChange={e=>setTypeForm({...typeForm, basePrice: +e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 font-black text-[18px] text-[var(--primary)] outline-none focus:border-[#16a34a] text-right" placeholder="0" />
                     </div>
                   </div>

                   {/* Images Section */}
                    <div className="border-t border-slate-200/60 pt-6">
                     <label className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><ImageIcon size={14}/> {t("rooms.modal.images_label")}</label>
                     <div className="flex gap-2 mb-3">
                       <input value={imgInput} onChange={e=>setImgInput(e.target.value)} placeholder={t("rooms.modal.images_placeholder")} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-[var(--accent)]"/>
                       <button onClick={() => { if(imgInput.trim()){ setTypeForm({...typeForm, images: [...typeForm.images, imgInput.trim()]}); setImgInput(""); } }} className="px-4 bg-slate-100 hover:bg-slate-200 text-[var(--primary)] text-xs font-bold rounded-lg border border-slate-200">{t("rooms.modal.add_img")}</button>
                     </div>
                     <div className="flex flex-wrap gap-2">
                       {typeForm.images.length === 0 && <p className="text-[11px] text-slate-400 font-semibold italic">{t("rooms.modal.no_img")}</p>}
                       {typeForm.images.map((img, i) => (
                         <div key={i} className="relative group rounded-md border border-slate-300 overflow-hidden w-[64px] h-[64px] shrink-0 bg-slate-100 flex items-center justify-center">
                            <img src={img} alt="x" className="object-cover w-full h-full opacity-80" onError={e => (e.currentTarget.style.display = 'none')} />
                            <button onClick={()=>setTypeForm({...typeForm, images: typeForm.images.filter((_, idx)=>idx!==i)})} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
                         </div>
                       ))}
                     </div>
                   </div>

                   {/* Active Status */}
                   <div className="border border-slate-200 bg-white rounded-xl p-4 flex items-center gap-4">
                     <button onClick={() => setTypeForm({ ...typeForm, isActive: !typeForm.isActive })}
                        className={`w-10 h-6 rounded-full relative transition-colors ${typeForm.isActive ? "bg-[var(--success)]" : "bg-slate-300"}`}>
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${typeForm.isActive ? "left-[22px]" : "left-1"}`}/>
                     </button>
                     <div>
                       <div className="text-[13px] font-bold text-slate-900 leading-none">{typeForm.isActive ? t("rooms.modal.active_label") : t("rooms.modal.inactive_label")}</div>
                     </div>
                   </div>
                </div>

                <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3">
                   <button onClick={handleCloseSlideOver} className="px-5 py-2.5 bg-slate-100 text-[13px] font-bold text-slate-600 rounded-xl hover:bg-slate-200">{t("rooms.modal.close_btn")}</button>
                   <button onClick={handleTypeSubmit} disabled={submitting} className="px-6 py-2.5 bg-[var(--primary)] text-white text-[13px] font-bold rounded-xl hover:bg-[var(--secondary)] flex items-center gap-2">
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16}/>} {t("rooms.modal.save_btn")}
                   </button>
                </div>
              </>
            )}

            {drawerMode === "physical" && (
              /* --- PHYSICAL ROOM DRAWER --- */
              <>
                <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between">
                  <div>
                     <h3 className="text-base font-black text-[var(--primary)] font-display">{editingPhy ? t("rooms.modal.phy_title_edit") : t("rooms.modal.phy_title_add")}</h3>
                     <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{t("rooms.modal.phy_subtitle")}</p>
                  </div>
                  <button onClick={handleCloseSlideOver} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-lg"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-5">
                   <div>
                     <label className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 block">{t("rooms.modal.select_category")}</label>
                     <select value={phyForm.roomTypeId} onChange={e=>setPhyForm({...phyForm, roomTypeId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-[14px] outline-none focus:border-[var(--accent)]">
                       {roomTypes.map(r => <option key={r.id} value={r.id}>{r.name} ({t("common.unit", { count: r.capacityAdults })})</option>)}
                     </select>
                   </div>
                   
                    <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-[12px] font-extrabold text-[var(--primary)] uppercase tracking-wider mb-2 flex items-center gap-1"><Hash size={12}/> {t("rooms.modal.room_number")}</label>
                       <input value={phyForm.roomNumber} onChange={e=>setPhyForm({...phyForm, roomNumber: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-black text-[16px] outline-none focus:border-[var(--accent)]" placeholder="M: 101, A-1"/>
                     </div>
                     <div>
                       <label className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Building size={12}/> {t("rooms.modal.floor")}</label>
                       <input value={phyForm.floor} onChange={e=>setPhyForm({...phyForm, floor: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-[14px] outline-none focus:border-[var(--accent)]" placeholder={t("rooms.modal.floor_placeholder")}/>
                     </div>
                   </div>

                   {editingPhy && (
                     <div>
                       <label className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 block">{t("rooms.modal.status_label")}</label>
                       <select value={phyForm.status} onChange={e=>setPhyForm({...phyForm, status: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-[13px] outline-none focus:border-[var(--accent)]">
                         <option value="AVAILABLE">{t("rooms.status.AVAILABLE")}</option>
                         <option value="OCCUPIED">{t("rooms.status.OCCUPIED")}</option>
                         <option value="CLEANING">{t("rooms.status.CLEANING")}</option>
                         <option value="MAINTENANCE">{t("rooms.status.MAINTENANCE")}</option>
                         <option value="BLOCKED">{t("rooms.status.BLOCKED")}</option>
                       </select>
                     </div>
                   )}

                   <div className="border border-slate-200 bg-white rounded-xl p-4 flex items-center gap-4 mt-8">
                     <button onClick={() => setPhyForm({ ...phyForm, isActive: !phyForm.isActive })}
                        className={`w-10 h-6 rounded-full relative transition-colors ${phyForm.isActive ? "bg-[var(--success)]" : "bg-slate-300"}`}>
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${phyForm.isActive ? "left-[22px]" : "left-1"}`}/>
                     </button>
                     <div>
                       <div className="text-[13px] font-bold text-slate-900 leading-none">{phyForm.isActive ? t("rooms.modal.active_phy") : t("rooms.modal.inactive_phy")}</div>
                     </div>
                   </div>
                </div>

                <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3">
                   <button onClick={handleCloseSlideOver} className="px-5 py-2.5 bg-slate-100 text-[13px] font-bold text-slate-600 rounded-xl hover:bg-slate-200">{t("rooms.modal.close_btn")}</button>
                   <button onClick={handlePhySubmit} disabled={submitting} className="px-6 py-2.5 bg-[var(--accent)] text-white text-[13px] font-bold rounded-xl hover:bg-[var(--accent-hover)] flex items-center gap-2">
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16}/>} {t("rooms.modal.save_btn")}
                   </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
