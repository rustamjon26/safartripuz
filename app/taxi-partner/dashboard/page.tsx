"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  CarTaxiFront,
  Clock3,
  Star,
  Wallet,
  Activity,
  ArrowRight,
} from "lucide-react";
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

function statusBadge(status: string): string {
  if (status === "COMPLETED") return "tp-badge tp-badge-ok";
  if (status === "CANCELLED" || status === "DISPUTE") return "tp-badge tp-badge-cancel";
  if (status === "PENDING") return "tp-badge tp-badge-wait";
  if (["ACCEPTED", "ARRIVED", "IN_PROGRESS"].includes(status)) return "tp-badge tp-badge-info";
  return "tp-badge tp-badge-muted";
}

function statusLabel(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "Bajarildi";
    case "CANCELLED":
      return "Bekor";
    case "IN_PROGRESS":
      return "Ketmoqda";
    case "ARRIVED":
      return "Yetib keldi";
    case "ACCEPTED":
      return "Qabul";
    case "PENDING":
      return "Kutilmoqda";
    default:
      return status;
  }
}

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

  const activeCount = useMemo(
    () => orders.filter((o) => ["PENDING", "ACCEPTED", "ARRIVED", "IN_PROGRESS"].includes(o.status)).length,
    [orders],
  );

  const stats = useMemo(() => {
    const now = new Date();
    const isToday = (value: string) => {
      const d = new Date(value);
      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    };
    const isThisMonth = (value: string) => {
      const d = new Date(value);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };

    const completedToday = orders.filter((o) => o.status === "COMPLETED" && isToday(o.createdAt));
    const completedMonth = orders.filter((o) => o.status === "COMPLETED" && isThisMonth(o.createdAt));

    return {
      todayTrips: completedToday.length,
      todayEarnings: completedToday.reduce(
        (s, o) => s + Number(o.finalPrice ?? o.estimatedPrice),
        0,
      ),
      monthTrips: completedMonth.length,
      rating: profile?.rating ?? 5,
    };
  }, [orders, profile]);

  const recentCompleted = useMemo(
    () => orders.filter((o) => o.status === "COMPLETED").slice(0, 5),
    [orders],
  );

  const activity = useMemo(() => orders.slice(0, 6), [orders]);

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
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[30px] font-display font-bold text-[#0d2137] tracking-tight">
            Taxi Dashboard
          </h1>
          <p className="text-[13px] font-medium text-[#64748B] mt-1.5">
            Xush kelibsiz! Bugungi ko&apos;rsatkichlaringiz bilan tanishing
          </p>
        </div>
        <label className="inline-flex items-center gap-3 rounded-xl border border-[#d8e3fb] bg-white px-4 py-2.5 text-[13px] font-[family-name:var(--font-sora)] font-semibold">
          <span className={profile?.isOnline ? "text-emerald-600" : "text-[#64748B]"}>
            {profile?.isOnline ? "Onlayn" : "Offline"}
          </span>
          <input
            type="checkbox"
            checked={Boolean(profile?.isOnline)}
            disabled={onlineBusy}
            onChange={(e) => void toggleOnline(e.target.checked)}
            className="accent-[#006781] w-4 h-4"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat icon={Activity} label="Aktiv safarlar" value={activeCount} hint="Hozir jarayonda" />
        <Stat
          icon={Clock3}
          label="Bugungi safarlar"
          value={stats.todayTrips}
          hint="Yakunlangan"
        />
        <Stat
          icon={Wallet}
          label="Kunlik daromad"
          value={`${stats.todayEarnings.toLocaleString("uz-UZ")} UZS`}
          hint="Bugungi net tushum"
        />
        <Stat
          icon={Star}
          label="O'rtacha reyting"
          value={stats.rating.toFixed(1)}
          hint={`${stats.monthTrips} ta oyiga`}
        />
      </div>

      {onboarding ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-bold text-amber-800">Onboarding tugallanmagan</p>
          <p className="text-sm text-amber-700 mt-1">
            Profil va kamida bitta aktiv transport vositasi qo&apos;shing.
          </p>
          <div className="mt-3 flex gap-2">
            <Link href="/taxi-partner/profile" className="tp-btn tp-btn-navy text-xs">
              Profilni to&apos;ldirish
            </Link>
            <Link href="/taxi-partner/vehicles" className="tp-btn tp-btn-ghost text-xs">
              Transport qo&apos;shish
            </Link>
          </div>
        </div>
      ) : null}

      {activeOrder ? (
        <div className="rounded-2xl border border-[#8fdfff]/50 bg-[#f0f3ff] p-5">
          <p className="text-[10px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-wider text-[#006781]">
            Aktiv buyurtma
          </p>
          <p className="mt-1 text-sm font-bold text-[#0d2137]">
            {activeOrder.pickupAddress} → {activeOrder.dropoffAddress}
          </p>
          <p className="text-sm text-[#64748B] font-semibold mt-1">
            Holat: <span className={statusBadge(activeOrder.status)}>{statusLabel(activeOrder.status)}</span>
          </p>
          <Link
            href={`/taxi-partner/orders/${activeOrder.id}`}
            className="inline-flex items-center gap-1 mt-3 text-sm font-[family-name:var(--font-sora)] font-semibold text-[#006781]"
          >
            Batafsil ko&apos;rish <ArrowRight size={14} />
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <div className="bg-white border border-[#d8e3fb] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#d8e3fb] flex items-center justify-between">
            <h3 className="font-display font-semibold text-[#0d2137] text-[16px]">Oxirgi safarlar</h3>
            <Link
              href="/taxi-partner/orders"
              className="text-[12px] font-[family-name:var(--font-sora)] font-semibold text-[#006781]"
            >
              Barchasi
            </Link>
          </div>
          {loading ? (
            <div className="p-5 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="bg-[#f0f3ff] text-[10px] font-[family-name:var(--font-sora)] font-semibold text-[#64748B] uppercase tracking-wider">
                    <th className="py-3 px-5">ID</th>
                    <th className="py-3 px-5">Yo&apos;nalish</th>
                    <th className="py-3 px-5">Narxi</th>
                    <th className="py-3 px-5">Holat</th>
                    <th className="py-3 px-5 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="text-[13px] divide-y divide-[#d8e3fb]">
                  {(recentCompleted.length ? recentCompleted : orders.slice(0, 5)).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#94A3B8] font-semibold">
                        Safarlar yo&apos;q
                      </td>
                    </tr>
                  ) : (
                    (recentCompleted.length ? recentCompleted : orders.slice(0, 5)).map((o) => (
                      <tr key={o.id} className="hover:bg-[#f9f9ff]">
                        <td className="py-3 px-5 font-[family-name:var(--font-sora)] font-semibold text-[#0d2137]">
                          #{o.id.slice(-6)}
                        </td>
                        <td className="py-3 px-5 text-[#64748B] max-w-[280px] truncate">
                          {o.pickupAddress} → {o.dropoffAddress}
                        </td>
                        <td className="py-3 px-5 font-bold text-[#111c2d] tabular-nums">
                          {Number(o.finalPrice ?? o.estimatedPrice).toLocaleString("uz-UZ")}
                        </td>
                        <td className="py-3 px-5">
                          <span className={statusBadge(o.status)}>{statusLabel(o.status)}</span>
                        </td>
                        <td className="py-3 px-5 text-right">
                          <Link
                            href={`/taxi-partner/orders/${o.id}`}
                            className="text-[12px] font-semibold text-[#006781]"
                          >
                            Ko&apos;rish
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="bg-white border border-[#d8e3fb] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-[#0d2137] text-[15px]">Faollik</h3>
            <span className="tp-badge tp-badge-info">Yangi</span>
          </div>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : activity.length === 0 ? (
              <p className="text-xs font-semibold text-[#94A3B8] py-8 text-center">Harakat yo&apos;q</p>
            ) : (
              activity.map((o) => (
                <div key={o.id} className="flex gap-3 p-3 rounded-xl border border-[#d8e3fb] bg-[#f9f9ff]">
                  <div className="w-8 h-8 rounded-lg bg-[#0d2137] text-white flex items-center justify-center shrink-0">
                    <CarTaxiFront size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[#111c2d] truncate">
                      {statusLabel(o.status)} · #{o.id.slice(-4)}
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-0.5 truncate">
                      {o.pickupAddress}
                    </p>
                    <p className="text-[10px] text-[#94A3B8] mt-1">
                      {new Date(o.createdAt).toLocaleString("uz-UZ")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 rounded-xl bg-[#0d2137] p-4 text-white">
            <p className="text-[10px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-wider text-white/45">
              Bugungi bonus
            </p>
            <p className="text-[15px] font-display font-semibold mt-1 leading-snug">
              Onlayn bo&apos;ling — kunlik daromadni oshiring
            </p>
            <Link
              href="/taxi-partner/orders"
              className="inline-flex mt-3 text-[12px] font-[family-name:var(--font-sora)] font-semibold text-[#8fdfff]"
            >
              Safarlarga o&apos;tish →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="bg-white border border-[#d8e3fb] rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <p className="text-[11px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider">
          {label}
        </p>
        <div className="p-2 bg-[#f0f3ff] rounded-xl text-[#006781]">
          <Icon size={16} />
        </div>
      </div>
      <div className="text-[22px] sm:text-[26px] font-display font-bold text-[#0d2137] leading-none">
        {value}
      </div>
      {hint ? <p className="text-[11px] font-medium text-[#64748B] mt-2">{hint}</p> : null}
    </div>
  );
}
