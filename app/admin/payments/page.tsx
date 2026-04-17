"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { CreditCard, Search, Filter, Loader2, TrendingUp, DollarSign, AlertCircle, CheckCircle, ArrowUpRight, Calendar, User, MoreVertical, MapPin } from "lucide-react";

type Payment = {
  id: string;
  amount: string;
  currency: string;
  provider: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  travelPlan: {
    destination: string;
    user: { first_name: string; last_name: string; email: string };
  } | null;
};

type GroupedStat = {
  status: string;
  _count: { id: number };
  _sum: { amount: string | null };
};

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
  SUCCESS: { label: "Muvaffaqiyatli", cls: "bg-emerald-50 text-emerald-600 ring-emerald-100", icon: CheckCircle },
  PENDING: { label: "Kutilmoqda", cls: "bg-amber-50 text-amber-600 ring-amber-100", icon: TrendingUp },
  FAILED: { label: "Xato", cls: "bg-rose-50 text-rose-600 ring-rose-100", icon: AlertCircle },
  INITIATED: { label: "Boshlangan", cls: "bg-blue-50 text-blue-600 ring-blue-100", icon: Loader2 },
  CANCELLED: { label: "Bekor", cls: "bg-slate-100 text-slate-400 ring-slate-200", icon: AlertCircle },
};

const PROVIDER_CONFIG: Record<string, string> = {
  CLICK: "bg-blue-50 text-blue-600",
  PAYME: "bg-indigo-50 text-indigo-600",
  UZUM: "bg-teal-50 text-teal-600",
  MANUAL: "bg-amber-50 text-amber-600",
  MOCK: "bg-slate-100 text-slate-500",
};

