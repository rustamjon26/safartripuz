"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Calendar, MapPin, User as UserIcon, CreditCard, Package,
  Clock, CheckCircle2, XCircle, Home, PlusCircle, Info, Car,
  Users, Loader2, Wallet, ListChecks,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";

type Item = { id: string; type: string; title: string; quantity: number; totalPrice: string };
type Plan = {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  pax: number;
  status: "DRAFT" | "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED";
  totalAmount: string;
  createdAt: string;
  items: Item[];
};

const STATUS_CONFIG = {
  CONFIRMED:       { label: "Tasdiqlangan",        icon: CheckCircle2, bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  PENDING_PAYMENT: { label: "To'lov kutilmoqda",   icon: Clock,        bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500" },
  CANCELLED:       { label: "Bekor qilingan",       icon: XCircle,      bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     dot: "bg-red-400" },
  DRAFT:           { label: "Qoralama",             icon: Info,         bg: "bg-slate-50",   text: "text-slate-600",   border: "border-slate-200",   dot: "bg-slate-400" },
};

export default function BookingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/travel-plans");
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(pathname || "/user/bookings")}`);
        return;
      }
      const data = (await res.json()) as { items?: Plan[]; message?: string };
      if (!res.ok) throw new Error(data.message || "Load error");
      setItems(data.items ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik yuklashda");
    } finally { setLoading(false); }
  }, [pathname, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const total = items.length;
    const pending = items.filter(i => i.status === "PENDING_PAYMENT").length;
    const confirmed = items.filter(i => i.status === "CONFIRMED").length;
    const totalSpent = items.filter(i => i.status === "CONFIRMED").reduce((s, i) => s + Number(i.totalAmount), 0);
    return { total, pending, confirmed, totalSpent };
  }, [items]);

  function pay(id: string) {
    router.push(`/payments/checkout/${id}`);
  }

  const statCards = [
    { label: "Jami sayohatlar",   value: stats.total,                              icon: ListChecks, color: "text-blue-600",   bg: "bg-blue-50" },
    { label: "Tasdiqlangan",      value: stats.confirmed,                          icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "To'lov kutmoqda",   value: stats.pending,                            icon: Clock,      color: "text-amber-600",   bg: "bg-amber-50" },
    { label: "Jami sarf-xarajat", value: `${stats.totalSpent.toLocaleString()} so'm`, icon: Wallet, color: "text-violet-600",  bg: "bg-violet-50" },
  ];

  return (
    <DashboardShell title="Mening Sayohatlarim" subtitle="Barcha buyurtmalar va to'lovlar tarixi">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className={`inline-flex p-2 rounded-xl ${s.bg} mb-3`}>
              <s.icon size={20} className={s.color} />
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{s.label}</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <Package size={20} className="text-slate-400" /> Buyurtmalar ro'yxati
          {!loading && items.length > 0 && (
            <span className="bg-slate-100 text-slate-600 text-xs font-black px-2.5 py-1 rounded-full">{items.length}</span>
          )}
        </h2>
        <Link href="/trip-builder" className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-xl transition-all text-sm shadow-lg shadow-slate-900/20">
          <PlusCircle size={16} /> Yangi Safar
        </Link>
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-slate-500 font-medium">Yuklanmoqda...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-5">
              <MapPin size={36} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-700 mb-2">Hali sayohatlar yo'q</h3>
            <p className="text-slate-500 max-w-xs text-sm">Birinchi sayohatingizni rejalashtiring — mehmonxona, transport va gidni bir joyda band qiling.</p>
            <Link href="/trip-builder" className="mt-6 inline-flex items-center gap-2 bg-slate-900 text-white font-bold py-3 px-6 rounded-2xl hover:bg-slate-800 transition-colors text-sm">
              <PlusCircle size={16} /> Sayohatni Boshlash
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {items.map(p => {
              const sc = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.DRAFT;
              const StatusIcon = sc.icon;
              return (
                <div key={p.id} className="p-5 sm:p-6 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center shrink-0">
                          <MapPin size={18} />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-base leading-tight">{p.destination}</h3>
                          <p className="text-slate-500 text-xs font-semibold flex items-center gap-1 mt-0.5">
                            <Calendar size={10} />
                            {new Date(p.startDate).toLocaleDateString("uz-UZ")} — {new Date(p.endDate).toLocaleDateString("uz-UZ")}
                            &nbsp;•&nbsp;<Users size={10} /> {p.pax} kishi
                          </p>
                        </div>
                      </div>
                      {p.items.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {p.items.map(item => (
                            <span key={item.id} className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                              {item.type === "HOTEL" ? <Home size={10} /> : item.type === "TAXI" ? <Car size={10} /> : <UserIcon size={10} />}
                              {item.title}{item.quantity > 1 && <span className="text-slate-400">×{item.quantity}</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Summa</div>
                        <div className="text-xl font-black text-slate-900">
                          {Number(p.totalAmount).toLocaleString()}<span className="text-xs font-bold text-slate-500 ml-1">so'm</span>
                        </div>
                      </div>
                      {p.status === "PENDING_PAYMENT" && (
                        <button onClick={() => pay(p.id)}
                          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-4 rounded-xl transition-colors text-sm">
                          <CreditCard size={14} /> To'lash
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    ID: {p.id.slice(0, 12)}... • {new Date(p.createdAt).toLocaleDateString("uz-UZ")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
