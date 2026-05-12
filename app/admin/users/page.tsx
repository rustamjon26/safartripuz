"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, UserPlus, Shield, Mail, Phone, Loader2, MoreVertical, Edit3, Trash2 } from "lucide-react";

type Role =
  | "super_admin"
  | "admin"
  | "user"
  | "taxi"
  | "taxi_partner"
  | "hotel_manager"
  | "guide"
  | "restaurant_manager"
  | "home_stay_partner";

type UserRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: Role;
  isBlocked: boolean;
  createdAt: string;
  partnerProfile: null | { id: string; type: string; status: string };
};

/** Rol tanlash — asosiy variantlar (tartib va matnlar admin talabiga mos) */
const ROLE_SELECT_OPTIONS: { value: Role; label: string }[] = [
  { value: "user", label: "Foydalanuvchi" },
  { value: "taxi", label: "Taxi Hamkor" },
  { value: "hotel_manager", label: "Mehmonxona" },
  { value: "home_stay_partner", label: "Uy Mehmonxona" },
  { value: "guide", label: "Gid" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  user: "Foydalanuvchi",
  taxi: "Taxi Hamkor",
  taxi_partner: "Taxi Partner",
  hotel_manager: "Mehmonxona",
  guide: "Gid",
  restaurant_manager: "Restoran",
  home_stay_partner: "Uy Mehmonxona",
};

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [passwordUser, setPasswordUser] = useState<UserRow | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // New User State
  const [newUser, setNewUser] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "user" as Role,
    password: "",
  });

  const query = useMemo(() => q.trim(), [q]);

  const roleSelectOptions = useMemo(() => {
    const current = isAddingUser ? newUser.role : editingUser?.role;
    const base = ROLE_SELECT_OPTIONS;
    if (current && !base.some((o) => o.value === current)) {
      return [...base, { value: current, label: ROLE_LABELS[current] ?? current }];
    }
    return base;
  }, [isAddingUser, newUser.role, editingUser?.role]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
      const data = (await res.json()) as { items: UserRow[]; total: number; message?: string };
      if (!res.ok) throw new Error(data.message || "Load error");
      setItems(data.items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [query]);

  async function handleAddUser() {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Xatolik");

      toast.success("Yangi foydalanuvchi qo'shildi");
      setIsAddingUser(false);
      setNewUser({ first_name: "", last_name: "", email: "", phone: "", role: "user", password: "" });
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(userId: string, payload: Partial<UserRow>) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Xatolik");

      if (typeof payload.role === "string") {
        if (payload.role === "home_stay_partner") {
          toast.success(
            "Rol o'zgartirildi — foydalanuvchi endi Uy Mehmonxona paneliga kira oladi: /homestay-partner/dashboard",
          );
        } else {
          toast.success("Rol o'zgartirildi va kerakli yozuvlar avtomatik yaratildi");
        }
        if (payload.role === "hotel_manager") {
          toast.info("Mehmonxona ma'lumotlarini to'ldirish uchun /hotel/profile sahifasiga o'tsin");
        }
      } else {
        toast.success("Muvaffaqiyatli yangilandi");
      }
      setItems((prev) => prev.map((u) => (u.id === userId ? { ...u, ...payload } : u)));
      setEditingUser(null);
      if (typeof payload.role === "string") {
        void load();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleChangePassword() {
    if (!passwordUser) return;
    if (newPassword.length < 6) return toast.error("Parol kamida 6 ta belgi bo'lsin");

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${passwordUser.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) throw new Error("Parolni o'zgartirib bo'lmadi");

      toast.success("Parol muvaffaqiyatli o'zgartirildi");
      setPasswordUser(null);
      setNewPassword("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Haqiqatan ham bu foydalanuvchini o'chirmoqchimisiz?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("O'chirib bo'lmadi (Faqat Super Admin ruxsati kerak)");
      toast.success("O'chirildi");
      setItems((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  }

  return (
    <div className="space-y-6" onClick={() => setActiveMenuId(null)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Foydalanuvchilar</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">Tizim a'zolarini boshqarish, bloklash va parollarni tiklash</p>
        </div>
        <button 
          onClick={() => setIsAddingUser(true)}
          className="adm-btn adm-btn-primary shadow-lg shadow-slate-900/20"
        >
           <UserPlus size={16} />
           Yangi Foydalanuvchi
        </button>
      </div>

      {/* Toolbar */}
      <div className="adm-card border-none shadow-xl shadow-slate-200/50 p-6 bg-white overflow-visible">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ism, email yoki telefon raqami..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
            />
          </div>
          <button className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-sm font-black shadow-lg shadow-slate-900/10 active:scale-95 transition-all" onClick={() => void load()}>
             Qidirish
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-visible">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="w-12"></th>
                <th>Foydalanuvchi</th>
                <th>Aloqa</th>
                <th>Holat</th>
                <th className="min-w-[180px]">Roli</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 size={32} className="animate-spin mx-auto text-slate-300" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-400">
                    Hech kim topilmadi
                  </td>
                </tr>
              ) : (
                items.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="pl-6 py-4">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs uppercase transition-all ${u.isBlocked ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-900 group-hover:text-white'}`}>
                          {u.first_name?.[0]}{u.last_name?.[0]}
                       </div>
                    </td>
                    <td className="py-4">
                       <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900">{u.first_name} {u.last_name}</span>
                          {u.isBlocked && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[9px] font-black uppercase tracking-tighter">Bloklangan</span>
                          )}
                       </div>
                       <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-0.5">ID: {u.id.slice(-8)}</div>
                    </td>
                    <td className="py-4">
                       <div className="flex flex-col gap-1">
                          <div className="text-xs font-bold text-slate-500">{u.email}</div>
                          <div className="text-xs font-bold text-slate-300">{u.phone}</div>
                       </div>
                    </td>
                    <td className="py-4 text-xs font-bold">
                        {u.partnerProfile ? (
                          u.role === "home_stay_partner" ? (
                            <span className="text-purple-600 uppercase text-[10px]">Uy Mehmonxona</span>
                          ) : (
                            <span className="text-teal-600 uppercase text-[10px]">{u.partnerProfile.type}</span>
                          )
                        ) : u.role === "home_stay_partner" ? (
                          <span className="text-purple-400 uppercase text-[10px]">Uy Mehmonxona</span>
                        ) : (
                          <span className="text-slate-300 uppercase text-[10px]">Oddiy</span>
                        )}
                    </td>
                    <td className="py-4">
                        <div className="text-xs font-black text-slate-900 border border-slate-100 bg-slate-50 px-3 py-2 rounded-xl inline-block min-w-[140px]">
                           {ROLE_LABELS[u.role]}
                        </div>
                    </td>
                    <td className="pr-6 py-4 text-right relative">
                       <button 
                         className="p-2 rounded-xl text-slate-300 hover:text-slate-900 hover:bg-slate-100 transition-all"
                         onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === u.id ? null : u.id); }}
                       >
                          <MoreVertical size={18} />
                       </button>
                       
                       {activeMenuId === u.id && (
                         <div className="absolute right-6 top-14 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-2 animate-in fade-in zoom-in duration-150">
                            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all" onClick={() => setEditingUser(u)}>
                               <Edit3 size={16} /> Tahrirlash
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all" onClick={() => setPasswordUser(u)}>
                               <Shield size={16} /> Parolni yangilash
                            </button>
                            <button 
                               className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${u.isBlocked ? 'text-teal-600 hover:bg-teal-50' : 'text-orange-600 hover:bg-orange-50'}`}
                               onClick={() => void handleUpdate(u.id, { isBlocked: !u.isBlocked })}
                            >
                               <Shield size={16} /> {u.isBlocked ? "Aktivlashtirish" : "Bloklash"}
                            </button>
                            <div className="h-px bg-slate-50 my-1 mx-2" />
                            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all" onClick={() => void handleDelete(u.id)}>
                               <Trash2 size={16} /> O'chirish
                            </button>
                         </div>
                       )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(editingUser || isAddingUser) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-[32px] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-black text-slate-900 mb-6">
                 {isAddingUser ? "Yangi foydalanuvchi qo'shish" : "Foydalanuvchini tahrirlash"}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Ism</label>
                    <input 
                      className="adm-input" 
                      value={isAddingUser ? newUser.first_name : editingUser?.first_name} 
                      onChange={(e) => isAddingUser ? setNewUser({...newUser, first_name: e.target.value}) : setEditingUser({...editingUser!, first_name: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Familiya</label>
                    <input 
                      className="adm-input" 
                      value={isAddingUser ? newUser.last_name : editingUser?.last_name} 
                      onChange={(e) => isAddingUser ? setNewUser({...newUser, last_name: e.target.value}) : setEditingUser({...editingUser!, last_name: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Email</label>
                    <input 
                      className="adm-input" 
                      value={isAddingUser ? newUser.email : editingUser?.email}
                      onChange={(e) => isAddingUser ? setNewUser({...newUser, email: e.target.value}) : setEditingUser({...editingUser!, email: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Telefon</label>
                    <input 
                      className="adm-input" 
                      value={isAddingUser ? newUser.phone : editingUser?.phone}
                      onChange={(e) => isAddingUser ? setNewUser({...newUser, phone: e.target.value}) : setEditingUser({...editingUser!, phone: e.target.value})}
                    />
                 </div>
                 <div className="sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Tizimdagi Rollar</label>
                    <select 
                      className="adm-input"
                      value={isAddingUser ? newUser.role : editingUser?.role}
                      onChange={(e) => isAddingUser ? setNewUser({...newUser, role: e.target.value as Role}) : setEditingUser({...editingUser!, role: e.target.value as Role})}
                    >
                      {roleSelectOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                 </div>
                 {isAddingUser && (
                   <div className="sm:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Parol</label>
                      <input 
                        type="password"
                        className="adm-input" 
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        placeholder="••••••••"
                      />
                   </div>
                 )}
              </div>

              <div className="flex gap-3 mt-8">
                 <button 
                  className="flex-1 py-4 text-sm font-black text-slate-400 hover:text-slate-900 transition-colors" 
                  onClick={() => isAddingUser ? setIsAddingUser(false) : setEditingUser(null)}
                 >
                   Bekor qilish
                 </button>
                 <button 
                   className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-sm font-black shadow-lg shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-50"
                   disabled={isSubmitting}
                   onClick={() => isAddingUser ? void handleAddUser() : void handleUpdate(editingUser!.id, editingUser!)}
                 >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Saqlash"}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Password Modal */}
      {passwordUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-300">
              <h3 className="text-2xl font-black text-slate-900 mb-2">Parolni o'zgartirish</h3>
              <p className="text-sm font-bold text-slate-400 mb-6">{passwordUser.first_name} uchun yangi parol o'rnating</p>
              
              <input 
                type="text"
                placeholder="Yangi parol (kamida 6 ta belgi)"
                className="adm-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              
              <div className="flex gap-3 mt-8">
                 <button className="flex-1 py-4 text-sm font-black text-slate-400 hover:text-slate-900 transition-colors" onClick={() => setPasswordUser(null)}>Bekor qilish</button>
                 <button 
                   className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-sm font-black shadow-lg shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-50"
                   disabled={isSubmitting}
                   onClick={() => void handleChangePassword()}
                 >
                    {isSubmitting ? "Saqlanmoqda..." : "Yangilash"}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
