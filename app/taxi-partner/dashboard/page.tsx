"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CarTaxiFront, Clock3, Star, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/Skeleton";

type Order = {
  id: string;
  status: string;
  createdAt: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedPrice: number;
  finalPrice: number | null;
  customer: { first_name: string; last_name: string } | null;
};

type Profile = {
  rating: number;
  isOnline: boolean;
  totalTrips: number;
};

export default function TaxiPartnerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const [onlineBusy, setOnlineBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [oRes, pRes] = await Promise.all([
        fetch("/api/taxi/driver/orders?limit=50"),
        fetch("/api/taxi/driver/profile"),
      ]);
      const oJson = await oRes.json();
      const pJson = await pRes.json();
      if (oRes.ok && oJson.success) setOrders(oJson.data?.data || []);
      if (pRes.ok) {
        setOnboarding(Boolean(pJson?.onboarding));
        setProfile(pJson?.data?.profile ?? pJson?.profile ?? null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const activeOrder = useMemo(
    () => orders.find((o) => ["ACCEPTED", "ARRIVED", "IN_PROGRESS"].includes(o.status)),
    [orders],
  );

  const stats = useMemo(() => {
    const now = new Date();
    const isToday = (value: string) => {
      const d = new Date(value);
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };
    const isThisMonth = (value: string) => {
      const d = new Date(value);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };

    const completedToday = orders.filter((o) => o.status === "COMPLETED" && isToday(o.createdAt));
    const completedMonth = orders.filter((o) => o.status === "COMPLETED" && isThisMonth(o.createdAt));

    return {
      todayTrips: completedToday.length,
      todayEarnings: completedToday.reduce((s, o) => s + Number(o.finalPrice ?? o.estimatedPrice), 0),
      monthTrips: completedMonth.length,
      rating: profile?.rating ?? 5,
    };
  }, [orders, profile]);

  const recentCompleted = useMemo(
    () => orders.filter((o) => o.status === "COMPLETED").slice(0, 5),
    [orders],
  );

  async function toggleOnline(isOnline: boolean) {
    setOnlineBusy(true);
    try {
      const res = await fetch("/api/taxi/driver/profile/online", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "Xatolik");
      toast.success(isOnline ? "Online holat yoqildi" : "Offline holat yoqildi");
      setProfile((prev) => (prev ? { ...prev, isOnline } : prev));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setOnlineBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight">Taxi Dashboard</h1>
          <p className="text-[13px] font-semibold text-slate-500 mt-1">Driver panel overview</p>
        </div>
        <label className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold">
          <span>{profile?.isOnline ? "Online" : "Offline"}</span>
          <input
            type="checkbox"
            checked={Boolean(profile?.isOnline)}
            disabled={onlineBusy}
            onChange={(e) => void toggleOnline(e.target.checked)}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Clock3} label="Today trips" value={stats.todayTrips} />
        <Stat icon={Wallet} label="Today earnings" value={`${stats.todayEarnings.toLocaleString()} UZS`} />
        <Stat icon={CarTaxiFront} label="Month trips" value={stats.monthTrips} />
        <Stat icon={Star} label="Rating" value={stats.rating.toFixed(1)} />
      </div>

      {onboarding ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-black text-amber-800">Onboarding tugallanmagan</p>
          <p className="text-sm text-amber-700 mt-1">Profil va kamida bitta aktiv transport vositasi qo'shing.</p>
          <div className="mt-3 flex gap-2">
            <Link href="/taxi-partner/profile" className="adm-btn text-xs">Profilni to'ldirish</Link>
            <Link href="/taxi-partner/vehicles" className="adm-btn text-xs">Transport qo'shish</Link>
          </div>
        </div>
      ) : null}

      {activeOrder ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-xs font-black uppercase tracking-wider text-blue-700">Active order</p>
          <p className="mt-1 text-sm font-bold text-blue-900">
            {activeOrder.pickupAddress} → {activeOrder.dropoffAddress}
          </p>
          <p className="text-sm text-blue-700 font-semibold mt-1">Status: {activeOrder.status}</p>
          <Link href={`/taxi-partner/orders/${activeOrder.id}`} className="inline-block mt-3 text-sm font-black text-blue-700 underline">
            Batafsil ko'rish
          </Link>
        </div>
      ) : null}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-extrabold text-[var(--primary)] text-[15px]">Recent completed orders</h3>
        </div>
        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5">Route</th>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5 text-right">Price</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {recentCompleted.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 font-semibold">Completed orders yo'q</td>
                </tr>
              ) : (
                recentCompleted.map((o) => (
                  <tr key={o.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 px-5 font-semibold text-slate-600">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-5">{o.pickupAddress} → {o.dropoffAddress}</td>
                    <td className="py-3 px-5">{o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : "-"}</td>
                    <td className="py-3 px-5 text-right font-black">{Number(o.finalPrice ?? o.estimatedPrice).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <div className="p-1.5 bg-slate-50 rounded-lg text-slate-500">
          <Icon size={14} />
        </div>
      </div>
      <div className="text-2xl font-black text-[var(--primary)]">{value}</div>
    </div>
  );
}
