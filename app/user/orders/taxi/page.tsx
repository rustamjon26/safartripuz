"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

type TaxiOrder = {
  id: string;
  createdAt: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedPrice: number;
  finalPrice: number | null;
  status: "PENDING" | "ACCEPTED" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTE";
};

const tabs = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
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
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-3 py-2 rounded-lg text-xs font-black border ${
                tab === t.value
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-500 border-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border border-slate-100 p-5 space-y-3">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Taxi buyurtmalar yo'q"
            message="Hali taxi buyurtma qilmagansiz."
            ctaHref="/taxi"
            ctaLabel="Taxi chaqirish"
          />
        ) : (
          filtered.map((order) => (
            <Link key={order.id} href={`/taxi/orders/${order.id}`} className="block bg-white rounded-3xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500 font-semibold">{new Date(order.createdAt).toLocaleString()}</p>
                  <h3 className="text-base font-black text-slate-900 mt-1">{order.pickupAddress} → {order.dropoffAddress}</h3>
                  <p className="text-sm font-bold text-slate-700 mt-2">
                    {Number(order.finalPrice ?? order.estimatedPrice).toLocaleString()} UZS
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded border text-[10px] font-black uppercase ${
                  order.status === "COMPLETED"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : order.status === "CANCELLED"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {order.status}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </DashboardShell>
  );
}
