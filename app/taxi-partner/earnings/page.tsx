"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

type Earning = {
  id: string;
  createdAt: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: "PENDING" | "SETTLED";
  order: {
    pickupAddress: string;
    dropoffAddress: string;
  };
};

export default function TaxiEarningsPage() {
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${m}`;
  });
  const [items, setItems] = useState<Earning[]>([]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/taxi/driver/earnings?month=${month}`);
      const json = await res.json();
      if (res.ok && json.success) setItems(json.data?.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [month]);

  const summary = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          acc.gross += Number(item.grossAmount);
          acc.fee += Number(item.platformFee);
          acc.net += Number(item.netAmount);
          return acc;
        },
        { gross: 0, fee: 0, net: 0 },
      ),
    [items],
  );

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-3">
        <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight">Earnings</h1>
        <p className="text-[13px] font-semibold text-slate-500 mt-1">Daromadlar jadvali</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Month</label>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-input max-w-xs" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Gross">{summary.gross.toLocaleString()} UZS</Card>
        <Card title="Platform fee (15%)">{summary.fee.toLocaleString()} UZS</Card>
        <Card title="Net">{summary.net.toLocaleString()} UZS</Card>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5">Route</th>
                <th className="py-3 px-5">Gross</th>
                <th className="py-3 px-5">Fee</th>
                <th className="py-3 px-5">Net</th>
                <th className="py-3 px-5">Status</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 px-5">
                    <EmptyState
                      title="Daromadlar yo'q"
                      message="Hali yakunlangan safarlar bo'lmagan."
                      ctaHref="/taxi-partner/orders"
                      ctaLabel="Buyurtmalarni ko'rish"
                    />
                  </td>
                </tr>
              ) : (
                items.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 px-5">{new Date(e.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-5">{e.order?.pickupAddress} → {e.order?.dropoffAddress}</td>
                    <td className="py-3 px-5 font-black">{Number(e.grossAmount).toLocaleString()}</td>
                    <td className="py-3 px-5">{Number(e.platformFee).toLocaleString()}</td>
                    <td className="py-3 px-5 font-black">{Number(e.netAmount).toLocaleString()}</td>
                    <td className="py-3 px-5">
                      <span className={`px-2 py-1 rounded border text-[10px] font-black uppercase ${e.status === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-green-50 text-green-700 border-green-200"}`}>
                        {e.status}
                      </span>
                    </td>
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
      <div className="text-2xl font-black text-[var(--primary)] mt-1">{children}</div>
    </div>
  );
}
