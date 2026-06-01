"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";
import type { BookingDetail } from "@/lib/hotel/getBookingDetail";
import type { ListBookingsResult } from "@/lib/hotel/listHotelBookings";

type StatusFilter = "ALL" | "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";
type DateFilter = "all" | "today" | "week" | "month" | "range";

type BookingStatus = BookingDetail["status"];

const PER_PAGE = 20;

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "Barchasi" },
  { value: "PENDING", label: "PENDING" },
  { value: "CONFIRMED", label: "CONFIRMED" },
  { value: "CHECKED_IN", label: "CHECKED_IN" },
  { value: "CHECKED_OUT", label: "CHECKED_OUT" },
  { value: "CANCELLED", label: "CANCELLED" },
];

const DATE_OPTIONS: Array<{ value: DateFilter; label: string }> = [
  { value: "all", label: "Barcha sanalar" },
  { value: "today", label: "Bugun" },
  { value: "week", label: "Bu hafta" },
  { value: "month", label: "Bu oy" },
  { value: "range", label: "Oraliq" },
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

const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  CHECKED_IN: "bg-green-100 text-green-800 border-green-200",
  CHECKED_OUT: "bg-slate-100 text-slate-700 border-slate-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
  COMPLETED: "bg-slate-100 text-slate-700 border-slate-200",
  NO_SHOW: "bg-orange-100 text-orange-800 border-orange-200",
};

function formatMoney(value: number) {
  return `${value.toLocaleString("uz-UZ")} so'm`;
}

function formatShortDate(ymd: string) {
  const [, m, d] = ymd.split("-").map(Number);
  return `${d}-${MONTHS_SHORT[m - 1]}`;
}

function roomLabel(booking: BookingDetail) {
  const number = booking.room.room_number ?? "—";
  const type = booking.room.room_type.name;
  return `${number} · ${type}`;
}

