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
  PENDING:     { label: "Kutilmoqda",    classes: "bg-amber-500/15 border-amber-500/30 text-amber-400",     dot: "bg-amber-400" },
  ACCEPTED:    { label: "Qabul qilindi", classes: "bg-blue-500/15 border-blue-500/30 text-blue-400",        dot: "bg-blue-400" },
  ARRIVED:     { label: "Yetib keldi",   classes: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400",        dot: "bg-cyan-400" },
  IN_PROGRESS: { label: "Jarayonda",     classes: "bg-violet-500/15 border-violet-500/30 text-violet-400",  dot: "bg-violet-400" },
  COMPLETED:   { label: "Yakunlandi",    classes: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400", dot: "bg-emerald-400" },
  CANCELLED:   { label: "Bekor qilindi", classes: "bg-red-500/15 border-red-500/30 text-red-400",           dot: "bg-red-400" },
  DISPUTE:     { label: "Munozara",      classes: "bg-orange-500/15 border-orange-500/30 text-orange-400",  dot: "bg-orange-400" },
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
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                  : "bg-[#111827] border-[#1e2d45] text-slate-400 hover:border-[#2a3a55] hover:text-white"
              }`}
            >
              <span>{t.icon}</span> {t.label}
              {tab === t.value && (
                <span className="ml-1 bg-amber-500/30 text-amber-400 rounded-full px-1.5 py-0.5 text-[10px] font-black">
                  {filtered.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-5 space-y-3">
                <Skeleton className="h-5 w-1/3 bg-[#1a2234]" />
                <Skeleton className="h-4 w-2/3 bg-[#1a2234]" />
                <Skeleton className="h-10 w-full bg-[#1a2234]" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-12 text-center">
            <div className="text-5xl mb-3">🚖</div>
            <h3 className="text-white font-black text-lg mb-2">Taxi buyurtmalar yo&apos;q</h3>
            <p className="text-slate-500 text-sm mb-5">Hali taxi buyurtma qilmagansiz.</p>
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
                  className={`block bg-[#111827] border rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 ${
                    isActive
                      ? "border-amber-500/30 hover:border-amber-500/50"
                      : "border-[#1e2d45] hover:border-[#2a3a55]"
                  }`}
                >
                  {isActive && (
                    <div className="h-0.5 w-full bg-gradient-to-r from-amber-500 to-amber-400" />
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 mb-2">{dateStr}</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            <p className="text-sm font-bold text-white truncate">{order.pickupAddress}</p>
                          </div>
                          <div className="flex items-center gap-2 pl-0.5">
                            <div className="w-px h-3 bg-[#1e2d45] ml-0.5" />
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                            <p className="text-sm font-bold text-slate-300 truncate">{order.dropoffAddress}</p>
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

                    <div className="flex items-center justify-between pt-3 border-t border-[#1e2d45]">
                      <div>
                        <span className="text-lg font-black text-amber-400">{price.toLocaleString()}</span>
                        <span className="text-xs text-slate-500 ml-1">so&apos;m</span>
                        {order.finalPrice == null && (
                          <span className="text-xs text-slate-600 ml-1">(taxminiy)</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-600 flex items-center gap-1 hover:text-slate-400 transition-colors">
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
