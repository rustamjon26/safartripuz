"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { CalendarBooking, CalendarData, CalendarRoom } from "@/lib/hotel/getCalendarData";

const ROOM_COL_WIDTH = 140;
const DAY_COL_WIDTH = 40;
const ROW_HEIGHT = 48;

const DAY_NAMES = ["Yak", "Du", "Se", "Ch", "Pa", "Ju", "Sh"] as const;

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-blue-100 border-blue-400 text-blue-800",
  CHECKED_IN: "bg-green-100 border-green-400 text-green-800",
  PENDING: "bg-amber-100 border-amber-400 text-amber-800",
};

export interface BookingCalendarProps {
  hotelId: string;
  initialDate?: Date;
  refreshToken?: number;
  onBookingClick?: (bookingId: string) => void;
  onRangeSelect?: (roomId: string, start: string, end: string) => void;
}

type ViewDays = 7 | 14 | 30;

type DragState = {
  roomId: string;
  start: string;
  end: string;
};

type TooltipState = {
  booking: CalendarBooking;
  x: number;
  y: number;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseYmd(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function diffDays(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000);
}

function clampRange(start: string, end: string): { start: string; end: string } {
  const a = parseYmd(start);
  const b = parseYmd(end);
  return a <= b ? { start, end } : { start: end, end: start };
}

function shortenName(name: string, max = 14): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

type BookingBlockLayout = {
  booking: CalendarBooking;
  left: number;
  width: number;
  startsBeforeView: boolean;
  endsAfterView: boolean;
};

function layoutBookings(
  room: CalendarRoom,
  viewStart: Date,
  viewDays: number,
): BookingBlockLayout[] {
  const viewEnd = addDays(viewStart, viewDays - 1);

  return room.bookings
    .map((booking) => {
      const checkIn = parseYmd(booking.check_in);
      const checkOut = parseYmd(booking.check_out);

      if (checkOut < viewStart || checkIn > viewEnd) return null;

      const visibleStart = checkIn < viewStart ? viewStart : checkIn;
      const visibleEnd = checkOut > viewEnd ? viewEnd : checkOut;

      const startIdx = diffDays(viewStart, visibleStart);
      const endIdx = diffDays(viewStart, visibleEnd);
      const span = endIdx - startIdx + 1;

      return {
        booking,
        left: startIdx * DAY_COL_WIDTH,
        width: span * DAY_COL_WIDTH,
        startsBeforeView: checkIn < viewStart,
        endsAfterView: checkOut > viewEnd,
      };
    })
    .filter((item): item is BookingBlockLayout => item !== null);
}

function isCellOccupied(room: CalendarRoom, ymd: string): boolean {
  const day = parseYmd(ymd);
  return room.bookings.some((booking) => {
    const checkIn = parseYmd(booking.check_in);
    const checkOut = parseYmd(booking.check_out);
    return day >= checkIn && day <= checkOut;
  });
}

export default function BookingCalendar({
  hotelId,
  initialDate,
  refreshToken = 0,
  onBookingClick,
  onRangeSelect,
}: BookingCalendarProps) {
  const [viewStart, setViewStart] = useState(() =>
    startOfDay(initialDate ?? new Date()),
  );
  const [viewDays, setViewDays] = useState<ViewDays>(30);
  const [roomTypeFilter, setRoomTypeFilter] = useState("");
  const [roomTypeOptions, setRoomTypeOptions] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverCell, setHoverCell] = useState<{ roomId: string; date: string } | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const draggingRef = useRef(false);

  const viewEnd = useMemo(() => addDays(viewStart, viewDays - 1), [viewStart, viewDays]);
  const days = useMemo(
    () => Array.from({ length: viewDays }, (_, i) => addDays(viewStart, i)),
    [viewStart, viewDays],
  );
  const todayYmd = formatYmd(new Date());
  const timelineWidth = viewDays * DAY_COL_WIDTH;

  const fetchCalendar = useCallback(async () => {
    if (!hotelId) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        start: formatYmd(viewStart),
        end: formatYmd(viewEnd),
      });
      if (roomTypeFilter) params.set("room_type_id", roomTypeFilter);

      const res = await fetch(`/api/hotels/${hotelId}/calendar?${params.toString()}`);
      const json = (await res.json()) as CalendarData & { error?: string };
      if (!res.ok) throw new Error(json.error || "Kalendar yuklanmadi");

      setData(json);
      setRoomTypeOptions((prev) => {
        const map = new Map(prev.map((item) => [item.id, item]));
        for (const room of json.rooms) {
          map.set(room.room_type.id, { id: room.room_type.id, name: room.room_type.name });
        }
        return Array.from(map.values()).sort((a, b) =>
          a.name.localeCompare(b.name, "uz", { sensitivity: "base" }),
        );
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kalendar yuklanmadi");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [hotelId, viewStart, viewEnd, roomTypeFilter, refreshToken]);

  useEffect(() => {
    void fetchCalendar();
  }, [fetchCalendar]);

  useEffect(() => {
    function handleMouseUp() {
      if (!draggingRef.current || !drag) return;
      draggingRef.current = false;
      const range = clampRange(drag.start, drag.end);
      onRangeSelect?.(drag.roomId, range.start, range.end);
      setDrag(null);
    }

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [drag, onRangeSelect]);

  const bookingLayouts = useMemo(() => {
    if (!data) return new Map<string, BookingBlockLayout[]>();
    const map = new Map<string, BookingBlockLayout[]>();
    for (const room of data.rooms) {
      map.set(room.id, layoutBookings(room, viewStart, viewDays));
    }
    return map;
  }, [data, viewStart, viewDays]);

  const todayIndex = days.findIndex((day) => formatYmd(day) === todayYmd);

  function handleCellMouseDown(room: CalendarRoom, ymd: string) {
    if (isCellOccupied(room, ymd)) return;
    draggingRef.current = true;
    setDrag({ roomId: room.id, start: ymd, end: ymd });
  }

  function handleCellMouseEnter(room: CalendarRoom, ymd: string) {
    setHoverCell({ roomId: room.id, date: ymd });
    if (!draggingRef.current || !drag || drag.roomId !== room.id) return;
    setDrag({ ...drag, end: ymd });
  }

  function isCellInDrag(roomId: string, ymd: string): boolean {
    if (!drag || drag.roomId !== roomId) return false;
    const range = clampRange(drag.start, drag.end);
    const day = parseYmd(ymd);
    return day >= parseYmd(range.start) && day <= parseYmd(range.end);
  }

  function markersForRoom(room: CalendarRoom, ymd: string): { checkIn: boolean; checkOut: boolean } {
    let checkIn = false;
    let checkOut = false;
    for (const booking of room.bookings) {
      if (booking.check_in === ymd) checkIn = true;
      if (booking.check_out === ymd) checkOut = true;
    }
    return { checkIn, checkOut };
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setViewStart((prev) => addDays(prev, -7))}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <ChevronLeft size={14} /> Oldingi hafta
          </button>
          <button
            type="button"
            onClick={() => setViewStart(startOfDay(new Date()))}
            className="px-3 py-1.5 text-[12px] font-bold text-[var(--primary)] bg-[var(--bg-light-blue)] border border-slate-200 rounded-lg hover:bg-white"
          >
            Bugun
          </button>
          <button
            type="button"
            onClick={() => setViewStart((prev) => addDays(prev, 7))}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Keyingi hafta <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-white border border-slate-200 rounded-lg p-0.5">
            {([7, 14, 30] as ViewDays[]).map((daysCount) => (
              <button
                key={daysCount}
                type="button"
                onClick={() => setViewDays(daysCount)}
                className={`px-3 py-1 text-[11px] font-black rounded-md transition-colors ${
                  viewDays === daysCount
                    ? "bg-[var(--primary)] text-white"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {daysCount === 7 ? "Hafta" : daysCount === 14 ? "2 hafta" : "Oy"}
              </button>
            ))}
          </div>

          <select
            value={roomTypeFilter}
            onChange={(e) => setRoomTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-[12px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-[var(--accent)]"
          >
            <option value="">Barcha turlar</option>
            {roomTypeOptions.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="p-8 text-center text-sm font-semibold text-red-600">{error}</div>
      ) : null}

      <div className="relative overflow-x-auto">
        {loading ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70">
            <Loader2 className="animate-spin text-slate-400" size={24} />
          </div>
        ) : null}

        <div className="inline-flex min-w-full">
          <div
            className="sticky left-0 z-20 shrink-0 bg-white border-r border-slate-200"
            style={{ width: ROOM_COL_WIDTH }}
          >
            <div className="h-10 flex items-center px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 bg-slate-50">
              Xona
            </div>
            {(data?.rooms ?? []).map((room) => (
              <div
                key={room.id}
                className="px-3 border-b border-slate-100 flex flex-col justify-center bg-white"
                style={{ height: ROW_HEIGHT }}
              >
                <span className="text-[13px] font-black text-[var(--primary)] leading-none">
                  {room.room_number}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">
                  {room.room_type.name}
                </span>
              </div>
            ))}
          </div>

          <div className="relative shrink-0" style={{ width: timelineWidth }}>
            <div
              className="grid border-b border-slate-200 bg-slate-50"
              style={{
                gridTemplateColumns: `repeat(${viewDays}, ${DAY_COL_WIDTH}px)`,
                height: 40,
              }}
            >
              {days.map((day) => {
                const ymd = formatYmd(day);
                const isToday = ymd === todayYmd;
                return (
                  <div
                    key={ymd}
                    className={`flex flex-col items-center justify-center border-r border-slate-100 text-[10px] font-bold ${
                      isToday ? "bg-blue-50 text-blue-700" : "text-slate-500"
                    }`}
                  >
                    <span>{day.getDate()}</span>
                    <span className="font-black uppercase">{DAY_NAMES[day.getDay()]}</span>
                  </div>
                );
              })}
            </div>

            {todayIndex >= 0 ? (
              <div
                className="pointer-events-none absolute top-10 bottom-0 w-px bg-blue-500 z-10"
                style={{ left: todayIndex * DAY_COL_WIDTH + DAY_COL_WIDTH / 2 }}
              />
            ) : null}

            {(data?.rooms ?? []).map((room) => {
              const layouts = bookingLayouts.get(room.id) ?? [];

              return (
                <div
                  key={room.id}
                  className="relative border-b border-slate-100"
                  style={{ height: ROW_HEIGHT }}
                >
                  <div
                    className="absolute inset-0 grid"
                    style={{
                      gridTemplateColumns: `repeat(${viewDays}, ${DAY_COL_WIDTH}px)`,
                    }}
                  >
                    {days.map((day) => {
                      const ymd = formatYmd(day);
                      const occupied = isCellOccupied(room, ymd);
                      const selected = isCellInDrag(room.id, ymd);
                      const hovered =
                        hoverCell?.roomId === room.id &&
                        hoverCell.date === ymd &&
                        !occupied &&
                        !drag;
                      const markers = markersForRoom(room, ymd);

                      return (
                        <div
                          key={ymd}
                          className={`relative border-r border-slate-100 select-none ${
                            selected
                              ? "bg-blue-200/40"
                              : hovered
                                ? "bg-blue-50"
                                : "bg-white"
                          } ${!occupied && onRangeSelect ? "cursor-cell" : ""}`}
                          onMouseDown={() => handleCellMouseDown(room, ymd)}
                          onMouseEnter={() => handleCellMouseEnter(room, ymd)}
                          onMouseLeave={() => {
                            if (hoverCell?.roomId === room.id && hoverCell.date === ymd) {
                              setHoverCell(null);
                            }
                          }}
                        >
                          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-0.5 pb-0.5 pointer-events-none">
                            {markers.checkIn ? (
                              <span className="text-[9px] text-green-600 leading-none">▶</span>
                            ) : (
                              <span />
                            )}
                            {markers.checkOut ? (
                              <span className="text-[9px] text-red-500 leading-none">◀</span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {layouts.map(({ booking, left, width, startsBeforeView, endsAfterView }) => {
                    const styleClass =
                      STATUS_STYLES[booking.status] ??
                      "bg-slate-100 border-slate-300 text-slate-700";

                    return (
                      <button
                        key={`${room.id}-${booking.id}`}
                        type="button"
                        className={`absolute top-1 bottom-1 z-[5] border text-left px-1.5 py-0.5 overflow-hidden shadow-sm hover:brightness-95 transition ${styleClass} ${
                          startsBeforeView ? "rounded-l-none" : "rounded-l-full"
                        } ${endsAfterView ? "rounded-r-none" : "rounded-r-full"}`}
                        style={{ left, width: Math.max(width - 2, 8) }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => onBookingClick?.(booking.id)}
                        onMouseEnter={(e) =>
                          setTooltip({
                            booking,
                            x: e.clientX,
                            y: e.clientY,
                          })
                        }
                        onMouseMove={(e) =>
                          setTooltip({
                            booking,
                            x: e.clientX,
                            y: e.clientY,
                          })
                        }
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <div className="text-[10px] font-black truncate leading-tight">
                          {shortenName(booking.guest_name)}
                        </div>
                        <div className="text-[9px] font-bold opacity-80">{booking.nights} tun</div>
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {!loading && (data?.rooms.length ?? 0) === 0 ? (
              <div className="p-10 text-center text-sm font-semibold text-slate-400">
                Xonalar topilmadi
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {tooltip ? (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-[11px]"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          <div className="font-black text-slate-900">{tooltip.booking.guest_name}</div>
          <div className="text-slate-600 mt-0.5">
            {tooltip.booking.check_in} → {tooltip.booking.check_out}
          </div>
          <div className="text-slate-600">
            {tooltip.booking.total_amount.toLocaleString("uz-UZ")} so&apos;m ·{" "}
            {tooltip.booking.status.replace("_", " ")}
          </div>
        </div>
      ) : null}
    </div>
  );
}
