"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

type Log = {
  id: string;
  actorRole: string;
  fromStatus: string;
  toStatus: string;
  note: string | null;
  createdAt: string;
  actor: { first_name: string; last_name: string; email: string } | null;
};

type Order = {
  id: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedPrice: number;
  finalPrice: number | null;
  customer: { first_name: string; last_name: string; email: string; phone: string } | null;
  driver: { first_name: string; last_name: string; email: string; phone: string } | null;
  logs: Log[];
};

export default function AdminTaxiOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [nextStatus, setNextStatus] = useState("");
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resolution, setResolution] = useState<"REFUND" | "RELEASE" | "SPLIT">("REFUND");
  const [disputeNote, setDisputeNote] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/taxi/orders/${params.id}`);
      const json = await res.json();
      if (res.ok) {
        setOrder(json.order ?? null);
        setNextStatus(json.order?.status ?? "");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.id) void load();
  }, [params.id]);

  async function forceChange() {
    if (!order || !nextStatus) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/taxi/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Xatolik");
      toast.success("Status yangilandi");
      setConfirmOpen(false);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSaving(false);
    }
  }

  async function resolveDispute() {
    if (!order) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/taxi/disputes/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution, note: disputeNote }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Xatolik");
      toast.success("Dispute hal qilindi");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-10 text-center text-slate-400 font-bold">Loading...</div>;
  if (!order) return <div className="p-10 text-center text-red-500 font-bold">Order not found</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Taxi Order Detail</h1>
        <p className="text-sm font-semibold text-slate-500 mt-1">Order ID: {order.id}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
        <p><b>Status:</b> {order.status}</p>
        <p><b>Customer:</b> {order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : "-"}</p>
        <p><b>Driver:</b> {order.driver ? `${order.driver.first_name} ${order.driver.last_name}` : "Tayinlanmagan"}</p>
        <p><b>Route:</b> {order.pickupAddress} → {order.dropoffAddress}</p>
        <p><b>Estimated:</b> {Number(order.estimatedPrice).toLocaleString()} UZS</p>
        <p><b>Final:</b> {Number(order.finalPrice ?? 0).toLocaleString()} UZS</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h2 className="text-lg font-black text-slate-900">Force status change</h2>
        <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} className="h-input">
          {["PENDING", "ACCEPTED", "ARRIVED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DISPUTE"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="h-input min-h-[100px]" placeholder="Reason" />
        <button onClick={() => setConfirmOpen(true)} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold">Confirm</button>
      </div>

      {order.status === "DISPUTE" ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-lg font-black text-slate-900">Dispute resolution</h2>
          <select value={resolution} onChange={(e) => setResolution(e.target.value as "REFUND" | "RELEASE" | "SPLIT")} className="h-input">
            <option value="REFUND">Refund</option>
            <option value="RELEASE">Release</option>
            <option value="SPLIT">Split</option>
          </select>
          <textarea value={disputeNote} onChange={(e) => setDisputeNote(e.target.value)} className="h-input min-h-[100px]" placeholder="Note" />
          <button onClick={() => void resolveDispute()} disabled={saving} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-sm font-bold text-white">Resolve</button>
        </div>
      ) : null}

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-lg font-black text-slate-900 mb-4">Status timeline</h2>
        <div className="space-y-3">
          {order.logs.length === 0 ? (
            <p className="text-sm font-semibold text-slate-500">No logs found</p>
          ) : (
            order.logs.map((log) => (
              <div key={log.id} className="border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-black text-slate-800">{log.fromStatus} → {log.toStatus}</p>
                  <p className="text-xs text-slate-500 font-semibold">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Actor: {log.actor ? `${log.actor.first_name} ${log.actor.last_name}` : "System"} [{log.actorRole}]
                </p>
                {log.note ? <p className="text-sm text-slate-700 mt-1">{log.note}</p> : null}
              </div>
            ))
          )}
        </div>
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4">
            <h3 className="text-lg font-black text-[var(--primary)]">Tasdiqlaysizmi?</h3>
            <p className="text-sm text-slate-600">Order status <b>{order.status}</b> dan <b>{nextStatus}</b> ga o'zgaradi.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmOpen(false)} className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-sm font-bold text-slate-700">Bekor qilish</button>
              <button onClick={() => void forceChange()} disabled={saving} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-sm font-bold text-white">Tasdiqlash</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
