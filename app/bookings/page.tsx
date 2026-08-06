"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Calendar, MapPin, User as UserIcon, CreditCard, Package,
  Clock, CheckCircle2, XCircle, Home, PlusCircle, Info, Car, Tent,
  Users, Loader2, Wallet, ListChecks, Map,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { loginWithNext } from "@/lib/authLinks";

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
  CONFIRMED:       { label: "Tasdiqlangan",        icon: CheckCircle2, bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", accent: "border-l-emerald-500" },
  PENDING_PAYMENT: { label: "To'lov kutilmoqda",   icon: Clock,        bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/30",   accent: "border-l-amber-500" },
  CANCELLED:       { label: "Bekor qilingan",       icon: XCircle,      bg: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/30",     accent: "border-l-red-500" },
  DRAFT:           { label: "Qoralama",             icon: Info,         bg: "bg-gray-100",   text: "text-gray-600",   border: "border-gray-200",   accent: "border-l-gray-300" },
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
        // This page is /bookings; the fallback used to send people to
        // /user/bookings, a different route, after they signed in.
        router.push(loginWithNext(pathname || "/bookings"));
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
    { label: "Jami sarf-xarajat", value: `${stats.totalSpent.toLocaleString()} so'm`, icon: Wallet, color: "text-purple-600",  bg: "bg-purple-50" },
  ];

  return (
    <DashboardShell title="Mening Sayohatlarim" subtitle="Barcha buyurtmalar va to'lovlar tarixi">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="relative overflow-hidden bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-amber-200 transition-all group"
          >
            <div className="absolute -bottom-2 -right-2 opacity-5 group-hover:opacity-10 transition-opacity text-gray-500">
              <s.icon size={80} />
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}>
              <s.icon size={18} className={s.color} />
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">{s.label}</p>
            <p className="text-2xl font-black text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <Package size={20} className="text-amber-400" /> Buyurtmalar ro&apos;yxati
          {!loading && items.length > 0 && (
            <span className="bg-amber-500/15 text-amber-400 text-xs font-black px-2.5 py-1 rounded-full border border-amber-500/20">{items.length}</span>
          )}
        </h2>
        <Link
          href="/trip-builder"
          className="inline-flex items-center gap-2 btn-amber text-white font-bold py-2.5 px-5 rounded-xl transition-all text-sm"
        >
          <PlusCircle size={16} /> Yangi Safar
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-gray-500 font-medium">Yuklanmoqda...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-5 border border-gray-200">
              <Map size={36} className="text-slate-400" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Hali sayohatlar yo&apos;q</h3>
            <p className="text-gray-500 max-w-xs text-sm">Birinchi sayohatingizni rejalashtiring — mehmonxona, transport va gidni bir joyda band qiling.</p>
            <Link href="/trip-builder" className="mt-6 inline-flex items-center gap-2 btn-amber text-white font-bold py-3 px-6 rounded-2xl text-sm">
              <PlusCircle size={16} /> Sayohatni Boshlash
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {items.map((p) => {
              const sc = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.DRAFT;
              const StatusIcon = sc.icon;
              return (
                <div
                  key={p.id}
                  className={`p-5 sm:p-6 hover:bg-gray-50/50 transition-colors border-l-4 ${sc.accent}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500/30 to-blue-600/30 text-amber-400 rounded-2xl flex items-center justify-center shrink-0 border border-gray-200">
                          <MapPin size={18} />
                        </div>
                        <div>
                          <h3 className="font-black text-gray-900 text-base leading-tight">{p.destination}</h3>
                          <p className="text-gray-500 text-xs font-semibold flex items-center gap-1 mt-0.5">
                            <Calendar size={10} />
                            {new Date(p.startDate).toLocaleDateString("uz-UZ")} — {new Date(p.endDate).toLocaleDateString("uz-UZ")}
                            &nbsp;•&nbsp;<Users size={10} /> {p.pax} kishi
                          </p>
                        </div>
                      </div>
                      {p.items.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {p.items.map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center gap-1.5 text-xs font-bold bg-gray-50 text-gray-700 px-2.5 py-1 rounded-full border border-gray-200"
                            >
                              {item.type === "HOTEL" ? (
                                <Home size={10} />
                              ) : item.type === "HOMESTAY" ? (
                                <Tent size={10} />
                              ) : item.type === "TAXI" ? (
                                <Car size={10} />
                              ) : (
                                <UserIcon size={10} />
                              )}
                              {item.title}
                              {item.quantity > 1 && <span className="text-gray-500">×{item.quantity}</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
                        <StatusIcon size={12} />
                        {sc.label}
                      </span>
                      <div className="text-right">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Summa</div>
                        <div className="text-xl font-black text-gray-900">
                          {Number(p.totalAmount).toLocaleString()}
                          <span className="text-xs font-bold text-gray-500 ml-1">so&apos;m</span>
                        </div>
                      </div>
                      {p.status === "PENDING_PAYMENT" && (
                        <button
                          type="button"
                          onClick={() => pay(p.id)}
                          className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black py-2.5 px-4 rounded-xl transition-all text-sm shadow-lg shadow-amber-500/20"
                        >
                          <CreditCard size={14} /> To&apos;lash
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
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
