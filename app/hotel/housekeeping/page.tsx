"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Brush, Wrench, CheckCircle2, Clock, Plus,
  ShieldCheck, Loader2, AlertTriangle, AlertCircle, RefreshCw, 
  User, Package, Minus, Trash2
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface Room {
  id: string;
  roomNumber: string;
  status: string;
  floor: number;
  roomType: { name: string };
}

interface Staff {
  id: string;
  firstName: string;
  lastName: string | null;
  role: string;
}

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
}

interface Task {
  id: string;
  physicalRoom: Room;
  staff: Staff | null;
  assigneeName: string | null;
  taskType: "CLEANING" | "MAINTENANCE" | "INSPECTION";
  status: "PENDING" | "IN_PROGRESS" | "DONE" | "VERIFIED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  notes: string | null;
  createdAt: string;
}

const TYPE_COLORS = {
   CLEANING:    { label: "housekeeping.types.CLEANING", icon: Brush, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
   MAINTENANCE: { label: "housekeeping.types.MAINTENANCE", icon: Wrench, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
   INSPECTION:  { label: "housekeeping.types.INSPECTION", icon: ShieldCheck, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
};

const PRIORITY_LABELS = { LOW: "housekeeping.priorities.LOW", NORMAL: "housekeeping.priorities.NORMAL", HIGH: "housekeeping.priorities.HIGH", URGENT: "housekeeping.priorities.URGENT" };

export default function HousekeepingPage() {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [finishingTask, setFinishingTask] = useState<Task | null>(null);

  // Form State
  const [formData, setFormData] = useState({ physicalRoomId: "", staffId: "", taskType: "CLEANING" as any, priority: "NORMAL", notes: "" });
  const [consumptions, setConsumptions] = useState<{ itemId: string, quantity: number }[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [hRes, uRes, invRes] = await Promise.all([
        fetch("/api/hotel/housekeeping"),
        fetch("/api/user/me"),
        fetch("/api/hotel/inventory")
      ]);

      const hData = await hRes.json();
      if (hRes.ok) { 
        setTasks(hData.tasks); 
        setRooms(hData.rooms); 
        setStaffList(hData.staffList || []);
      }

      const uData = await uRes.json();
      if (uRes.ok) setCurrentUser(uData);

      const invData = await invRes.json();
      if (invRes.ok) {
        // Handle both object {items: []} and direct array [] for compatibility
        const items = Array.isArray(invData) ? invData : (invData.items || []);
        setInventory(items);
      }
    } catch { 
      toast.error(t("housekeeping.toasts.update_error")); 
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const isManager = currentUser?.role === "hotel_manager" || currentUser?.role === "admin";
  const userRole = currentUser?.hotelStaff?.role || (isManager ? "MANAGER" : "STAFF");
  const isCleaner = userRole === "CLEANER";

  async function updateStatus(id: string, newStatus: string, selectedConsumptions: any[] = []) {
     try {
       const res = await fetch(`/api/hotel/housekeeping/${id}`, {
          method: "PATCH",
          headers: { "Content-Type" : "application/json" },
          body: JSON.stringify({ status: newStatus, consumptions: selectedConsumptions })
       });
       if(res.ok) { 
         toast.success(t("housekeeping.toasts.update_success")); 
         setFinishingTask(null);
         setConsumptions([]);
         void load(); 
       }
     } catch { toast.error(t("housekeeping.toasts.update_error")); }
  }

  async function handleDelete(id: string) {
    if(!isManager) return toast.error(t("housekeeping.toasts.no_permission"));
    if(!confirm(t("housekeeping.toasts.delete_confirm"))) return;
    try {
      const res = await fetch(`/api/hotel/housekeeping/${id}`, { method: "DELETE" });
      if(res.ok) { toast.success(t("housekeeping.toasts.delete_success")); void load(); }
    } catch { toast.error(t("housekeeping.toasts.update_error")); }
  }

  async function handleAssign(e: React.FormEvent) {
     e.preventDefault();
     if(!isManager) return toast.error(t("housekeeping.toasts.no_permission"));
     try {
       const res = await fetch("/api/hotel/housekeeping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
       });
       if(res.ok) {
          toast.success(t("housekeeping.toasts.assign_success"));
          setAssigning(false);
          setFormData({ physicalRoomId: "", staffId: "", taskType: "CLEANING", priority: "NORMAL", notes: "" });
          void load();
       } else { toast.error(t("housekeeping.toasts.assign_error")); }
     } catch { toast.error(t("common.error")); }
  }

  const columns = [
    { id: "PENDING", title: t("housekeeping.columns.pending"), activeTasks: tasks.filter(t => t.status === "PENDING") },
    { id: "IN_PROGRESS", title: t("housekeeping.columns.in_progress"), activeTasks: tasks.filter(t => t.status === "IN_PROGRESS") },
    { id: "DONE", title: t("housekeeping.columns.done"), activeTasks: tasks.filter(t => t.status === "DONE" || t.status === "VERIFIED") }
  ];

  const addConsumption = (itemId: string) => {
    const existing = consumptions.find(c => c.itemId === itemId);
    if (existing) {
      setConsumptions(consumptions.map(c => c.itemId === itemId ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setConsumptions([...consumptions, { itemId, quantity: 1 }]);
    }
  };

  const removeConsumption = (itemId: string) => {
    setConsumptions(consumptions.filter(c => c.itemId !== itemId));
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight flex items-center gap-2">
             <Brush size={24} className="text-[var(--accent)]"/> {t("housekeeping.title")}
          </h1>
          <p className="text-[13px] font-semibold text-slate-500 mt-1">
             {isCleaner ? t("housekeeping.subtitle_cleaner") : t("housekeeping.subtitle_manager")}
          </p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => void load()} className="p-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
           </button>
           {isManager && (
             <button onClick={() => setAssigning(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-[13px] font-bold rounded-lg hover:bg-[var(--secondary)] transition-colors shadow-sm">
                <Plus size={16}/> {t("housekeeping.assign_task")}
             </button>
           )}
        </div>
      </div>

      {loading ? (
         <div className="py-20 text-center text-slate-400">
            <Loader2 size={32} className="animate-spin mx-auto mb-4"/>
            <p className="font-bold uppercase tracking-widest text-xs">{t("housekeeping.loading")}</p>
         </div>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {columns.map(col => (
               <div key={col.id} className="bg-slate-100/40 border border-slate-200/60 rounded-2xl p-4 min-h-[600px]">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 pb-3">
                     <h3 className="font-extrabold text-[var(--primary)] text-[13px] uppercase tracking-wider">{col.title}</h3>
                     <span className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-[11px] font-black">{col.activeTasks.length}</span>
                  </div>
                  
                  <div className="space-y-3">
                     {col.activeTasks.map(task => {
                        const style = TYPE_COLORS[task.taskType] || TYPE_COLORS.CLEANING;
                        return (
                           <div key={task.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                              {(task.priority === "HIGH" || task.priority === "URGENT") && (
                                <div className="absolute top-0 right-0 w-8 h-8 bg-red-500 transform rotate-45 translate-x-4 -translate-y-4 shadow-sm" />
                              )}
                              
                              <div className="flex justify-between items-start mb-3">
                                 <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1 ${style.bg} ${style.color} border ${style.border}`}>
                                    <style.icon size={10}/> {t(style.label)}
                                 </div>
                                 <div className={`text-[10px] font-black uppercase flex items-center gap-1 ${task.priority === 'URGENT' ? 'text-red-500' : 'text-slate-400'}`}>
                                    {t(PRIORITY_LABELS[task.priority])}
                                    {task.priority === "URGENT" && <AlertTriangle size={12} className="animate-pulse"/>}
                                 </div>
                              </div>
                              
                              <div className="font-black text-[18px] text-[var(--primary)] leading-tight mb-1">{t("housekeeping.task_card.room")} {task.physicalRoom?.roomNumber || "?"}</div>
                              <div className="text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-wide">{task.physicalRoom?.roomType?.name}</div>
                              
                              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4">
                                 <div className="flex items-center gap-2 mb-1.5">
                                    <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400"><User size={12}/></div>
                                    <div className="text-[12px] font-bold text-slate-700">{task.staff ? `${task.staff.firstName} ${task.staff.lastName || ""}` : t("housekeeping.task_card.unassigned")}</div>
                                 </div>
                                 {task.notes && <div className="text-[11px] text-slate-500 font-medium italic mt-1 leading-relaxed line-clamp-2">"{task.notes}"</div>}
                              </div>

                              <div className="flex gap-2">
                                 {task.status === "PENDING" && (
                                    <button onClick={() => updateStatus(task.id, "IN_PROGRESS")} className="flex-1 py-2.5 rounded-lg bg-[var(--bg-light-blue)] text-[var(--accent)] text-[11px] font-black uppercase hover:brightness-95 transition-all">{t("housekeeping.task_card.start_btn")}</button>
                                 )}
                                 {task.status === "IN_PROGRESS" && (
                                    <button onClick={() => setFinishingTask(task)} className="flex-1 py-2.5 rounded-lg bg-green-600 text-white text-[11px] font-black uppercase hover:bg-green-700 transition-all flex items-center justify-center gap-1 shadow-sm"><CheckCircle2 size={13}/> {t("housekeeping.task_card.finish_btn")}</button>
                                 )}
                                 {(task.status === "DONE" || task.status === "VERIFIED") && (
                                    <div className="w-full text-center text-[10px] font-black text-slate-400 border border-slate-100 rounded-lg py-2.5 uppercase bg-slate-50/50">{t("housekeeping.task_card.closed")}</div>
                                 )}
                                 {(task.status === "PENDING" || task.status === "IN_PROGRESS") && isManager && (
                                    <button onClick={() => handleDelete(task.id)} className="px-3 py-2.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14}/></button>
                                 )}
                              </div>
                           </div>
                        )
                     })}
                     {col.activeTasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                           <Clock size={32} strokeWidth={1} className="mb-2 opacity-50"/>
                           <p className="text-[11px] font-bold uppercase tracking-widest">{t("housekeeping.task_card.no_tasks")}</p>
                        </div>
                     )}
                  </div>
               </div>
            ))}
         </div>
      )}

      {/* Assign Modal */}
      {assigning && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-black text-[var(--primary)] text-[16px] uppercase tracking-tight">{t("housekeeping.modal_assign.title")}</h3>
                  <button onClick={() => setAssigning(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-xl shadow-sm border border-slate-100"><XIcon size={16} /></button>
               </div>
               <form onSubmit={handleAssign} className="p-6 space-y-5">
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">{t("housekeeping.modal_assign.select_room")}</label>
                     <select required value={formData.physicalRoomId} onChange={e=>setFormData({...formData, physicalRoomId: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50/50 outline-none focus:border-[var(--accent)] transition-all">
                        <option value="">{t("housekeeping.modal_assign.select_room_placeholder")}</option>
                        {rooms.map(r => <option key={r.id} value={r.id}>{r.roomNumber} - {r.roomType.name} ({r.status})</option>)}
                     </select>
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">{t("housekeeping.modal_assign.select_staff")}</label>
                     <select required value={formData.staffId} onChange={e=>setFormData({...formData, staffId: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50/50 outline-none focus:border-[var(--accent)] transition-all">
                        <option value="">{t("housekeeping.modal_assign.select_staff_placeholder")}</option>
                        {staffList.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName || ""} ({s.role})</option>)}
                     </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">{t("housekeeping.modal_assign.type")}</label>
                        <select value={formData.taskType} onChange={e=>setFormData({...formData, taskType: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50/50 outline-none focus:border-[var(--accent)]">
                           <option value="CLEANING">{t("housekeeping.types.CLEANING")}</option>
                           <option value="MAINTENANCE">{t("housekeeping.types.MAINTENANCE")}</option>
                           <option value="INSPECTION">{t("housekeeping.types.INSPECTION")}</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">{t("housekeeping.modal_assign.priority")}</label>
                        <select value={formData.priority} onChange={e=>setFormData({...formData, priority: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50/50 outline-none focus:border-[var(--accent)]">
                           <option value="LOW">{t("housekeeping.priorities.LOW")}</option>
                           <option value="NORMAL">{t("housekeeping.priorities.NORMAL")}</option>
                           <option value="HIGH">{t("housekeeping.priorities.HIGH")}</option>
                           <option value="URGENT">{t("housekeeping.priorities.URGENT")}</option>
                        </select>
                     </div>
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">{t("housekeeping.modal_assign.notes")}</label>
                     <textarea value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} rows={2} placeholder={t("housekeeping.modal_assign.notes_placeholder")} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50/50 outline-none focus:border-[var(--accent)] resize-none" />
                  </div>
                  <button type="submit" className="w-full py-4 bg-[var(--primary)] text-white text-[13px] font-black uppercase rounded-xl hover:bg-[var(--secondary)] transition-all shadow-lg active:scale-[0.98]">
                    {t("housekeeping.modal_assign.submit")}
                  </button>
               </form>
            </div>
         </div>
      )}

      {/* Finishing / Consumption Modal */}
      {finishingTask && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
               <div className="p-6 border-b border-slate-100 bg-green-50/50 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-green-600 shadow-sm border border-green-100"><CheckCircle2 size={24}/></div>
                  <div>
                     <h3 className="font-black text-[var(--primary)] text-[17px] leading-tight tracking-tight">{t("housekeeping.task_card.room")} {finishingTask.physicalRoom.roomNumber} - {t("housekeeping.modal_finish.title")}</h3>
                     <p className="text-[12px] font-bold text-slate-500 mt-0.5 uppercase tracking-wide">{t("housekeeping.modal_finish.subtitle")}</p>
                  </div>
               </div>
               
               <div className="p-6 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-4">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {inventory.map(item => {
                           const count = consumptions.find(c => c.itemId === item.id)?.quantity || 0;
                           return (
                              <div key={item.id} className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${count > 0 ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                                 <div className="min-w-0">
                                    <div className="text-[13px] font-black text-slate-800 truncate">{item.name}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.unit}</div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    {count > 0 && (
                                       <>
                                          <button onClick={() => setConsumptions(consumptions.map(c => c.itemId === item.id ? { ...c, quantity: Math.max(0, c.quantity - 1) } : c).filter(c => c.quantity > 0))} className="w-7 h-7 rounded-lg bg-white border border-blue-200 text-blue-600 flex items-center justify-center shadow-sm"><Minus size={14}/></button>
                                          <span className="text-[14px] font-black text-blue-700 min-w-[20px] text-center">{count}</span>
                                       </>
                                    )}
                                    <button onClick={() => addConsumption(item.id)} className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 flex items-center justify-center shadow-sm"><Plus size={14}/></button>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                     {inventory.length === 0 && <p className="text-center py-10 text-slate-400 font-bold text-xs uppercase tracking-widest">{t("housekeeping.modal_finish.no_inventory")}</p>}
                  </div>

                  {/* Summary Area */}
                  {consumptions.length > 0 && (
                     <div className="mt-8 bg-slate-50 rounded-2xl p-5 border border-slate-100 border-dashed">
                        <div className="text-[11px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2"><Package size={14}/> {t("housekeeping.modal_finish.summary")}</div>
                        <div className="flex flex-wrap gap-2">
                           {consumptions.map(c => {
                              const name = inventory.find(i => i.id === c.itemId)?.name;
                              return (
                                 <div key={c.itemId} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[12px] font-bold text-slate-700 shadow-sm flex items-center gap-2">
                                    {name} <span className="text-blue-600">x{c.quantity}</span>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  )}
               </div>

               <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                  <button onClick={() => setFinishingTask(null)} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 text-[13px] font-black uppercase rounded-xl hover:bg-slate-50 transition-all flex-1">{t("housekeeping.modal_finish.back")}</button>
                  <button onClick={() => updateStatus(finishingTask.id, "DONE", consumptions)} className="px-8 py-3 bg-green-600 text-white text-[13px] font-black uppercase rounded-xl hover:bg-green-700 transition-all shadow-lg flex-[2] flex items-center justify-center gap-2">
                     <CheckCircle2 size={16}/> {t("housekeeping.modal_finish.confirm")}
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}

function XIcon({ size }: { size: number }) {
   return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
}
