"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Order = {
  id: string;
  status: string;
  createdAt: string;
  estimatedPrice: number;
  finalPrice: number | null;
  pickupAddress: string;
  dropoffAddress: string;
  customer: { first_name: string; last_name: string } | null;
  driver: { first_name: string; last_name: string } | null;
};

export default function AdminTaxiOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Order[]>([]);
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [revenue, setRevenue] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "500");
      if (status) params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/admin/taxi/orders?${params.toString()}`);
      const json = await res.json();
      setItems(json?.data || []);
      setRevenue(Number(json?.totals?.totalRevenue ?? 0));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [status, from, to]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Taxi Orders</h1>
        <p className="text-sm font-bold text-slate-400 mt-1">Platformadagi barcha taxi orderlar</p>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 p-6 bg-white space-y-4">
        <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner w-full sm:w-fit overflow-x-auto">
          {["", "PENDING", "ACCEPTED", "ARRIVED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DISPUTE"].map((st) => (
            <button
              key={st || "all"}
              onClick={() => setStatus(st)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                status === st ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
              }`}
            >
              {st || "ALL"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-input" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-input" />
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Customer</th>
                <th>Driver</th>
                <th>Pickup</th>
                <th>Dropoff</th>
                <th>Estimated</th>
                <th>Status</th>
                <th className="pr-8">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="py-20 text-center text-slate-400 font-bold">Yuklanmoqda...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="py-20 text-center text-slate-400 font-bold">Order topilmadi</td></tr>
              ) : (
                items.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => router.push(`/admin/taxi/orders/${o.id}`)}>
                    <td className="py-4 pl-8 text-sm font-black text-slate-900">{o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : "-"}</td>
                    <td className="py-4 text-sm font-bold text-slate-500">{o.driver ? `${o.driver.first_name} ${o.driver.last_name}` : "Tayinlanmagan"}</td>
                    <td className="py-4 text-xs font-bold text-slate-500">{o.pickupAddress}</td>
                    <td className="py-4 text-xs font-bold text-slate-500">{o.dropoffAddress}</td>
                    <td className="py-4 text-sm font-black text-slate-900">{Number(o.estimatedPrice).toLocaleString()}</td>
                    <td className="py-4 text-xs font-black text-slate-600">{o.status}</td>
                    <td className="py-4 pr-8 text-xs font-bold text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-100">
                <td colSpan={4} className="py-4 pl-8 text-sm font-black text-slate-700">Completed revenue (filtered)</td>
                <td colSpan={3} className="py-4 pr-8 text-right text-sm font-black text-slate-900">{revenue.toLocaleString()} UZS</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
