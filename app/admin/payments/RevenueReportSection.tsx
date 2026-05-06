"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

type BreakdownRow = {
  type: string;
  count: number;
  total: number;
  platformFee: number;
};

const LABELS: Record<string, string> = {
  HOTEL: "Hotel",
  HOMESTAY: "Uy Mehmonxona",
  TAXI: "Taxi",
  GUIDE: "Ekskursiya",
  OTHER: "Boshqa",
};

function defaultRange() {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function RevenueReportSection() {
  const [{ start, end }, setRange] = useState(defaultRange);
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<BreakdownRow[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [totalPlatformFee, setTotalPlatformFee] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate: start, endDate: end });
      const res = await fetch(`/api/admin/payments/revenue?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Xatolik");
      setBreakdown(data.breakdown ?? []);
      setGrandTotal(Number(data.grandTotal ?? 0));
      setTotalPlatformFee(Number(data.totalPlatformFee ?? 0));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxBar = useMemo(() => Math.max(...breakdown.map((b) => b.total), 1), [breakdown]);

  function exportCsv() {
    const bom = "\uFEFF";
    const header = ["tur", "soni", "jami_uzs", "platforma_ulushi_uzs"];
    const rows = breakdown.map((b) => [
      b.type,
      String(b.count),
      String(b.total),
      String(b.platformFee),
    ]);
    const tail = [["JAMI", "", String(grandTotal), String(totalPlatformFee)]];
    const content =
      bom +
      [header, ...rows, ...tail].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-${start}-${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Daromad hisoboti</h2>
          <p className="text-sm font-bold text-slate-400 mt-1">Muvaffaqiyatli to&apos;lovlar, tur bo&apos;yicha</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase">Dan</label>
            <input
              type="date"
              className="h-input mt-1 block"
              value={start}
              onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase">Gacha</label>
            <input
              type="date"
              className="h-input mt-1 block"
              value={end}
              onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
            />
          </div>
          <button type="button" className="adm-btn" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Yangilash"}
          </button>
          <button type="button" className="adm-btn adm-btn-primary inline-flex items-center gap-2" onClick={exportCsv}>
            <Download size={16} />
            CSV
          </button>
        </div>
      </div>

      <div className="adm-table-wrap border border-slate-100 rounded-2xl overflow-hidden">
        <table className="adm-table">
          <thead>
            <tr>
              <th className="pl-6">Tur</th>
              <th>Soni</th>
              <th>Jami</th>
              <th className="pr-6">Platforma (15%)</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((b) => (
              <tr key={b.type}>
                <td className="py-3 pl-6 font-black text-slate-900">{LABELS[b.type] ?? b.type}</td>
                <td className="py-3 font-bold text-slate-600">{b.count}</td>
                <td className="py-3 font-black text-slate-900">{b.total.toLocaleString()} UZS</td>
                <td className="py-3 pr-6 font-bold text-slate-600">{b.platformFee.toLocaleString()} UZS</td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-black">
              <td className="py-3 pl-6">Jami</td>
              <td className="py-3">—</td>
              <td className="py-3">{grandTotal.toLocaleString()} UZS</td>
              <td className="py-3 pr-6">{totalPlatformFee.toLocaleString()} UZS</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <div className="text-xs font-black text-slate-400 uppercase mb-2">Diagramma (jami)</div>
        <div className="flex items-end gap-3 h-36 px-2">
          {breakdown
            .filter((b) => b.type !== "OTHER" || b.total > 0)
            .map((b) => {
              const h = Math.max(8, Math.round((b.total / maxBar) * 120));
              return (
                <div key={b.type} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                  <div className="text-[10px] font-black text-slate-700 truncate w-full text-center">
                    {(b.total / 1000).toFixed(0)}k
                  </div>
                  <div className="w-full h-[124px] flex items-end justify-center bg-slate-100 rounded-t-lg">
                    <div className="w-[70%] max-w-[48px] rounded-t-lg bg-emerald-500" style={{ height: `${h}px` }} />
                  </div>
                  <div className="text-[9px] font-bold text-slate-400 text-center leading-tight">
                    {LABELS[b.type] ?? b.type}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
