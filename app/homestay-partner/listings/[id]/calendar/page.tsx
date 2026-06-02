"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CalendarDays, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

type Block = {
  id: string;
  startDate: string;
  endDate: string;
  reason: "BOOKED" | "HOST_BLOCKED" | "MAINTENANCE";
};

const REASON_LABELS: Record<Block["reason"], string> = {
  BOOKED: "Band",
  HOST_BLOCKED: "Bloklangan",
  MAINTENANCE: "Ta'mirlash",
};

const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

export default function ListingCalendarPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState({ startDate: "", endDate: "", reason: "HOST_BLOCKED" as "HOST_BLOCKED" | "MAINTENANCE" });
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selection, setSelection] = useState<{ start?: string; end?: string }>({});
  const [onboarding, setOnboarding] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/homestay/host/listings/${params.id}/availability`);
      const data = await res.json();
      if (res.ok && data.onboarding) {
        setOnboarding(true);
        setBlocks([]);
        return;
      }
      if (res.ok && data.success) setBlocks(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.id) void load();
  }, [params.id]);

  const grouped = useMemo(() => {
    return blocks.map((b) => ({
      ...b,
      start: new Date(b.startDate).toLocaleDateString(),
      end: new Date(b.endDate).toLocaleDateString(),
      color:
        b.reason === "BOOKED"
          ? "bg-red-50 text-red-700 border-red-200"
          : "bg-slate-100 text-slate-700 border-slate-200",
    }));
  }, [blocks]);

  const daysInGrid = useMemo(() => {
    const start = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const end = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
    const startWeekDay = (start.getDay() + 6) % 7;
    const totalDays = end.getDate();
    const list: Array<{ iso: string; day: number; inMonth: boolean }> = [];
    for (let i = 0; i < startWeekDay; i += 1) list.push({ iso: "", day: 0, inMonth: false });
    for (let d = 1; d <= totalDays; d += 1) {
      const date = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), d);
      list.push({ iso: date.toISOString().slice(0, 10), day: d, inMonth: true });
    }
    while (list.length % 7 !== 0) list.push({ iso: "", day: 0, inMonth: false });
    return list;
  }, [monthCursor]);

  function dayStyle(iso: string) {
    const date = new Date(iso);
    const found = blocks.find((b) => {
      const s = new Date(b.startDate);
      const e = new Date(b.endDate);
      return date >= s && date <= e;
    });
    if (!found) return "bg-white text-slate-700 border-slate-200 hover:bg-slate-50";
    if (found.reason === "BOOKED") return "bg-red-50 text-red-700 border-red-200";
    return "bg-slate-100 text-slate-700 border-slate-300";
  }

  function selectFreeDay(iso: string) {
    const isBlocked = blocks.some((b) => {
      const d = new Date(iso);
      return d >= new Date(b.startDate) && d <= new Date(b.endDate);
    });
    if (isBlocked) return;
    if (!selection.start || (selection.start && selection.end)) {
      setSelection({ start: iso, end: undefined });
      return;
    }
    const start = new Date(selection.start);
    const end = new Date(iso);
    if (end < start) {
      setSelection({ start: iso, end: selection.start });
      setRange((prev) => ({ ...prev, startDate: iso, endDate: selection.start! }));
    } else {
      setSelection({ start: selection.start, end: iso });
      setRange((prev) => ({ ...prev, startDate: selection.start!, endDate: iso }));
    }
    setOpen(true);
  }

  async function createBlock(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/homestay/host/listings/${params.id}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(range),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "Saqlashda xatolik yuz berdi");
      toast.success("Sana oralig'i bloklandi");
      setOpen(false);
      setRange({ startDate: "", endDate: "", reason: "HOST_BLOCKED" });
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi, qayta urinib ko'ring");
    }
  }

  async function removeBlock(availId: string) {
    try {
      const res = await fetch(`/api/homestay/host/listings/${params.id}/availability/${availId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "Saqlashda xatolik yuz berdi");
      toast.success("Blok olib tashlandi");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi, qayta urinib ko'ring");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight">
            Mavjudlik kalendari
          </h1>
          <p className="text-[13px] font-semibold text-slate-500 mt-1">Band sanalar qizil, mezbon bloklari kulrang</p>
        </div>
        <button onClick={() => setOpen(true)} className="px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-[13px] font-black">
          Sanalarni bloklash
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
        {onboarding ? (
          <EmptyState
            title="Listing topilmadi"
            message="Kalendar ishlashi uchun faol listing kerak."
            ctaHref="/homestay-partner/listings/new"
            ctaLabel="Listing yaratish"
          />
        ) : null}
        <div className="flex items-center justify-between mb-4 text-slate-700 font-bold">
          <div className="flex items-center gap-2">
          <CalendarDays size={18} />
          Oylik ko&apos;rinish
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white"
            >
              Oldingi
            </button>
            <div className="text-sm font-black min-w-[140px] text-center">
              {monthCursor.toLocaleDateString("uz-UZ", { month: "long", year: "numeric" })}
            </div>
            <button
              onClick={() =>
                setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white"
            >
              Keyingi
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 mb-4">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-[11px] font-black uppercase tracking-wider text-slate-400 text-center py-1">
              {w}
            </div>
          ))}
          {daysInGrid.map((d, idx) => (
            <button
              key={`${d.iso}-${idx}`}
              type="button"
              disabled={!d.inMonth}
              onClick={() => d.inMonth && d.iso && selectFreeDay(d.iso)}
              className={`h-12 rounded-lg border text-sm font-bold transition ${d.inMonth ? dayStyle(d.iso) : "border-transparent bg-transparent text-transparent"}`}
            >
              {d.day || ""}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="space-y-2 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="py-10 text-center text-slate-400 font-semibold">Bloklangan sanalar yo&apos;q</div>
        ) : (
          <div className="space-y-2">
            {grouped.map((b) => (
              <div key={b.id} className={`flex items-center justify-between border rounded-xl px-3 py-2 ${b.color}`}>
                <div>
                  <div className="text-xs font-black uppercase">{REASON_LABELS[b.reason]}</div>
                  <div className="text-sm font-bold">
                    {b.start} - {b.end}
                  </div>
                </div>
                {b.reason !== "BOOKED" && (
                  <button
                    onClick={() => void removeBlock(b.id)}
                    title="Blokdan chiqarish"
                    className="p-1.5 hover:bg-white/60 rounded-md"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <form onSubmit={createBlock} className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4">
            <h3 className="text-lg font-black text-[var(--primary)]">Sanalarni bloklash</h3>
            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Boshlanish sanasi</label>
              <input type="date" value={range.startDate} onChange={(e) => setRange({ ...range, startDate: e.target.value })} className="h-input" required />
            </div>
            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Tugash sanasi</label>
              <input type="date" value={range.endDate} onChange={(e) => setRange({ ...range, endDate: e.target.value })} className="h-input" required />
            </div>
            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Sabab</label>
              <select value={range.reason} onChange={(e) => setRange({ ...range, reason: e.target.value as "HOST_BLOCKED" | "MAINTENANCE" })} className="h-input">
                <option value="HOST_BLOCKED">Bloklangan</option>
                <option value="MAINTENANCE">Ta&apos;mirlash</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-sm font-bold text-slate-700">
                Bekor qilish
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--primary)] text-sm font-bold text-white">
                Saqlash
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
