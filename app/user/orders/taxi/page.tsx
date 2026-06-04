"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { ChevronRight } from "lucide-react";

type TaxiOrder = {
  id: string;
  createdAt: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedPrice: number;
  finalPrice: number | null;
  status: "PENDING" | "ACCEPTED" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTE";
};

const STATUS_CONFIG: Record<string, { label: string; classes: string; dot: string }> = {
  PENDING:     { label: "Kutilmoqda",    classes: "bg-amber-50 border-amber-200 text-amber-700",     dot: "bg-amber-500" },
  ACCEPTED:    { label: "Qabul qilindi", classes: "bg-blue-50 border-blue-200 text-blue-700",        dot: "bg-blue-500" },
  ARRIVED:     { label: "Yetib keldi",   classes: "bg-cyan-50 border-cyan-200 text-cyan-700",        dot: "bg-cyan-500" },
  IN_PROGRESS: { label: "Jarayonda",     classes: "bg-violet-50 border-violet-200 text-violet-700",  dot: "bg-violet-500" },
  COMPLETED:   { label: "Yakunlandi",    classes: "bg-emerald-50 border-emerald-200 text-emerald-700", dot: "bg-emerald-500" },
  CANCELLED:   { label: "Bekor qilindi", classes: "bg-red-50 border-red-200 text-red-700",           dot: "bg-red-500" },
  DISPUTE:     { label: "Munozara",      classes: "bg-orange-50 border-orange-200 text-orange-700",  dot: "bg-orange-500" },
};

const tabs = [
  { value: "ALL", label: "Barchasi", icon: "🚖" },
  { value: "ACTIVE", label: "Faol", icon: "⚡" },
  { value: "COMPLETED", label: "Yakunlangan", icon: "✅" },
  { value: "CANCELLED", label: "Bekor", icon: "❌" },
] as const;

export default function MyTaxiOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TaxiOrder[]>([]);
  const [tab, setTab] = useState<(typeof tabs)[number]["value"]>("ALL");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/taxi/orders?limit=100");
      const json = await res.json();
      if (res.ok && json.success) setItems(json.data?.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (tab === "ALL") return items;
    if (tab === "ACTIVE") return items.filter((o) => ["PENDING", "ACCEPTED", "ARRIVED", "IN_PROGRESS"].includes(o.status));
    if (tab === "COMPLETED") return items.filter((o) => o.status === "COMPLETED");
    return items.filter((o) => o.status === "CANCELLED");
  }, [items, tab]);

  return (
    <DashboardShell title="Taxi Orders" subtitle="Mening taxi buyurtmalarim">
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap mb-2">
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black border transition-all ${
                tab === t.value
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
              }`}
            >
              <span>{t.icon}</span> {t.label}
              {tab === t.value && (
                <span className="ml-1 bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 text-[10px] font-black">
                  {filtered.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
                <Skeleton className="h-5 w-1/3 bg-gray-50" />
                <Skeleton className="h-4 w-2/3 bg-gray-50" />
                <Skeleton className="h-10 w-full bg-gray-50" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <div className="text-5xl mb-3">🚖</div>
            <h3 className="text-gray-900 font-black text-lg mb-2">Taxi buyurtmalar yo&apos;q</h3>
            <p className="text-gray-500 text-sm mb-5">Hali taxi buyurtma qilmagansiz.</p>
            <Link
              href="/taxi"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-black px-5 py-2.5 rounded-xl text-sm transition-all"
            >
              Taxi chaqirish →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => {
              const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;
              const price = Number(order.finalPrice ?? order.estimatedPrice);
              const dateStr = new Date(order.createdAt).toLocaleString("uz-UZ", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              const isActive = ["PENDING", "ACCEPTED", "ARRIVED", "IN_PROGRESS"].includes(order.status);

              return (
                <Link
                  key={order.id}
                  href={`/taxi/orders/${order.id}`}
                  className={`block bg-white border rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    isActive
                      ? "border-amber-200 hover:border-amber-300"
                      : "border-gray-200 hover:border-amber-200"
                  }`}
                >
                  {isActive && (
                    <div className="h-0.5 w-full bg-gradient-to-r from-amber-500 to-amber-400" />
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-2">{dateStr}</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            <p className="text-sm font-bold text-gray-900 truncate">{order.pickupAddress}</p>
                          </div>
                          <div className="flex items-center gap-2 pl-0.5">
                            <div className="w-px h-3 bg-gray-200 ml-0.5" />
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                            <p className="text-sm font-bold text-gray-700 truncate">{order.dropoffAddress}</p>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-black ${cfg.classes}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${isActive ? "animate-pulse" : ""}`} />
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div>
                        <span className="text-lg font-black text-amber-600">{price.toLocaleString()}</span>
                        <span className="text-xs text-gray-500 ml-1">so&apos;m</span>
                        {order.finalPrice == null && (
                          <span className="text-xs text-gray-400 ml-1">(taxminiy)</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-500 transition-colors">
                        Batafsil <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
