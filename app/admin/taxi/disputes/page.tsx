"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type Order = {
  id: string;
  createdAt: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedPrice: number;
  finalPrice: number | null;
  customer: { first_name: string; last_name: string } | null;
  driver: { first_name: string; last_name: string } | null;
};

export default function AdminTaxiDisputesPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Order[]>([]);
  const [target, setTarget] = useState<Order | null>(null);
  const [resolution, setResolution] = useState<"REFUND" | "RELEASE" | "SPLIT">("REFUND");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/taxi/disputes");
      const json = await res.json();
      setItems(json?.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function resolve() {
    if (!target) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/taxi/disputes/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution, note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Xatolik");
      toast.success("Dispute hal qilindi");
      setTarget(null);
      setNote("");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Taxi Disputes</h1>
        <p className="text-sm font-bold text-slate-400 mt-1">DISPUTE holatidagi orderlar</p>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Customer</th>
                <th>Driver</th>
                <th>Route</th>
                <th>Price</th>
                <th>Dispute date</th>
                <th className="pr-8 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-bold">Yuklanmoqda...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-bold">Dispute topilmadi</td></tr>
              ) : (
                items.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-8 text-sm font-black text-slate-900">{o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : "-"}</td>
                    <td className="py-4 text-sm font-bold text-slate-500">{o.driver ? `${o.driver.first_name} ${o.driver.last_name}` : "Tayinlanmagan"}</td>
                    <td className="py-4 text-xs font-bold text-slate-500">{o.pickupAddress} → {o.dropoffAddress}</td>
                    <td className="py-4 text-sm font-black text-slate-900">{Number(o.finalPrice ?? o.estimatedPrice).toLocaleString()}</td>
                    <td className="py-4 text-xs font-bold text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 pr-8 text-right">
                      <button onClick={() => setTarget(o)} className="adm-btn text-xs">Resolve</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {target ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4">
            <h3 className="text-lg font-black text-[var(--primary)]">Dispute resolution</h3>
            <select value={resolution} onChange={(e) => setResolution(e.target.value as "REFUND" | "RELEASE" | "SPLIT")} className="h-input">
              <option value="REFUND">Refund</option>
              <option value="RELEASE">Release</option>
              <option value="SPLIT">Split</option>
            </select>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="h-input min-h-[110px]" placeholder="Note" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setTarget(null)} className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-sm font-bold text-slate-700">Cancel</button>
              <button onClick={() => void resolve()} disabled={saving} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-sm font-bold text-white">Confirm</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