async function fetchBookings(
  hotelId: string,
  opts: {
    status: StatusFilter;
    dateFilter: DateFilter;
    startDate: string;
    endDate: string;
    search: string;
    page: number;
  },
): Promise<ListBookingsResult> {
  const params = new URLSearchParams({
    page: String(opts.page),
    per_page: String(PER_PAGE),
  });

  if (opts.status !== "ALL") params.set("status", opts.status);
  if (opts.search.trim()) params.set("search", opts.search.trim());

  if (opts.dateFilter === "today" || opts.dateFilter === "week" || opts.dateFilter === "month") {
    params.set("date_filter", opts.dateFilter);
  } else if (opts.dateFilter === "range") {
    if (opts.startDate) params.set("start_date", opts.startDate);
    if (opts.endDate) params.set("end_date", opts.endDate);
  }

  const res = await fetch(`/api/hotels/${hotelId}/bookings?${params.toString()}`);
  const data = (await res.json()) as ListBookingsResult & { error?: string };
  if (!res.ok) throw new Error(data.error || "Bronlar yuklanmadi");
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

function BookingRow({ booking }: { booking: BookingDetail }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-black text-slate-800">{booking.guest.name}</p>
        {booking.guest.phone && (
          <p className="text-[11px] font-bold text-slate-400 mt-0.5">{booking.guest.phone}</p>
        )}
      </td>
      <td className="px-4 py-3 text-sm font-bold text-slate-600">{roomLabel(booking)}</td>
      <td className="px-4 py-3 text-sm font-bold text-slate-700">
        {formatShortDate(booking.dates.check_in)}
      </td>
      <td className="px-4 py-3 text-sm font-bold text-slate-700">
        {formatShortDate(booking.dates.check_out)}
      </td>
      <td className="px-4 py-3 text-sm font-black text-slate-600">{booking.dates.nights}</td>
      <td className="px-4 py-3 text-sm font-black text-[var(--primary)]">
        {formatMoney(booking.payment.total_amount)}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={booking.status} />
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/hotel/bookings/${booking.id}`}
          className="text-[12px] font-black text-[var(--accent)] hover:underline uppercase"
        >
          Ko'rish →
        </Link>
      </td>
    </tr>
  );
}

function BookingCard({ booking }: { booking: BookingDetail }) {
  return (
    <article className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-black text-slate-800">{booking.guest.name}</p>
          {booking.guest.phone && (
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">{booking.guest.phone}</p>
          )}
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Xona</p>
          <p className="font-bold text-slate-700">{roomLabel(booking)}</p>
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Tunlar</p>
          <p className="font-black text-slate-700">{booking.dates.nights}</p>
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Check-in</p>
          <p className="font-bold text-slate-700">{formatShortDate(booking.dates.check_in)}</p>
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Check-out</p>
          <p className="font-bold text-slate-700">{formatShortDate(booking.dates.check_out)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <p className="text-base font-black text-[var(--primary)]">
          {formatMoney(booking.payment.total_amount)}
        </p>
        <Link
          href={`/hotel/bookings/${booking.id}`}
          className="text-[12px] font-black text-[var(--accent)] hover:underline uppercase"
        >
          Ko'rish →
        </Link>
      </div>
    </article>
  );
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 bg-slate-200 rounded-xl" />
      ))}
    </div>
  );
}

export default function HotelBookingsPage() {
  const [hotelId, setHotelId] = useState("");
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [pagination, setPagination] = useState<ListBookingsResult["pagination"]>({
    total: 0,
    page: 1,
    per_page: PER_PAGE,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchBookings(hotelId, {
        status: statusFilter,
        dateFilter,
        startDate,
        endDate,
        search,
        page,
      });
      setBookings(result.bookings);
      setPagination(result.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bronlar yuklanmadi");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [hotelId, statusFilter, dateFilter, startDate, endDate, search, page]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const res = await fetch("/api/hotel/me");
        const data = (await res.json()) as { hotel?: { id: string } };
        if (!res.ok || !data.hotel?.id) throw new Error("Mehmonxona topilmadi");
        if (!cancelled) setHotelId(data.hotel.id);
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
    if (hotelId) void load();
  }, [hotelId, load]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function handleStatusChange(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleDateFilterChange(value: DateFilter) {
    setDateFilter(value);
    if (value !== "range") {
      setStartDate("");
      setEndDate("");
    }
    setPage(1);
  }

  function handleRangeApply() {
    if (startDate && endDate) setPage(1);
    void load();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary)]">Bronlar</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">
            Barcha bronlar va holatlari
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/hotel/calendar"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-[12px] font-black uppercase tracking-wide hover:opacity-90"
          >
            <Plus size={16} />
            Yangi bron
          </Link>
          <Link
            href="/hotel/calendar"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-[12px] font-black uppercase tracking-wide hover:bg-slate-50"
          >
            <CalendarDays size={16} />
            Kalendar ko'rinish
          </Link>
        </div>
      </header>

      {/* Filters */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center gap-4 xl:gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Status
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleStatusChange(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide border transition-all ${
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

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Sana
            </p>
            <div className="flex flex-wrap gap-2">
              {DATE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleDateFilterChange(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide border transition-all ${
                    dateFilter === option.value
                      ? "bg-[var(--bg-light-blue)] text-[var(--primary)] border-[var(--accent)]"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {dateFilter === "range" && (
              <div className="flex flex-wrap items-end gap-2 mt-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                    Dan
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                    Gacha
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRangeApply}
                  disabled={!startDate || !endDate}
                  className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-[11px] font-black uppercase disabled:opacity-50"
                >
                  Qo'llash
                </button>
              </div>
            )}
          </div>

          <div className="xl:w-72 shrink-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Qidiruv
            </p>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ism yoki telefon..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)] focus:bg-white"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-10 text-center">
            <p className="text-sm font-bold text-red-600">{error}</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-bold text-slate-400">Bronlar topilmadi</p>
            <Link
              href="/hotel/calendar"
              className="inline-flex items-center gap-2 mt-4 text-[12px] font-black text-[var(--accent)] hover:underline uppercase"
            >
              <Plus size={14} />
              Kalendar orqali yangi bron
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {["Mehmon", "Xona", "Check-in", "Check-out", "Tunlar", "Jami", "Status", "Amallar"].map(
                      (col) => (
                        <th
                          key={col}
                          className={`px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest ${
                            col === "Amallar" ? "text-right" : ""
                          }`}
                        >
                          {col}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <BookingRow key={booking.id} booking={booking} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden p-4 space-y-3">
              {bookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Pagination */}
      {!loading && !error && pagination.total_pages > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-[12px] font-bold text-slate-400">
            Jami {pagination.total} ta · {pagination.page}/{pagination.total_pages} sahifa
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-[12px] font-black text-slate-600 hover:bg-white disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Oldingi
            </button>
            <button
              type="button"
              disabled={page >= pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-[12px] font-black text-slate-600 hover:bg-white disabled:opacity-40"
            >
              Keyingi
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
