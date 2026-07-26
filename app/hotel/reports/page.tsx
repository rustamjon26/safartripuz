"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { HotelReports, ReportsGroupBy } from "@/lib/hotel/getHotelReports";

type DatePreset = "week" | "month" | "last_month" | "year" | "custom";
type BookingStatusFilter =
  | "PENDING"
  | "HELD"
  | "PAID"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED"
  | "NO_SHOW"
  | "EXPIRED";
type StatusFilter = "ALL" | BookingStatusFilter;

const PER_PAGE = 20;

const DATE_PRESETS: Array<{ value: DatePreset; label: string }> = [
  { value: "week", label: "Bu hafta" },
  { value: "month", label: "Bu oy" },
  { value: "last_month", label: "O'tgan oy" },
  { value: "year", label: "Bu yil" },
  { value: "custom", label: "Boshqa" },
];

const GROUP_OPTIONS: Array<{ value: ReportsGroupBy; label: string }> = [
  { value: "day", label: "Kunlik" },
  { value: "week", label: "Haftalik" },
  { value: "month", label: "Oylik" },
];

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "Barchasi" },
  { value: "PENDING", label: "PENDING" },
  { value: "CONFIRMED", label: "CONFIRMED" },
  { value: "CHECKED_IN", label: "CHECKED_IN" },
  { value: "COMPLETED", label: "COMPLETED" },
  { value: "CANCELLED", label: "CANCELLED" },
  { value: "NO_SHOW", label: "NO_SHOW" },
  { value: "HELD", label: "HELD" },
  { value: "PAID", label: "PAID" },
  { value: "EXPIRED", label: "EXPIRED" },
  { value: "REFUNDED", label: "REFUNDED" },
];

const MONTHS_SHORT = [
  "yan",
  "fev",
  "mar",
  "apr",
  "may",
  "iyun",
  "iyul",
  "avg",
  "sen",
  "okt",
  "noy",
  "dek",
] as const;

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  HELD: "bg-yellow-100 text-yellow-800 border-yellow-200",
  PAID: "bg-teal-100 text-teal-800 border-teal-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  CHECKED_IN: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
  COMPLETED: "bg-slate-100 text-slate-700 border-slate-200",
  REFUNDED: "bg-orange-100 text-orange-800 border-orange-200",
  NO_SHOW: "bg-orange-100 text-orange-800 border-orange-200",
  EXPIRED: "bg-slate-100 text-slate-500 border-slate-200",
};

function formatMoney(value: number) {
  return `${value.toLocaleString("uz-UZ")} so'm`;
}

