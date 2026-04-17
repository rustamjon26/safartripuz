"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Clock, Shield, User, Database, Info, Loader2, Calendar, LayoutList } from "lucide-react";

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  oldData: any;
  newData: any;
  createdAt: string;
  actor: null | {
    id: string;
    email: string;
    role: string;
    first_name: string;
    last_name: string;
  };
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AdminAuditPage() {
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [items, setItems] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => {
    const a = action.trim();
    const e = entity.trim();
    const params = new URLSearchParams();
    if (a) params.set("action", a);
    if (e) params.set("entity", e);
    return params.toString();
  }, [action, entity]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/audit?${query}`);
      const data = (await res.json()) as {
        items: AuditRow[];
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
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Audit Loglari</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">Tizimda amalga oshirilgan barcha o&apos;zgarishlar tarixi</p>
        </div>
      </div>

      {/* Filters */}
      <div className="adm-card border-none shadow-xl shadow-slate-200/50 p-6 bg-white overflow-visible">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative">
             <div className="flex items-center gap-3 mb-2">
                <LayoutList size={14} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Harakat</span>
             </div>
             <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  placeholder="USER_ROLE_UPDATED..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                />
             </div>
          </div>
          <div className="relative">
             <div className="flex items-center gap-3 mb-2">
                <Database size={14} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Obyekt</span>
             </div>
             <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  value={entity}
                  onChange={(e) => setEntity(e.target.value)}
                  placeholder="User / Partner / Tour..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                />
             </div>
          </div>
        </div>
      </div>

      {/* Audit List */}
      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Sana va Aktyor</th>
                <th>Harakat</th>
                <th>Obyekt</th>
                <th className="pr-8">Tafsilotlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <Loader2 size={32} className="animate-spin mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-400 mt-4">Loglar yuklanmoqda...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-slate-400">
                    <Clock size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-black">Hech qanday log topilmadi</p>
                  </td>
                </tr>
              ) : (
                items.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-6 pl-8">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                             <Clock size={20} />
                          </div>
                          <div>
                             <div className="text-xs font-black text-slate-900">{fmtDate(log.createdAt)}</div>
                             <div className="flex items-center gap-1.5 mt-1">
                                <User size={10} className="text-slate-300" />
                                <span className="text-[10px] font-bold text-slate-400 truncate max-w-[120px]">
                                   {log.actor ? `${log.actor.first_name} ${log.actor.last_name}` : "System"}
                                </span>
                             </div>
                          </div>
                       </div>
                    </td>
                    <td className="py-6">
                       <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg shadow-slate-900/10">
                          {log.action}
                       </div>
                    </td>
                    <td className="py-6">
                       <div className="text-xs font-black text-slate-900">{log.entity}</div>
                       <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-0.5">#{log.entityId?.slice(-8)}</div>
                    </td>
                    <td className="py-6 pr-8">
                       <div className="max-w-[400px]">
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 overflow-hidden">
                             <div className="flex items-center gap-2 mb-2">
                                <Info size={12} className="text-blue-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ma&apos;lumotlar o&apos;zgarishi</span>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                   <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1 font-mono">Old Data</div>
                                   <pre className="text-[10px] font-mono text-slate-500 truncate max-w-full">
                                      {JSON.stringify(log.oldData)}
                                   </pre>
                                </div>
                                <div className="border-l border-slate-100 pl-4">
                                   <div className="text-[9px] font-black text-emerald-300 uppercase tracking-widest mb-1 font-mono">New Data</div>
                                   <pre className="text-[10px] font-mono text-emerald-600 truncate max-w-full">
                                      {JSON.stringify(log.newData)}
                                   </pre>
                                </div>
                             </div>
                          </div>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
