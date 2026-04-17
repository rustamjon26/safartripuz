"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Search, Filter, Loader2, ShieldCheck, Mail, Phone, Calendar } from "lucide-react";

type PartnerRow = {
  id: string;
  type: string;
  status: "pending" | "approved" | "rejected";
  displayName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  meta?: any;
  note: string | null;
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

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
  pending: { label: "Kutilmoqda", cls: "bg-amber-50 text-amber-600 ring-amber-100", icon: Clock },
  approved: { label: "Tasdiqlangan", cls: "bg-emerald-50 text-emerald-600 ring-emerald-100", icon: CheckCircle },
  rejected: { label: "Rad etilgan", cls: "bg-rose-50 text-rose-600 ring-rose-100", icon: XCircle },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AdminApprovalsPage() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [items, setItems] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const q = useMemo(() => status, [status]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/partners?status=${q}`);
      const data = (await res.json()) as {
        items: PartnerRow[];
        total: number;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message || "Load error");
      setItems(data.items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [q]);

  async function decide(id: string, decision: "approve" | "reject") {
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/partners/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: note.trim() || undefined }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Action error");
      toast.success(decision === "approve" ? "Hamkor tasdiqlandi" : "Hamkor rad etildi");
      setNote("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hamkorlarni Tasdiqlash</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">Yangi hamkorlar arizalarini ko&apos;rib chiqish va qaror qabul qilish</p>
        </div>
      </div>

      {/* Stats/Filters Card */}
      <div className="adm-card border-none shadow-xl shadow-slate-200/50 p-6 bg-white overflow-visible">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-1 w-full bg-slate-50 p-4 rounded-2xl border border-slate-100">
             <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-slate-400" />
                <div className="flex-1">
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin Izohi</div>
                   <input
                     value={note}
                     onChange={(e) => setNote(e.target.value)}
                     placeholder="Qaror uchun izoh yozishingiz mumkin (ixtiyoriy)..."
                     className="w-full bg-transparent border-none text-sm font-bold text-slate-900 focus:outline-none placeholder:text-slate-300 mt-1"
                   />
                </div>
             </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
             <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-auto shadow-inner">
                {["pending", "approved", "rejected"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s as any)}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${status === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    {s === "pending" ? "Kutmoqda" : s === "approved" ? "OK" : "Rad"}
                  </button>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Hamkor Ma&apos;lumotlari</th>
                <th>Foydalanuvchi</th>
                <th>Aloqa</th>
                <th>Sana va Status</th>
                <th className="w-40"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 size={32} className="animate-spin mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-400 mt-4">Arizalar yuklanmoqda...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-400">
                    <CheckCircle size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-black">Hech qanday ariza topilmadi</p>
                  </td>
                </tr>
              ) : (
                items.map((p) => {
                  const S = STATUS_CONFIG[p.status];
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-6 pl-8">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/10">
                               <ShieldCheck size={24} />
                            </div>
                            <div>
                               <div className="text-sm font-black text-slate-900">{p.displayName || p.type.toUpperCase()}</div>
                               <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sektor: {p.type}</div>
                            </div>
                         </div>
                      </td>
                      <td className="py-6">
                         <div className="text-sm font-black text-slate-900">{p.user.first_name} {p.user.last_name}</div>
                         <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-0.5">ID: {p.user.id.slice(-6)}</div>
                      </td>
                      <td className="py-6">
                         <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                               <Mail size={12} className="text-slate-300" />
                               {p.user.email}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                               <Phone size={12} className="text-slate-300" />
                               {p.user.phone}
                            </div>
                         </div>
                      </td>
                      <td className="py-6">
                         <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                               <Calendar size={12} className="text-slate-200" />
                               {fmtDate(p.createdAt)}
                            </div>
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ring-1 ${S.cls}`}>
                               <S.icon size={10} />
                               {S.label}
                            </div>
                         </div>
                      </td>
                      <td className="py-6 pr-8 text-right">
                         {p.status === "pending" ? (
                           <div className="flex items-center gap-2 justify-end">
                              <button
                                disabled={actingId === p.id}
                                onClick={() => void decide(p.id, "approve")}
                                className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all active:scale-95"
                                title="Tasdiqlash"
                              >
                                {actingId === p.id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                              </button>
                              <button
                                disabled={actingId === p.id}
                                onClick={() => void decide(p.id, "reject")}
                                className="p-2.5 rounded-xl bg-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white transition-all active:scale-95"
                                title="Rad etish"
                              >
                                {actingId === p.id ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                              </button>
                           </div>
                         ) : (
                           <button className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-900 transition-colors">
                              Ma&apos;lumotlar
                           </button>
                         )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