function formatShortDate(ymd: string) {
  const [, m, d] = ymd.split("-").map(Number);
  return `${d}-${MONTHS_SHORT[m - 1]}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getPresetRange(preset: Exclude<DatePreset, "custom">): { start: string; end: string } {
  const today = startOfDay(new Date());
  const end = formatYmd(today);

  if (preset === "week") {
    const weekday = today.getDay();
    const mondayOffset = weekday === 0 ? 6 : weekday - 1;
    const start = new Date(today);
    start.setDate(start.getDate() - mondayOffset);
    return { start: formatYmd(start), end };
  }

  if (preset === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: formatYmd(start), end };
  }

  if (preset === "last_month") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: formatYmd(start), end: formatYmd(lastDay) };
  }

  const start = new Date(today.getFullYear(), 0, 1);
  return { start: formatYmd(start), end };
}

function roomTypeColor(name: string, index: number) {
  const lower = name.toLowerCase();
  if (lower.includes("standart") || lower.includes("standard")) return "#3b82f6";
  if (lower.includes("lyuks") || lower.includes("lux")) return "#8b5cf6";
  if (lower.includes("suite")) return "#d97706";
  return ["#0ea5e9", "#6366f1", "#14b8a6"][index % 3];
}

function isGuestLinkId(id: string) {
  return !id.includes("|") && id.length > 8;
}

async function fetchReports(
  hotelId: string,
  start: string,
  end: string,
  groupBy: ReportsGroupBy,
): Promise<HotelReports> {
  const params = new URLSearchParams({ start, end, group_by: groupBy });
  const res = await fetch(`/api/hotels/${hotelId}/reports?${params.toString()}`);
  const data = (await res.json()) as HotelReports & { error?: string };
  if (!res.ok) throw new Error(data.error || "Hisobot yuklanmadi");
  return data;
}

function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-pulse">
      <div className="h-10 bg-slate-200 rounded-xl w-64" />
      <div className="h-28 bg-slate-200 rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="h-72 bg-slate-200 rounded-2xl" />
        <div className="h-72 bg-slate-200 rounded-2xl" />
      </div>
      <div className="h-80 bg-slate-200 rounded-2xl" />
      <div className="h-96 bg-slate-200 rounded-2xl" />
    </div>
  );
}

export default function HotelReportsPage() {
  const [hotelId, setHotelId] = useState("");
  const [data, setData] = useState<HotelReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [groupBy, setGroupBy] = useState<ReportsGroupBy>("day");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");
  const [appliedGroupBy, setAppliedGroupBy] = useState<ReportsGroupBy>("day");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [bookingsPage, setBookingsPage] = useState(1);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);

  const resolveRange = useCallback((): { start: string; end: string } | null => {
    if (datePreset === "custom") {
      if (!customStart || !customEnd) return null;
      return { start: customStart, end: customEnd };
    }
    return getPresetRange(datePreset);
  }, [datePreset, customStart, customEnd]);

  const fetchWithParams = useCallback(
    async (start: string, end: string, gb: ReportsGroupBy) => {
      if (!hotelId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await fetchReports(hotelId, start, end, gb);
        setData(result);
        setAppliedStart(start);
        setAppliedEnd(end);
        setAppliedGroupBy(gb);
        setBookingsPage(1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Hisobot yuklanmadi");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [hotelId],
  );

  const handleView = useCallback(() => {
    const range = resolveRange();
    if (!range) {
      toast.error("Sanani tanlang");
      return;
    }
    void fetchWithParams(range.start, range.end, groupBy);
  }, [resolveRange, groupBy, fetchWithParams]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const res = await fetch("/api/hotel/me");
        const me = (await res.json()) as { hotel?: { id: string } };
        if (!res.ok || !me.hotel?.id) throw new Error("Mehmonxona topilmadi");
        if (!cancelled) setHotelId(me.hotel.id);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Mehmonxona topilmadi");
          setLoading(false);
        }
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hotelId) return;
    const range = getPresetRange("month");
    setCustomStart(range.start);
    setCustomEnd(range.end);
    void fetchWithParams(range.start, range.end, "day");
  }, [hotelId, fetchWithParams]);

  const filteredBookings = useMemo(() => {
    if (!data) return [];
    if (statusFilter === "ALL") return data.bookings_detail;
    return data.bookings_detail.filter((row) => row.status === statusFilter);
  }, [data, statusFilter]);

  const bookingsPagination = useMemo(() => {
    const total = filteredBookings.length;
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const page = Math.min(bookingsPage, totalPages);
    const startIdx = (page - 1) * PER_PAGE;
    return {
      total,
      page,
      totalPages,
      items: filteredBookings.slice(startIdx, startIdx + PER_PAGE),
    };
  }, [filteredBookings, bookingsPage]);

  const occupancyDonut = useMemo(() => {
    const rate = data?.summary.occupancy_rate ?? 0;
    return [
      { name: "Band", value: rate, color: "#22c55e" },
      { name: "Bo'sh", value: Math.max(0, 100 - rate), color: "#e5e7eb" },
    ];
  }, [data?.summary.occupancy_rate]);

  const roomTypeChartData = useMemo(() => {
    if (!data) return [];
    return data.room_type_breakdown.map((row, index) => ({
      ...row,
      fill: roomTypeColor(row.room_type, index),
    }));
  }, [data]);

  function handlePresetChange(preset: DatePreset) {
    setDatePreset(preset);
    if (preset !== "custom") {
      const range = getPresetRange(preset);
      setCustomStart(range.start);
      setCustomEnd(range.end);
    }
  }

  async function handleExport(type: "PDF" | "EXCEL") {
    if (!hotelId || !appliedStart || !appliedEnd) {
      toast.error("Avval hisobotni yuklang");
      return;
    }

    const params = new URLSearchParams({
      start: appliedStart,
      end: appliedEnd,
      group_by: appliedGroupBy,
    });
    const [, year, month] = appliedEnd.match(/^(\d{4})-(\d{2})/) ?? [];

    if (type === "EXCEL") {
      setExcelLoading(true);
      try {
        const res = await fetch(
          `/api/hotels/${hotelId}/reports/export/excel?${params.toString()}`,
        );
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error || "Excel yuklab olinmadi");
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download =
          year && month ? `safartrip-hisobot-${year}-${month}.xlsx` : "hisobot.xlsx";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
        toast.success("Excel yuklab olindi");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Excel yuklab olinmadi");
      } finally {
        setExcelLoading(false);
      }
      return;
    }

    setPdfLoading(true);
    try {
      const res = await fetch(
        `/api/hotels/${hotelId}/reports/export/pdf?${params.toString()}`,
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "PDF yuklab olinmadi");
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download =
        year && month ? `safartrip-report-${year}-${month}.pdf` : "safartrip-report.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("PDF yuklab olindi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF yuklab olinmadi");
    } finally {
      setPdfLoading(false);
    }
  }

  if (!hotelId && loading) return <PageSkeleton />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-10">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary)]">Hisobotlar</h1>
          {appliedStart && appliedEnd && (
            <p className="text-sm font-bold text-slate-400 mt-1">
              {formatShortDate(appliedStart)} — {formatShortDate(appliedEnd)}
              {" · "}
              {GROUP_OPTIONS.find((g) => g.value === appliedGroupBy)?.label}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleExport("PDF")}
            disabled={pdfLoading || !appliedStart || !appliedEnd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-[12px] font-black uppercase tracking-wide hover:bg-slate-50 disabled:opacity-50"
          >
            {pdfLoading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            PDF yuklab olish
          </button>
          <button
            type="button"
            onClick={() => handleExport("EXCEL")}
            disabled={excelLoading || !appliedStart || !appliedEnd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-[12px] font-black uppercase tracking-wide hover:bg-slate-50 disabled:opacity-50"
          >
            {excelLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Excel yuklab olish
          </button>
        </div>
      </header>

      {/* Filters */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Tez tanlash
            </p>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handlePresetChange(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide border transition-all ${
                    datePreset === option.value
                      ? "bg-[var(--bg-light-blue)] text-[var(--primary)] border-[var(--accent)]"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {datePreset === "custom" && (
              <div className="flex flex-wrap items-end gap-2 mt-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                    Dan
                  </label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                    Gacha
                  </label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Guruh
            </p>
            <div className="flex flex-wrap gap-2">
              {GROUP_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGroupBy(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide border transition-all ${
                    groupBy === option.value
                      ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleView}
            disabled={loading || (datePreset === "custom" && (!customStart || !customEnd))}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white text-[12px] font-black uppercase tracking-wide hover:opacity-90 disabled:opacity-50 shrink-0"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Ko&apos;rish
          </button>
        </div>
      </section>

      {loading && hotelId ? (
        <PageSkeleton />
      ) : error ? (
        <div className="bg-white border border-red-200 rounded-2xl p-10 text-center">
          <AlertCircle size={32} className="mx-auto text-red-500 mb-3" />
          <p className="text-sm font-bold text-red-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={handleView}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-[12px] font-black uppercase"
          >
            <RefreshCw size={14} />
            Qayta urinish
          </button>
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Jami daromad
              </p>
              <p className="text-2xl font-black text-green-600 mt-2 tabular-nums">
                {formatMoney(data.summary.total_revenue)}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Jami bronlar
              </p>
              <p className="text-2xl font-black text-[var(--primary)] mt-2 tabular-nums">
                {data.summary.total_bookings.toLocaleString("uz-UZ")} ta
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Jami tunlar
              </p>
              <p className="text-2xl font-black text-[var(--primary)] mt-2 tabular-nums">
                {data.summary.total_nights.toLocaleString("uz-UZ")} tun
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                O&apos;rtacha kunlik tarif
              </p>
              <p className="text-2xl font-black text-[var(--primary)] mt-2 tabular-nums">
                {formatMoney(data.summary.avg_daily_rate)}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="relative w-20 h-20 shrink-0">
                <PieChart width={80} height={80}>
                  <Pie
                    data={occupancyDonut}
                    dataKey="value"
                    cx={40}
                    cy={40}
                    innerRadius={24}
                    outerRadius={36}
                    stroke="none"
                  >
                    {occupancyDonut.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-sm font-black text-green-600 tabular-nums">
                    {data.summary.occupancy_rate}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Band bo&apos;lish darajasi
                </p>
                <p className="text-xl font-black text-green-600 mt-1 tabular-nums">
                  {data.summary.occupancy_rate}%
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Mehmonlar
              </p>
              <div className="mt-2 space-y-1">
                <p className="text-lg font-black text-[var(--primary)]">
                  Yangi:{" "}
                  <span className="tabular-nums">
                    {data.summary.new_guests.toLocaleString("uz-UZ")} ta
                  </span>
                </p>
                <p className="text-lg font-black text-slate-600">
                  Qaytib kelgan:{" "}
                  <span className="tabular-nums">
                    {data.summary.returning_guests.toLocaleString("uz-UZ")} ta
                  </span>
                </p>
              </div>
            </div>
          </section>

          {/* Revenue + occupancy charts */}
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h2 className="text-sm font-black text-[var(--primary)] mb-4">Daromad grafigi</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.revenue_chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      tick={{ fontSize: 11, fontWeight: 700 }}
                    />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                      tick={{ fontSize: 11, fontWeight: 700 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      allowDecimals={false}
                      tick={{ fontSize: 11, fontWeight: 700 }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const revenue = payload.find((p) => p.dataKey === "revenue")?.value as
                          | number
                          | undefined;
                        const bookings = payload.find((p) => p.dataKey === "bookings")?.value as
                          | number
                          | undefined;
                        return (
                          <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs font-bold">
                            <p className="text-slate-500 mb-1">{formatShortDate(String(label))}</p>
                            <p className="text-blue-600">
                              {formatMoney(revenue ?? 0)} — {bookings ?? 0} bron
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      name="Daromad"
                      fill="#3b82f6"
                      fillOpacity={0.25}
                      stroke="#3b82f6"
                      strokeWidth={2}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="bookings"
                      name="Bronlar"
                      fill="#94a3b8"
                      barSize={14}
                      radius={[4, 4, 0, 0]}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h2 className="text-sm font-black text-[var(--primary)] mb-4">
                Band bo&apos;lish grafigi
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.occupancy_chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      tick={{ fontSize: 11, fontWeight: 700 }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11, fontWeight: 700 }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0]?.payload as HotelReports["occupancy_chart"][number];
                        return (
                          <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs font-bold">
                            <p className="text-slate-500 mb-1">{formatShortDate(String(label))}</p>
                            <p className="text-green-600">
                              {row.occupied}/{row.total} xona — {row.rate}%
                            </p>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine
                      y={50}
                      stroke="#94a3b8"
                      strokeDasharray="4 4"
                      label={{ value: "50%", position: "insideTopRight", fontSize: 11 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      name="Bandlik %"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Room type + top guests */}
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h2 className="text-sm font-black text-[var(--primary)] mb-4">Xona turi tahlili</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={roomTypeChartData}
                    layout="vertical"
                    margin={{ left: 8, right: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fontWeight: 700 }} />
                    <YAxis
                      type="category"
                      dataKey="room_type"
                      width={90}
                      tick={{ fontSize: 11, fontWeight: 700 }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0]?.payload as (typeof roomTypeChartData)[number];
                        return (
                          <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs font-bold">
                            <p className="text-slate-800 mb-1">{row.room_type}</p>
                            <p>{row.bookings} bron · {formatMoney(row.revenue)}</p>
                          </div>
                        );
                      }}
                    />
                    <Legend />
                    <Bar dataKey="bookings" name="Bronlar" radius={[0, 4, 4, 0]}>
                      {roomTypeChartData.map((entry) => (
                        <Cell key={`b-${entry.room_type}`} fill={entry.fill} />
                      ))}
                    </Bar>
                    <Bar dataKey="revenue" name="Daromad" fill="#cbd5e1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h2 className="text-sm font-black text-[var(--primary)]">Top 10 mehmon</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Ism
                      </th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Tashriflar
                      </th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Jami xarajat
                      </th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        O&apos;rtacha
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_guests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm font-bold text-slate-400">
                          Mehmonlar topilmadi
                        </td>
                      </tr>
                    ) : (
                      data.top_guests.map((guest) => (
                        <tr key={guest.guest_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-sm font-bold text-slate-800">{guest.name}</td>
                          <td className="px-4 py-3 text-sm font-bold text-slate-600 tabular-nums">
                            {guest.visits}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-slate-800 tabular-nums">
                            {formatMoney(guest.total_spent)}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-slate-600 tabular-nums">
                            {formatMoney(Math.round(guest.total_spent / Math.max(1, guest.visits)))}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isGuestLinkId(guest.guest_id) ? (
                              <Link
                                href={`/hotel/guests/${guest.guest_id}`}
                                className="text-[11px] font-black uppercase text-[var(--accent)] hover:underline"
                              >
                                Ko&apos;rish →
                              </Link>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Bookings detail table */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm font-black text-[var(--primary)]">
                Bron tafsilotlari ({bookingsPagination.total.toLocaleString("uz-UZ")} ta)
              </h2>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(option.value);
                      setBookingsPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border transition-all ${
                      statusFilter === option.value
                        ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    {[
                      "Mehmon",
                      "Xona",
                      "Tur",
                      "Kirish",
                      "Chiqish",
                      "Tunlar",
                      "Summa",
                      "Status",
                      "To'lov",
                    ].map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookingsPagination.items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-10 text-center text-sm font-bold text-slate-400"
                      >
                        Bronlar topilmadi
                      </td>
                    </tr>
                  ) : (
                    bookingsPagination.items.map((row) => (
                      <tr
                        key={row.booking_id}
                        className="border-b border-slate-50 hover:bg-slate-50/50"
                      >
                        <td className="px-4 py-3 text-sm font-bold text-slate-800">
                          {row.guest_name}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-600">
                          {row.room_number ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-600">
                          {row.room_type ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-600 tabular-nums">
                          {formatShortDate(row.check_in)}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-600 tabular-nums">
                          {formatShortDate(row.check_out)}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-600 tabular-nums">
                          {row.nights}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-800 tabular-nums">
                          {formatMoney(row.total_amount)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-600 uppercase">
                          {row.payment_method}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {bookingsPagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400">
                  {bookingsPagination.page} / {bookingsPagination.totalPages} sahifa
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={bookingsPagination.page <= 1}
                    onClick={() => setBookingsPage((p) => Math.max(1, p - 1))}
                    className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={bookingsPagination.page >= bookingsPagination.totalPages}
                    onClick={() =>
                      setBookingsPage((p) => Math.min(bookingsPagination.totalPages, p + 1))
                    }
                    className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