function fmtMoney(v: string | number) {
  const n = Number(v);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AdminPaymentsPage() {
  const [items, setItems] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<GroupedStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [provider, setProvider] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "40" });
      if (status) params.set("status", status);
      if (provider) params.set("provider", provider);
      const res = await fetch(`/api/admin/payments?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setItems(data.items);
      setTotal(data.total);
      setStats(data.stats ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  }, [status, provider]);

  useEffect(() => { void load(); }, [load]);

  const successStat = stats.find((s) => s.status === "SUCCESS");
  const pendingStat = stats.find((s) => s.status === "PENDING");
  const totalRev = stats.reduce((acc, s) => acc + (s.status === "SUCCESS" ? Number(s._sum.amount ?? 0) : 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Moliyaviy To&apos;lovlar</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">Barcha tranzaksiyalarni monitoring qilish va statistikani ko&apos;rish</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="adm-kpi-grid">
        <div className="adm-kpi-card border-none shadow-xl shadow-slate-200/50 bg-white">
          <div className="adm-kpi-icon green shadow-lg shadow-emerald-100">
             <DollarSign size={24} />
          </div>
          <div className="flex-1">
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Haqiqiy Daromad</div>
             <div className="text-2xl font-black text-slate-900 tracking-tight">{fmtMoney(totalRev)} UZS</div>
             <div className="text-[10px] font-bold text-emerald-500 mt-2 flex items-center gap-1">
                <CheckCircle size={10} />
                {successStat?._count.id ?? 0} muvaffaqiyatli
             </div>
          </div>
          <ArrowUpRight size={14} className="text-slate-300" />
        </div>

        <div className="adm-kpi-card border-none shadow-xl shadow-slate-200/50 bg-white">
          <div className="adm-kpi-icon orange shadow-lg shadow-amber-100">
             <TrendingUp size={24} />
          </div>
          <div className="flex-1">
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kutilmoqda (Arizalar)</div>
             <div className="text-2xl font-black text-slate-900 tracking-tight">{pendingStat?._count.id ?? 0} ta</div>
             <div className="text-[10px] font-bold text-amber-500 mt-2 flex items-center gap-1">
                <AlertCircle size={10} />
                {fmtMoney(pendingStat?._sum.amount ?? 0)} UZS potentsial
             </div>
          </div>
          <ArrowUpRight size={14} className="text-slate-300" />
        </div>

        <div className="adm-kpi-card border-none shadow-xl shadow-slate-200/50 bg-white">
          <div className="adm-kpi-icon blue shadow-lg shadow-blue-100">
             <CreditCard size={24} />
          </div>
          <div className="flex-1">
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Jami Tranzaksiyalar</div>
             <div className="text-2xl font-black text-slate-900 tracking-tight">{total} ta</div>
             <div className="text-[10px] font-bold text-blue-500 mt-2 flex items-center gap-1">
                <Filter size={10} />
                Barcha tizimlar bo&apos;yicha
             </div>
          </div>
          <ArrowUpRight size={14} className="text-slate-300" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="adm-card border-none shadow-xl shadow-slate-200/50 p-6 bg-white overflow-visible">
        <div className="flex flex-col xl:flex-row gap-6 items-center">
           <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <div className="relative">
                 <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                 <select
                   className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none"
                   value={status}
                   onChange={(e) => setStatus(e.target.value)}
                 >
                   <option value="">Barcha Statuslar</option>
                   <option value="SUCCESS">Muvaffaqiyatli</option>
                   <option value="PENDING">Kutilmoqda</option>
                   <option value="FAILED">Xato / Rad etilgan</option>
                   <option value="CANCELLED">Bekor qilingan</option>
                 </select>
              </div>
              <div className="relative">
                 <CreditCard size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                 <select
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                 >
                    <option value="">Barcha Providerlar</option>
                    <option value="CLICK">Click</option>
                    <option value="PAYME">Payme</option>
                    <option value="UZUM">Uzum</option>
                    <option value="MANUAL">Manual</option>
                 </select>
              </div>
           </div>
           <button className="w-full xl:w-auto px-8 py-3 bg-slate-900 text-white rounded-2xl text-sm font-black shadow-lg shadow-slate-900/10 active:scale-95 transition-all" onClick={() => void load()}>
              Yangilash
           </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Mijoz va Manzil</th>
                <th>Tizim</th>
                <th>Miqdor</th>
                <th>Status</th>
                <th>Sana</th>
                <th className="pr-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 size={32} className="animate-spin mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-400 mt-4">To&apos;lovlar yuklanmoqda...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-400">
                    <CreditCard size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-black">Hech qanday to&apos;lov topilmadi</p>
                  </td>
                </tr>
              ) : (
                items.map((pay) => {
                  const S = STATUS_CONFIG[pay.status] || STATUS_CONFIG.CANCELLED;
                  return (
                    <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-6 pl-8">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs uppercase">
                               {pay.travelPlan?.user.first_name?.[0]}
                            </div>
                            <div>
                               <div className="text-sm font-black text-slate-900">{pay.travelPlan?.user.first_name} {pay.travelPlan?.user.last_name}</div>
                               <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                  <MapPin size={10} className="text-slate-300" />
                                  {pay.travelPlan?.destination ?? "Noma'lum"}
                               </div>
                            </div>
                         </div>
                      </td>
                      <td className="py-6">
                         <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${PROVIDER_CONFIG[pay.provider] || "bg-slate-50"}`}>
                            {pay.provider}
                         </div>
                      </td>
                      <td className="py-6">
                         <div className="text-sm font-black text-slate-900">{fmtMoney(pay.amount)} {pay.currency}</div>
                      </td>
                      <td className="py-6">
                         <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ring-1 shadow-sm ${S.cls}`}>
                             <S.icon size={10} />
                             {S.label}
                         </div>
                      </td>
                      <td className="py-6">
                         <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                            <Calendar size={12} className="text-slate-200" />
                            {fmtDate(pay.createdAt)}
                         </div>
                      </td>
                      <td className="py-6 pr-8 text-right">
                         <button className="p-2 rounded-xl text-slate-300 hover:text-slate-900 hover:bg-slate-100 transition-all">
                            <MoreVertical size={18} />
                         </button>
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
