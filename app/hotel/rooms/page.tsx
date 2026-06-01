"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BedDouble, Plus, Edit3, Trash2,
  Loader2, X,
  Search, RefreshCw, Layers,
  CheckCircle, Hash, Building,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import BulkCreateRooms from "@/components/hotel/BulkCreateRooms";
import RoomTypes from "@/components/hotel/RoomTypes";

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

const EMPTY_PHYSICAL_FORM = {
  roomTypeId: "", roomNumber: "", floor: "", status: "AVAILABLE", isActive: true
};

export default function HotelRooms() {
  const { t } = useLanguage();
  const [activeTab,   setActiveTab]   = useState<"types" | "physical" | "bulk">("types");
  const [hotelId,     setHotelId]     = useState("");
  const [bulkRoomTypeId, setBulkRoomTypeId] = useState<string | undefined>();
  
  const [roomTypes,   setRoomTypes]   = useState<RoomType[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  
  const [drawerMode,  setDrawerMode]  = useState<"none" | "physical">("none");
  const [closing,     setClosing]     = useState(false);
  
  const [editingPhy,  setEditingPhy]  = useState<PhysicalRoom | null>(null);
  const [phyForm,     setPhyForm]     = useState(EMPTY_PHYSICAL_FORM);

  const [submitting,  setSubmitting]  = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [roomsRes, meRes] = await Promise.all([
        fetch("/api/hotel/rooms"),
        hotelId ? Promise.resolve(null) : fetch("/api/hotel/me"),
      ]);
      const data = await roomsRes.json();
      if (roomsRes.ok) setRoomTypes(data.rooms || []);
      if (meRes) {
        const meData = await meRes.json();
        if (meRes.ok && meData.hotel?.id) setHotelId(meData.hotel.id);
      }
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
          <button onClick={() => setActiveTab("bulk")}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "bulk" ? "bg-white text-[var(--primary)] shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
            <Sparkles size={16} /> Ko&apos;p yaratish
          </button>
        </div>
      </div>

      {/* Control Bar */}
      {activeTab === "physical" && (
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("rooms.search.physical")}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-semibold focus:border-[var(--accent)] outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
           <button onClick={() => void load()} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg border border-slate-200">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
           </button>
           <button onClick={openAddPhy} 
             className="flex items-center gap-1.5 px-4 py-2 bg-[var(--primary)] text-white text-[13px] font-bold rounded-lg hover:bg-[var(--secondary)] transition-colors shadow-sm">
             <Plus size={16} />
             {t("rooms.add_new")}
           </button>
        </div>
      </div>
      )}

      {activeTab === "bulk" ? (
        <BulkCreateRooms
          hotelId={hotelId}
          roomTypes={roomTypes}
          initialRoomTypeId={bulkRoomTypeId}
          onSuccess={() => {
            void load();
            setActiveTab("physical");
          }}
        />
      ) : activeTab === "types" ? (
        <RoomTypes
          hotelId={hotelId}
          onBulkCreate={(roomTypeId) => {
            setBulkRoomTypeId(roomTypeId);
            setActiveTab("bulk");
          }}
          onChange={() => void load()}
        />
      ) : (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[500px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-400">
            <Loader2 size={32} className="animate-spin mb-4" />
            <p className="font-bold text-sm tracking-widest uppercase">{t("common.loading")}</p>
          </div>
        ) : (
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
      )}

      {drawerMode === "physical" && (
        <>
          <div className="h-slide-over-overlay" onClick={handleCloseSlideOver} />
          <div className={`h-slide-over ${closing ? "closing" : ""} w-[480px] max-w-full border-l border-slate-200/50 shadow-2xl`}>
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
          </div>
        </>
      )}
    </div>
  );
}
