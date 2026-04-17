"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import type { ReactNode } from "react";

type Order = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTE";
  pickupAddress: string;
  dropoffAddress: string;
  customerNote: string | null;
  driverNote: string | null;
  estimatedPrice: number;
  finalPrice: number | null;
  distanceKm: number | null;
  customer: { first_name: string; last_name: string; email: string; phone: string };
  logs: Array<{
    id: string;
    actorRole: string;
    fromStatus: string;
    toStatus: string;
    note: string | null;
    createdAt: string;
    actor: { first_name: string; last_name: string; email: string } | null;
  }>;
};

export default function TaxiOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeData, setCompleteData] = useState({ finalPrice: "", distanceKm: "" });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/taxi/driver/orders/${params.id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setOrder(data.data);
        setCompleteData({
          finalPrice: String(Number(data.data?.estimatedPrice ?? 0)),
          distanceKm: data.data?.distanceKm ? String(data.data.distanceKm) : "",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.id) void load();
  }, [params.id]);

  const nextAction = useMemo(() => {
    if (!order) return null;
    if (order.status === "PENDING") return { key: "ACCEPTED", label: "Qabul qilish" };
    if (order.status === "ACCEPTED") return { key: "ARRIVED", label: "Yetib keldim" };
    if (order.status === "ARRIVED") return { key: "IN_PROGRESS", label: "Yo'lga chiqdik" };
    if (order.status === "IN_PROGRESS") return { key: "COMPLETED", label: "Yetkazib berdim" };
    return null;
  }, [order]);

  async function runAction() {
    if (!order || !nextAction) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { status: nextAction.key };
      if (nextAction.key === "ACCEPTED") {
        const profileRes = await fetch("/api/taxi/driver/profile");
        const profileJson = await profileRes.json();
        const vehicleId = profileJson?.data?.vehicles?.find((v: { isActive: boolean }) => v.isActive)?.id;
        if (!vehicleId) throw new Error("Active vehicle topilmadi");
        payload.vehicleId = vehicleId;
      }
      if (nextAction.key === "COMPLETED") {
        payload.finalPrice = Number(completeData.finalPrice);
        payload.distanceKm = Number(completeData.distanceKm);
      }

      const res = await fetch(`/api/taxi/driver/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "Xatolik");
      toast.success("Order yangilandi");
      setCompleteOpen(false);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-12 text-center text-slate-400 font-bold">Loading...</div>;
  if (!order) return <div className="p-12 text-center text-red-500 font-bold">Order not found</div>;

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-3">
        <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight">Order Detail</h1>
        <p className="text-[13px] font-semibold text-slate-500 mt-1">ID: {order.id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card title="Customer info">
            <p className="font-bold text-slate-800">{order.customer.first_name} {order.customer.last_name}</p>
            <p className="text-sm text-slate-500">{order.customer.email}</p>
            <p className="text-sm text-slate-500">{order.customer.phone}</p>
          </Card>
          <Card title="Route details">
            <p className="text-sm"><b>Pickup:</b> {order.pickupAddress}</p>
            <p className="text-sm"><b>Dropoff:</b> {order.dropoffAddress}</p>
            <p className="text-sm"><b>Estimated:</b> {Number(order.estimatedPrice).toLocaleString()} UZS</p>
            <p className="text-sm"><b>Final:</b> {Number(order.finalPrice ?? 0).toLocaleString()} UZS</p>
            <p className="text-sm"><b>Distance:</b> {order.distanceKm ?? "-"} km</p>
          </Card>
          <Card title="Notes">
            <p className="text-sm"><b>Customer note:</b> {order.customerNote || "-"}</p>
            <p className="text-sm"><b>Driver note:</b> {order.driverNote || "-"}</p>
          </Card>
          <Card title="Status timeline">
            <div className="space-y-2">
              {order.logs.length === 0 ? (
                <p className="text-sm text-slate-500">Status log yo'q</p>
              ) : (
                order.logs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-slate-200 p-2">
                    <div className="flex justify-between gap-2">
                      <span className="font-bold">{log.fromStatus} → {log.toStatus}</span>
                      <span className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      by {log.actor ? `${log.actor.first_name} ${log.actor.last_name}` : "System"} ({log.actorRole})
                    </p>
                    {log.note ? <p className="text-xs text-slate-600 mt-1">{log.note}</p> : null}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Action">
            {nextAction ? (
              <button
                onClick={() => {
                  if (nextAction.key === "COMPLETED") setCompleteOpen(true);
                  else void runAction();
                }}
                disabled={saving}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-black hover:bg-[var(--secondary)] disabled:opacity-60"
              >
                {saving ? "Saving..." : nextAction.label}
              </button>
            ) : (
              <p className="text-sm text-slate-500 font-semibold">No actions available for current status</p>
            )}
          </Card>
        </div>
      </div>

      {completeOpen ? (
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
              <button onClick={() => setCompleteOpen(false)} className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-sm font-bold text-slate-700">Bekor qilish</button>
              <button onClick={() => void runAction()} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-sm font-bold text-white">Tasdiqlash</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <h3 className="font-extrabold text-[var(--primary)] text-sm mb-3">{title}</h3>
      {children}
    </div>
  );
}
