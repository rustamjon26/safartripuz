"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

type Order = {
  id: string;
  createdAt: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedPrice: number;
  finalPrice: number | null;
  status: "PENDING" | "ACCEPTED" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTE";
  customer: { first_name: string; last_name: string } | null;
  review?: { rating: number } | null;
};

const tabs = ["ACTIVE", "HISTORY"] as const;

export default function TaxiOrdersPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("ACTIVE");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [items, setItems] = useState<Order[]>([]);
  const [completeTarget, setCompleteTarget] = useState<Order | null>(null);
  const [completeData, setCompleteData] = useState({ finalPrice: "", distanceKm: "" });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/taxi/driver/orders?limit=100");
      const json = await res.json();
      if (res.ok && json.success) setItems(json.data?.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const activeStatuses = new Set(["PENDING", "ACCEPTED", "ARRIVED", "IN_PROGRESS"]);
  const filtered = useMemo(
    () =>
      items.filter((o) =>
        tab === "ACTIVE" ? activeStatuses.has(o.status) : ["COMPLETED", "CANCELLED"].includes(o.status),
      ),
    [items, tab],
  );

  async function runAction(order: Order, status: string, extra?: Record<string, unknown>) {
    setSaving(order.id);
    try {
      const payload = { status, ...(extra ?? {}) };
      if (status === "ACCEPTED") {
        const profileRes = await fetch("/api/taxi/driver/profile");
        const profileJson = await profileRes.json();
        const vehicleId = profileJson?.data?.vehicles?.find((v: { isActive: boolean }) => v.isActive)?.id;
        if (!vehicleId) throw new Error("Active vehicle topilmadi");
        Object.assign(payload, { vehicleId });
      }
      const res = await fetch(`/api/taxi/driver/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "Xatolik");
      toast.success("Status yangilandi");
      setCompleteTarget(null);
      setCompleteData({ finalPrice: "", distanceKm: "" });
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-3">
        <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight">Orders</h1>
        <p className="text-[13px] font-semibold text-slate-500 mt-1">Active va history buyurtmalar</p>
      </div>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 rounded-lg text-xs font-black border ${
              tab === t
                ? "bg-[var(--bg-light-blue)] text-[var(--accent)] border-[var(--accent)]/30"
                : "bg-white text-slate-500 border-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-3 px-5">{tab === "ACTIVE" ? "Customer" : "Date"}</th>
                <th className="py-3 px-5">Pickup</th>
                <th className="py-3 px-5">Dropoff</th>
                <th className="py-3 px-5">{tab === "ACTIVE" ? "Estimated" : "Final"}</th>
                <th className="py-3 px-5">{tab === "ACTIVE" ? "Status" : "Rating"}</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 px-5">
                    <EmptyState
                      title={tab === "ACTIVE" ? "Aktiv buyurtmalar yo'q" : "Tarix bo'sh"}
                      message={tab === "ACTIVE" ? "Yangi buyurtmalar kelishini kuting." : "Hozircha yakunlangan yoki bekor qilingan buyurtmalar yo'q."}
                      ctaHref="/taxi-partner/dashboard"
                      ctaLabel="Dashboardga o'tish"
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 px-5 font-bold text-slate-700">
                      {tab === "ACTIVE" ? (o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : "-") : new Date(o.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-5">{o.pickupAddress}</td>
                    <td className="py-3 px-5">{o.dropoffAddress}</td>
                    <td className="py-3 px-5 font-black">{Number(tab === "ACTIVE" ? o.estimatedPrice : (o.finalPrice ?? o.estimatedPrice)).toLocaleString()}</td>
                    <td className="py-3 px-5">{tab === "ACTIVE" ? o.status : (o.review?.rating ? `${o.review.rating}★` : "-")}</td>
                    <td className="py-3 px-5 text-right">
                      <div className="inline-flex gap-2 items-center">
                        {tab === "ACTIVE" ? (
                          <>
                            {o.status === "PENDING" && <button disabled={saving === o.id} onClick={() => void runAction(o, "ACCEPTED")} className="px-2.5 py-1 text-xs font-black rounded bg-green-600 text-white">Qabul qilish</button>}
                            {o.status === "ACCEPTED" && <button disabled={saving === o.id} onClick={() => void runAction(o, "ARRIVED")} className="px-2.5 py-1 text-xs font-black rounded bg-amber-500 text-white">Yetib keldim</button>}
                            {o.status === "ARRIVED" && <button disabled={saving === o.id} onClick={() => void runAction(o, "IN_PROGRESS")} className="px-2.5 py-1 text-xs font-black rounded bg-blue-600 text-white">Yo'lga chiqdik</button>}
                            {o.status === "IN_PROGRESS" && (
                              <button
                                disabled={saving === o.id}
                                onClick={() => {
                                  setCompleteTarget(o);
                                  setCompleteData({ finalPrice: String(Number(o.estimatedPrice)), distanceKm: "" });
                                }}
                                className="px-2.5 py-1 text-xs font-black rounded bg-slate-700 text-white"
                              >
                                Yetkazib berdim
                              </button>
                            )}
                          </>
                        ) : null}
                        <Link href={`/taxi-partner/orders/${o.id}`} className="px-2.5 py-1 text-xs font-black rounded border border-slate-200 text-slate-600">Detail</Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {completeTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4">
            <h3 className="text-lg font-black text-[var(--primary)]">Trip complete</h3>
            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Final price</label>
              <input className="h-input" type="number" value={completeData.finalPrice} onChange={(e) => setCompleteData((p) => ({ ...p, finalPrice: e.target.value }))} />
            </div>
            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Distance (km)</label>
              <input className="h-input" type="number" value={completeData.distanceKm} onChange={(e) => setCompleteData((p) => ({ ...p, distanceKm: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCompleteTarget(null)} className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-sm font-bold text-slate-700">Bekor qilish</button>
              <button
                onClick={() =>
                  void runAction(completeTarget, "COMPLETED", {
                    finalPrice: Number(completeData.finalPrice),
                    distanceKm: Number(completeData.distanceKm),
                  })
                }
                className="px-4 py-2 rounded-lg bg-[var(--primary)] text-sm font-bold text-white"
              >
                Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
