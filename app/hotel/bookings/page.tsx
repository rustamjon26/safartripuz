"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarCheck, User, Phone, BedDouble, Plus, X, ChevronLeft, ChevronRight,
  Loader2, Search, CheckCircle2, XCircle, Clock,
  Filter, RefreshCw, LayoutDashboard, List, Play, LogOut, Verified, Send, Info
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface Booking {
  id: string;
  guestName: string;
  guestPhone: string | null;
  checkInDate: string;
  checkOutDate: string;
  roomCount: number;
  totalAmount: number;
  paidAmount: number;
  passportData: string | null;
  nationality: string | null;
  birthDate: string | null;
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  roomType: { name: string } | null;
  createdAt: string;
}

interface RoomType { id: string; name: string; basePrice: string; _count?: { rooms: number } }

function nights(checkIn: string, checkOut: string) {
  const diff = +new Date(checkOut) - +new Date(checkIn);
  return Math.max(1, Math.round(diff / 86_400_000));
}

export default function HotelBookings() {
  const { t } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total,     setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [viewMode, setViewMode] = useState<"board" | "table">("board");
  
  const [q,        setQ]        = useState("");
  const [filter,   setFilter]   = useState("ALL");
  const [page,     setPage]     = useState(1);
  const take = 10;

  // Modals & Form
  const [adding,     setAdding]     = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [roomTypes,  setRoomTypes]  = useState<RoomType[]>([]);
  const [actorRoles, setActorRoles] = useState<string[]>([]);
  const [avail,      setAvail]      = useState<{ total: number, reserved: number, free: number } | null>(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [availPhyRooms, setAvailPhyRooms] = useState<{id: string, roomNumber: string}[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);

  const [form, setForm] = useState({
    roomTypeId: "", checkInDate: "", checkOutDate: "", roomCount: 1, 
    totalAmount: "", paidAmount: "0", guests: [
      { firstName: "", lastName: "", passportData: "", nationality: "Uzbekistan", birthDate: "", isChild: false }
    ]
  });

  async function load() {
    setLoading(true);
    try {
      const skip = (page - 1) * take;
      const params = new URLSearchParams({ take: String(take), skip: String(skip) });
      if (filter !== "ALL") params.set("status", filter);
      if (q) params.set("q", q);

      const res  = await fetch(`/api/hotel/bookings?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setBookings(data.items || []);
        setTotal(data.total || 0);
      }
    } catch { /* suppress */ } finally { setLoading(false); }
  }

  async function loadActor() {
    try {
      const res = await fetch("/api/hotel/me");
      const data = await res.json();
      if (res.ok) setActorRoles(data.user?.roles || []);
    } catch { /* suppress */ }
  }

  async function loadRoomTypes() {
    try {
      const res = await fetch("/api/hotel/room-types");
      const data = await res.json();
      if (res.ok) setRoomTypes(data.items || []);
    } catch { /* suppress */ }
  }

  useEffect(() => { void loadActor(); }, []);
  useEffect(() => { void load(); }, [page, filter, q]);
  useEffect(() => { void loadRoomTypes(); }, []);

  // Availability Check Effect
  useEffect(() => {
    if (!form.roomTypeId || !form.checkInDate || !form.checkOutDate) {
      setAvail(null);
      return;
    }
    const t = setTimeout(async () => {
      setAvailLoading(true);
      try {
        const params = new URLSearchParams({
          roomTypeId: form.roomTypeId,
          checkInDate: new Date(form.checkInDate).toISOString(),
          checkOutDate: new Date(form.checkOutDate).toISOString()
        });
        
        // 1. Overall Availability Stats
        const resStats = await fetch(`/api/hotel/bookings/availability?${params.toString()}`);
        const dataStats = await resStats.json();
        if (resStats.ok) setAvail({ total: dataStats.totalRooms, reserved: dataStats.usedRooms, free: dataStats.availableRooms });

        // 2. Specific Physical Rooms
        const resPhy = await fetch(`/api/hotel/rooms/available?${params.toString()}`);
        const dataPhy = await resPhy.json();
        if (resPhy.ok) setAvailPhyRooms(dataPhy.rooms || []);
      } catch { /* suppress */ }
      setAvailLoading(false);
    }, 500);
    return () => clearTimeout(t);
  }, [form.roomTypeId, form.checkInDate, form.checkOutDate]);
 
  // Automatic Price Calculation Effect
  useEffect(() => {
    if (!form.roomTypeId || !form.checkInDate || !form.checkOutDate) return;
    const selectedType = roomTypes.find(rt => rt.id === form.roomTypeId);
    if (!selectedType) return;
    const n = nights(form.checkInDate, form.checkOutDate);
    const price = Number(selectedType.basePrice);
    const total = price * n * form.roomCount;
    setForm(prev => ({ ...prev, totalAmount: String(total), paidAmount: String(total) }));
  }, [form.roomTypeId, form.checkInDate, form.checkOutDate, form.roomCount, roomTypes]);

  async function deleteBooking(id: string) {
    if (!confirm(t("reception.modal.confirm_delete"))) return;
    try {
      const res = await fetch(`/api/hotel/bookings/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("reception.toasts.delete_success"));
        void load();
      } else throw new Error();
    } catch { toast.error(t("reception.toasts.delete_error")); }
  }

  async function updateStatus(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/hotel/bookings/${id}`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ status: newStatus })
      });
      if(res.ok) {
        toast.success(t("reception.toasts.status_updated"));
        void load();
      } else throw new Error(t("common.toasts.error"));
    } catch(e) {
      toast.error(t("reception.toasts.status_error"));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (avail && form.roomCount > avail.free) return toast.error(t("reception.toasts.no_rooms"));
    setSaving(true);
    try {
      const res = await fetch("/api/hotel/bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          roomCount: Number(form.roomCount),
          totalAmount: Number(form.totalAmount),
          paidAmount: Number(form.paidAmount),
          checkInDate: new Date(form.checkInDate).toISOString(),
          checkOutDate: new Date(form.checkOutDate).toISOString(),
          source: "RECEPTION",
          physicalRoomIds: selectedRoomIds
        })
      });
      if (res.ok) {
        toast.success(t("reception.toasts.save_success"));
        setAdding(false);
        setSelectedRoomIds([]);
        setForm({ 
          roomTypeId: "", checkInDate: "", checkOutDate: "", roomCount: 1, 
          totalAmount: "", paidAmount: "0", guests: [
            { firstName: "", lastName: "", passportData: "", nationality: "Uzbekistan", birthDate: "", isChild: false }
          ]
        });
        void load();
      } else {
        const d = await res.json();
        toast.error(d.message || t("reception.toasts.save_error"));
      }
    } catch { toast.error(t("reception.toasts.save_error")); }
    setSaving(false);
  }

  const boardKutilmoqda = bookings.filter(b => b.status === "PENDING" || b.status === "CONFIRMED");
  const boardKeldi = bookings.filter(b => b.status === "CHECKED_IN");
  const boardKetdi = bookings.filter(b => b.status === "CHECKED_OUT" || b.status === "COMPLETED");

  const BoardCard = ({b}: {b: Booking}) => (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group">
       <div className="flex justify-between items-start mb-2">
         <div className="font-bold text-[var(--primary)] text-[14px] leading-tight">{b.guestName}</div>
         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{nights(b.checkInDate, b.checkOutDate)} {t("reception.card.nights")}</span>
       </div>
       <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mb-3 font-semibold">
          <BedDouble size={12} className="text-slate-400"/> {b.roomType?.name || t("common.room")} ({b.roomCount} {t("common.unit")})
       </div>
       <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 bg-slate-50 p-2 rounded-lg mb-4">
          <Clock size={12} className="text-slate-400"/>
          {new Date(b.checkInDate).toLocaleDateString()} ➔ {new Date(b.checkOutDate).toLocaleDateString()}
       </div>
       
       <div className="flex gap-2">
          {(b.status === "PENDING" || b.status === "CONFIRMED") && (
            <>
               <button onClick={() => updateStatus(b.id, "CHECKED_IN")} className="flex-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[11px] font-bold py-2 rounded-md flex items-center justify-center gap-1 transition-colors">
                  <Play size={12}/> {t("reception.card.check_in")}
               </button>
               <button onClick={() => updateStatus(b.id, "CANCELLED")} className="px-3 border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all">
                  <X size={14}/>
               </button>
            </>
          )}
          {b.status === "CHECKED_IN" && (
            <button onClick={() => updateStatus(b.id, "CHECKED_OUT")} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold py-2 rounded-md flex items-center justify-center gap-1 transition-colors">
               <LogOut size={12}/> {t("reception.card.check_out")}
            </button>
          )}
          {(b.status === "CHECKED_OUT" || b.status === "COMPLETED") && (
            <div className="flex-1 bg-slate-100 text-slate-400 text-[11px] font-bold py-2 rounded-md flex items-center justify-center gap-1">
               <Verified size={12}/> {t("reception.card.done")}
            </div>
          )}
          {actorRoles.includes("hotel_manager") && (
             <button onClick={() => deleteBooking(b.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors">
                <Trash2 size={14}/>
             </button>
          )}
        </div>
    </div>
  );

  const maxPage = Math.ceil(total / take) || 1;

  return (
    <div className="space-y-6 h-animate pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight flex items-center gap-2">
             <CalendarCheck size={24} className="text-[var(--accent)]"/> {t("reception.title")}
          </h1>
          <p className="text-[13px] font-semibold text-slate-500 mt-1">
            {t("reception.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/50">
              <button onClick={()=>setViewMode("board")} className={`flex items-center gap-2 px-4 py-2 text-[12px] font-bold rounded-lg transition-colors ${viewMode==='board'?'bg-white text-[var(--primary)] shadow-sm':'text-slate-500 hover:bg-white/50'}`}>
                 <LayoutDashboard size={14}/> {t("reception.board")}
              </button>
              <button onClick={()=>setViewMode("table")} className={`flex items-center gap-2 px-4 py-2 text-[12px] font-bold rounded-lg transition-colors ${viewMode==='table'?'bg-white text-[var(--primary)] shadow-sm':'text-slate-500 hover:bg-white/50'}`}>
                 <List size={14}/> {t("reception.table")}
              </button>
           </div>
           <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white text-[13px] font-black rounded-xl hover:bg-[var(--secondary)] shadow-lg shadow-blue-900/10 transition-all">
              <Plus size={16}/> {t("reception.new_booking")}
           </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => {setQ(e.target.value); setPage(1);}} placeholder={t("reception.search_placeholder")} className="w-full pl-10 pr-4 py-2.5 text-[13px] font-bold border border-slate-200 rounded-xl outline-none focus:border-[var(--accent)] bg-white shadow-sm" />
        </div>
        <div className="relative group min-w-[200px]">
          <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select value={filter} onChange={e => {setFilter(e.target.value); setPage(1);}} className="w-full pl-10 pr-8 py-2.5 text-[13px] font-bold border border-slate-200 rounded-xl outline-none focus:border-[var(--accent)] appearance-none bg-white cursor-pointer shadow-sm">
            <option value="ALL">{t("reception.filters.all")}</option>
            <option value="PENDING">{t("reception.filters.pending")}</option>
            <option value="CONFIRMED">{t("reception.filters.confirmed")}</option>
            <option value="CHECKED_IN">{t("reception.filters.staying")}</option>
            <option value="CHECKED_OUT">{t("reception.filters.completed")}</option>
          </select>
        </div>
        <button onClick={() => void load()} className="p-2.5 bg-white text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-sm">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400">
           <Loader2 size={32} className="animate-spin mx-auto mb-4 text-slate-200" />
           <p className="text-[11px] font-black uppercase tracking-[0.2em]">{t("common.loading")}</p>
        </div>
      ) : viewMode === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
           <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 min-h-[600px]">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"/>
                   <h3 className="font-black text-[var(--primary)] text-[12px] uppercase tracking-wider">{t("reception.board_columns.pending")}</h3>
                </div>
                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] font-black text-slate-400">{boardKutilmoqda.length}</span>
              </div>
              <div className="space-y-4">
                 {boardKutilmoqda.map(b => <BoardCard key={b.id} b={b}/>)}
                 {boardKutilmoqda.length === 0 && <div className="text-[12px] font-semibold text-slate-400 text-center py-12 border border-dashed border-slate-300 rounded-xl">{t("reception.board_columns.empty.pending")}</div>}
              </div>
           </div>
           <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 min-h-[600px]">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-green-500"/>
                   <h3 className="font-black text-[var(--primary)] text-[12px] uppercase tracking-wider">{t("reception.board_columns.staying")}</h3>
                </div>
                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] font-black text-slate-400">{boardKeldi.length}</span>
              </div>
              <div className="space-y-4">
                 {boardKeldi.map(b => <BoardCard key={b.id} b={b}/>)}
                 {boardKeldi.length === 0 && <div className="text-[12px] font-semibold text-slate-400 text-center py-12 border border-dashed border-slate-300 rounded-xl">{t("reception.board_columns.empty.staying")}</div>}
              </div>
           </div>
           <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 min-h-[600px]">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-slate-400"/>
                   <h3 className="font-black text-[var(--primary)] text-[12px] uppercase tracking-wider">{t("reception.board_columns.completed")}</h3>
                </div>
                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] font-black text-slate-400">{boardKetdi.length}</span>
              </div>
              <div className="space-y-4">
                 {boardKetdi.map(b => <BoardCard key={b.id} b={b}/>)}
                 {boardKetdi.length === 0 && <div className="text-[12px] font-semibold text-slate-400 text-center py-12 border border-dashed border-slate-300 rounded-xl">{t("reception.board_columns.empty.completed")}</div>}
              </div>
           </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 overflow-hidden rounded-2xl shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-4 px-6 text-[11px]">{t("reception.table_headers.name")}</th>
                  <th className="py-4 px-6">{t("reception.table_headers.date")}</th>
                  <th className="py-4 px-6">{t("reception.table_headers.room")}</th>
                  <th className="py-4 px-6 text-right">{t("reception.table_headers.payment")}</th>
                  <th className="py-4 px-6 text-center">{t("reception.table_headers.status")}</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {bookings.length === 0 ? (
                  <tr><td colSpan={5} className="py-20 text-center font-bold text-slate-300">{t("reception.table_content.no_data")}</td></tr>
                ) : bookings.map(b => (
                  <tr key={b.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                       <div className="font-bold text-[var(--primary)]">{b.guestName}</div>
                       <div className="text-[11px] font-semibold text-slate-400">{b.guestPhone}</div>
                    </td>
                    <td className="py-4 px-6">
                       <div className="font-bold text-slate-600 outline-none">{new Date(b.checkInDate).toLocaleDateString()} ➔ {new Date(b.checkOutDate).toLocaleDateString()}</div>
                       <div className="text-[10px] font-black text-slate-400 uppercase mt-0.5">{nights(b.checkInDate,b.checkOutDate)} {t("reception.card.nights")}</div>
                    </td>
                    <td className="py-4 px-6">
                       <div className="font-bold text-slate-600">{b.roomType?.name || "-"}</div>
                       <div className="text-[11px] font-semibold text-slate-400">{b.roomCount} {t("common.unit")} {t("common.room")}</div>
                    </td>
                    <td className="py-4 px-6 text-right">
                       <div className="font-black text-slate-800">{Number(b.totalAmount).toLocaleString()} {t("common.currency")}</div>
                       <div className={`text-[10px] font-black uppercase mt-0.5 ${b.paidAmount >= b.totalAmount ? 'text-green-600' : 'text-amber-600'}`}>
                          {b.paidAmount >= b.totalAmount ? t("reception.table_content.total_paid") : `${t("reception.table_content.debt")}: ${(b.totalAmount - b.paidAmount).toLocaleString()} ${t("common.currency")}`}
                       </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                       <span className={`text-[10px] font-black uppercase px-2 py-1 rounded inline-block min-w-[100px] border ${
                          b.status === "CHECKED_IN" ? 'bg-green-50 text-green-600 border-green-100' : 
                          b.status === "PENDING" ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                          'bg-slate-100 text-slate-500 border-slate-200'
                       }`}>
                          {t(`reception.statuses.${b.status}`)}
                       </span>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between px-2">
             <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t("reception.pagination.showing", { total, count: bookings.length })}</p>
             <div className="flex items-center gap-2">
                <button disabled={page === 1} onClick={()=>setPage(p=>p-1)} className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50"><ChevronLeft size={16}/></button>
                <div className="text-[12px] font-black px-4">{t("reception.pagination.page")} {page} / {maxPage}</div>
                <button disabled={page === maxPage} onClick={()=>setPage(p=>p+1)} className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50"><ChevronRight size={16}/></button>
             </div>
          </div>
        </div>
      )}

      {/* New Booking Modal */}
      {adding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg h-full rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-500">
             <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                   <h3 className="text-xl font-black text-[var(--primary)] flex items-center gap-2"><CalendarCheck className="text-[var(--accent)]"/> {t("reception.modal.title")}</h3>
                   <p className="text-[12px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{t("reception.modal.subtitle")}</p>
                </div>
                <button onClick={()=>setAdding(false)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-all"><X size={20}/></button>
             </div>

             <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
                 <div className="space-y-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                       <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><User size={14}/> {t("reception.modal.guest_info")}</h4>
                       <button type="button" onClick={() => setForm({...form, guests: [...form.guests, { firstName: "", lastName: "", passportData: "", nationality: "Uzbekistan", birthDate: "", isChild: false }]})} 
                          className="text-[11px] font-black text-[var(--accent)] hover:underline uppercase flex items-center gap-1">
                          <Plus size={12}/> {t("reception.modal.add_guest")}
                       </button>
                    </div>

                    {form.guests.map((g, idx) => (
                      <div key={idx} className="relative p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                         {idx > 0 && (
                            <button type="button" onClick={() => setForm({...form, guests: form.guests.filter((_, i) => i !== idx)})} 
                               className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors">
                               <XCircle size={16}/>
                            </button>
                         )}
                         <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1 bg-white inline-block px-2 py-0.5 rounded border border-slate-100">{t("reception.modal.guest_index", { index: idx + 1 })}</div>
                         
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 ml-1">{t("reception.modal.name")}</label>
                               <input required value={g.firstName} onChange={e => {
                                  const list = [...form.guests];
                                  list[idx].firstName = e.target.value;
                                  setForm({...form, guests: list});
                               }} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)] transition-all"/>
                            </div>
                            <div>
                               <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 ml-1">{t("hr.modal.last_name")}</label>
                               <input value={g.lastName || ""} onChange={e => {
                                  const list = [...form.guests];
                                  list[idx].lastName = e.target.value;
                                  setForm({...form, guests: list});
                               }} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)] transition-all"/>
                            </div>
                            <div className="col-span-2 flex items-center gap-3 py-1">
                               <button type="button" onClick={() => {
                                  const list = [...form.guests];
                                  list[idx].isChild = !list[idx].isChild;
                                  setForm({...form, guests: list});
                               }} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-black transition-all ${g.isChild ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                                  {g.isChild ? <CheckCircle2 size={14}/> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300"/>}
                                  {t("reception.modal.is_child")}
                               </button>
                               <span className="text-[10px] font-bold text-slate-400 leading-tight">
                                  {g.isChild ? "Bolalar uchun metirka ma'lumoti kiritiladi" : "Pasport seriyasi va raqamini kiriting"}
                               </span>
                            </div>
                            <div>
                               <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 ml-1">{g.isChild ? "Metirka / Pasport" : t("reception.modal.passport_series") + " + " + t("reception.modal.passport_number")}</label>
                               <input placeholder={g.isChild ? "I-JS 123456" : "AA 1234567"} value={g.passportData || ""} onChange={e => {
                                  const list = [...form.guests];
                                  list[idx].passportData = e.target.value;
                                  setForm({...form, guests: list});
                               }} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)] transition-all"/>
                            </div>
                            <div>
                               <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 ml-1">{t("reception.modal.nationality")}</label>
                               <input value={g.nationality || ""} onChange={e => {
                                  const list = [...form.guests];
                                  list[idx].nationality = e.target.value;
                                  setForm({...form, guests: list});
                               }} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)] transition-all"/>
                            </div>
                            <div className="col-span-2">
                               <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 ml-1">{t("reception.modal.birth_date")}</label>
                               <input type="date" value={g.birthDate || ""} onChange={e => {
                                  const list = [...form.guests];
                                  list[idx].birthDate = e.target.value;
                                  setForm({...form, guests: list});
                               }} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)] transition-all"/>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                   <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><BedDouble size={14}/> {t("reception.modal.stay_info")}</h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                         <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 ml-1">{t("reception.modal.room_type")}</label>
                         <select required value={form.roomTypeId} onChange={e=>setForm({...form, roomTypeId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)] bg-white">
                            <option value="">{t("common.select_placeholder")}</option>
                            {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name} ({Number(rt.basePrice).toLocaleString()} {t("common.currency")})</option>)}
                         </select>
                      </div>
                      <div>
                         <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 ml-1">{t("reception.modal.check_in")}</label>
                         <input type="date" required value={form.checkInDate} onChange={e=>setForm({...form, checkInDate: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)]"/>
                      </div>
                      <div>
                         <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 ml-1">{t("reception.modal.check_out")}</label>
                         <input type="date" required value={form.checkOutDate} onChange={e=>setForm({...form, checkOutDate: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)]"/>
                      </div>
                      <div className="col-span-2">
                         <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 ml-1">{t("reception.modal.room_count")}</label>
                         <input type="number" min={1} value={form.roomCount} onChange={e=>setForm({...form, roomCount: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-[var(--accent)]"/>
                      </div>
                   </div>

                   {/* Specific Room Selection */}
                   {(form.roomTypeId && form.checkInDate && form.checkOutDate) && (
                      <div className="space-y-3 pt-2">
                         <label className="block text-[11px] font-black text-slate-500 uppercase ml-1">Aniq xona raqamini tanlash (Ixtiyoriy)</label>
                         <div className="flex flex-wrap gap-2">
                            {availPhyRooms.length === 0 && !availLoading && <p className="text-[10px] font-bold text-red-400 italic">Tanlangan kunda bo'sh xonalar yo'q</p>}
                            {availPhyRooms.map(r => (
                               <button key={r.id} type="button" 
                                  onClick={() => {
                                     if (selectedRoomIds.includes(r.id)) {
                                        setSelectedRoomIds(prev => prev.filter(id => id !== r.id));
                                     } else if (selectedRoomIds.length < form.roomCount) {
                                        setSelectedRoomIds(prev => [...prev, r.id]);
                                     }
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-[12px] font-black transition-all ${selectedRoomIds.includes(r.id) ? 'bg-[var(--accent)] text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                  {r.roomNumber}
                               </button>
                            ))}
                         </div>
                         {selectedRoomIds.length > 0 && (
                            <p className="text-[10px] font-bold text-[var(--accent)]">{selectedRoomIds.length} ta xona tanlandi</p>
                         )}
                      </div>
                   )}

                   {/* Availability Status */}
                   {(form.roomTypeId && form.checkInDate && form.checkOutDate) && (
                      <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${availLoading ? 'bg-slate-50 border-slate-200' : avail?.free && avail.free >= form.roomCount ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                         {availLoading ? <Loader2 size={18} className="animate-spin text-slate-400 mt-0.5"/> : avail?.free && avail.free >= form.roomCount ? <Verified className="text-green-600 mt-0.5" size={18}/> : <XCircle className="text-red-600 mt-0.5" size={18}/>}
                         <div>
                            <p className={`text-[12px] font-black uppercase ${availLoading ? 'text-slate-500' : avail?.free && avail.free >= form.roomCount ? 'text-green-700' : 'text-red-700'}`}>
                               {availLoading ? t("reception.modal.avail_checking") : avail?.free && avail.free >= form.roomCount ? t("reception.modal.avail_ok", { count: avail.free }) : t("reception.modal.avail_fail")}
                            </p>
                            {!availLoading && avail && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{t("reception.modal.avail_stats", { total: avail.total, reserved: avail.reserved })}</p>}
                         </div>
                      </div>
                   )}
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                   <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Send size={14}/> {t("reception.modal.payment_info")}</h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 ml-1">{t("reception.modal.total_amount")}</label>
                         <input type="number" required value={form.totalAmount} onChange={e=>setForm({...form, totalAmount: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm outline-none focus:border-[var(--accent)]"/>
                      </div>
                      <div>
                         <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 ml-1">{t("reception.modal.paid_amount")}</label>
                         <input type="number" value={form.paidAmount} onChange={e=>setForm({...form, paidAmount: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm outline-none focus:border-[var(--accent)] text-green-700"/>
                      </div>
                   </div>
                </div>
             </form>

             <div className="p-8 bg-slate-50 border-t border-slate-100">
                <button type="submit" onClick={handleSubmit} disabled={saving || availLoading || !avail || avail.free < form.roomCount} className="w-full py-4 bg-[var(--primary)] text-white text-[14px] font-black rounded-2xl hover:bg-[var(--secondary)] transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 disabled:opacity-50 disabled:grayscale">
                   {saving ? <Loader2 size={18} className="animate-spin"/> : <Verified size={18}/>} {t("reception.modal.confirm_btn")}
                </button>
                <p className="text-[10px] text-center text-slate-400 font-bold mt-4 uppercase tracking-tighter flex items-center justify-center gap-1">
                   <Info size={12}/> {t("reception.modal.info_note")}
                </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
