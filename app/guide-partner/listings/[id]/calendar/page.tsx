"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

type ScheduleDay = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
};

type BlockedSlot = {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
};

type Booking = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  guest: { first_name: string; last_name: string } | null;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const REASONS = ["HOST_BLOCKED", "MAINTENANCE", "PERSONAL"] as const;

export default function GuideListingCalendarPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [schedule, setSchedule] = useState<ScheduleDay[]>(
    Array.from({ length: 7 }).map((_, dayOfWeek) => ({
      dayOfWeek,
      startTime: "09:00",
      endTime: "18:00",
      isAvailable: true,
    })),
  );
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocked, setBlocked] = useState<BlockedSlot[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({
    date: "",
    startTime: "",
    endTime: "",
    reason: "HOST_BLOCKED",
  });

  async function loadAll() {
    setLoading(true);
    try {
      const [sRes, bRes, bkRes] = await Promise.all([
        fetch("/api/guide/partner/availability"),
        fetch("/api/guide/partner/availability/blocked"),
        fetch("/api/guide/partner/bookings?limit=300"),
      ]);
      const sData = await sRes.json();
      const bData = await bRes.json();
      const bkData = await bkRes.json();

      if (sRes.ok && sData.success && Array.isArray(sData.data)) {
        setSchedule(
          sData.data.map((row: { dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean }) => ({
            dayOfWeek: row.dayOfWeek,
            startTime: row.startTime,
            endTime: row.endTime,
            isAvailable: row.isAvailable,
          })),
        );
      }
      if (bRes.ok && bData.success) setBlocked((bData.data?.data || []) as BlockedSlot[]);
      if (bkRes.ok && bkData.success) setBookings((bkData.data?.data || []) as Booking[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.id) void loadAll();
  }, [params.id]);

  const blockedMap = useMemo(() => {
    const map = new Map<string, BlockedSlot[]>();
    for (const item of blocked) {
      const key = item.date.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return map;
  }, [blocked]);

  const bookingsMap = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const item of bookings) {
      const key = item.date.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return map;
  }, [bookings]);

  const daysInGrid = useMemo(() => {
    const start = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const end = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
    const startWeekDay = start.getDay();
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

  function dayColor(iso: string) {
    const day = new Date(iso).getDay();
    const scheduleDay = schedule.find((s) => s.dayOfWeek === day);
    const slots = blockedMap.get(iso) ?? [];
    const dayBookings = bookingsMap.get(iso) ?? [];

    if (!scheduleDay?.isAvailable) return "bg-slate-200 text-slate-700 border-slate-300";
    if (dayBookings.some((b) => b.status === "CONFIRMED")) return "bg-red-100 text-red-700 border-red-300";
    if (dayBookings.some((b) => b.status === "PENDING")) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    if (slots.length > 0) return "bg-orange-100 text-orange-800 border-orange-300";
    return "bg-white text-slate-700 border-slate-200 hover:bg-slate-50";
  }

  function tooltip(iso: string) {
    const dayBookings = bookingsMap.get(iso) ?? [];
    if (!dayBookings.length) return "";
    return dayBookings
      .map((b) => `${b.startTime}-${b.endTime} ${b.guest ? `${b.guest.first_name} ${b.guest.last_name}` : "Customer"}`)
      .join(" | ");
  }

  function onDateClick(iso: string) {
    const day = new Date(iso).getDay();
    const scheduleDay = schedule.find((s) => s.dayOfWeek === day);
    if (!scheduleDay?.isAvailable) return;
    setBlockForm({ date: iso, startTime: "", endTime: "", reason: "HOST_BLOCKED" });
    setModalOpen(true);
  }

  async function saveSchedule() {
    try {
      const res = await fetch("/api/guide/partner/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "Saqlashda xatolik");
      toast.success("Haftalik schedule saqlandi");
      void loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    }
  }

  async function blockSlot(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/guide/partner/availability/blocked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: blockForm.date,
          startTime: blockForm.startTime || undefined,
          endTime: blockForm.endTime || undefined,
          reason: blockForm.reason,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "Block qilishda xatolik");
      toast.success("Slot blocked");
      setModalOpen(false);
      void loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight">Guide Calendar</h1>
          <p className="text-[13px] font-semibold text-slate-500 mt-1">Availability + bookings boshqaruvi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4 text-slate-700 font-bold">
            <div className="flex items-center gap-2"><CalendarDays size={18} /> Monthly calendar</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setMonthCursor((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1))} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white">Prev</button>
              <div className="text-sm font-black min-w-[140px] text-center">{monthCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</div>
              <button onClick={() => setMonthCursor((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1))} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white">Next</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-4">
            {DAY_LABELS.map((w) => (
              <div key={w} className="text-[11px] font-black uppercase tracking-wider text-slate-400 text-center py-1">{w}</div>
            ))}
            {daysInGrid.map((d, idx) => (
              <button
                key={`${d.iso}-${idx}`}
                type="button"
                disabled={!d.inMonth}
                title={d.iso ? tooltip(d.iso) : ""}
                onClick={() => d.inMonth && d.iso && onDateClick(d.iso)}
                className={`h-12 rounded-lg border text-sm font-bold transition ${d.inMonth ? dayColor(d.iso) : "border-transparent bg-transparent text-transparent"}`}
              >
                {d.day || ""}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="px-2 py-1 rounded border bg-slate-200 border-slate-300">Gray = unavailable</span>
            <span className="px-2 py-1 rounded border bg-red-100 border-red-300">Red = confirmed</span>
            <span className="px-2 py-1 rounded border bg-yellow-100 border-yellow-300">Yellow = pending</span>
            <span className="px-2 py-1 rounded border bg-orange-100 border-orange-300">Orange = blocked slot</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <h3 className="font-extrabold text-[var(--primary)] text-[15px] mb-3">Weekly availability</h3>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="space-y-2">
              {schedule.map((day) => (
                <div key={day.dayOfWeek} className="border border-slate-200 rounded-xl p-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-black uppercase text-slate-500">{DAY_LABELS[day.dayOfWeek]}</p>
                    <button
                      type="button"
                      onClick={() =>
                        setSchedule((prev) =>
                          prev.map((row) =>
                            row.dayOfWeek === day.dayOfWeek ? { ...row, isAvailable: !row.isAvailable } : row,
                          ),
                        )
                      }
                      className={`px-2 py-1 rounded text-[10px] font-black border ${
                        day.isAvailable ? "bg-green-50 border-green-200 text-green-700" : "bg-slate-100 border-slate-200 text-slate-600"
                      }`}
                    >
                      {day.isAvailable ? "Available" : "Unavailable"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="time" value={day.startTime} onChange={(e) => setSchedule((prev) => prev.map((row) => row.dayOfWeek === day.dayOfWeek ? { ...row, startTime: e.target.value } : row))} className="h-input" />
                    <input type="time" value={day.endTime} onChange={(e) => setSchedule((prev) => prev.map((row) => row.dayOfWeek === day.dayOfWeek ? { ...row, endTime: e.target.value } : row))} className="h-input" />
                  </div>
                </div>
              ))}
              <button onClick={() => void saveSchedule()} className="w-full mt-3 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-black">
                Saqlash
              </button>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <form onSubmit={blockSlot} className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4">
            <h3 className="text-lg font-black text-[var(--primary)]">Block slot</h3>
            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Date</label>
              <input type="date" value={blockForm.date} onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })} className="h-input" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">StartTime</label>
                <input type="time" value={blockForm.startTime} onChange={(e) => setBlockForm({ ...blockForm, startTime: e.target.value })} className="h-input" />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">EndTime</label>
                <input type="time" value={blockForm.endTime} onChange={(e) => setBlockForm({ ...blockForm, endTime: e.target.value })} className="h-input" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Reason</label>
              <select value={blockForm.reason} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })} className="h-input">
                {REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-sm font-bold text-slate-700">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--primary)] text-sm font-bold text-white">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
