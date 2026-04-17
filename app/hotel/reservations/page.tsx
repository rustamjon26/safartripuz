"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type BookingStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
type Booking = {
  id: string;
  roomTypeId: string | null;
  roomType?: { id: string; name: string } | null;
  guestName: string;
  guestPhone: string | null;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: string;
  paidAmount: string;
  status: BookingStatus;
};
type RoomType = { id: string; name: string; _count?: { rooms: number } };

const nextStatuses: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["CHECKED_OUT"],
  CHECKED_OUT: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export default function HotelReservationsPage() {
  const [items, setItems] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const take = 10;

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("+998");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [roomCount, setRoomCount] = useState(1);
  const [roomTypeId, setRoomTypeId] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("0");
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availability, setAvailability] = useState<{
    totalRooms: number;
    usedRooms: number;
    availableRooms: number;
  } | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (q.trim()) params.set("q", q.trim());
    params.set("take", String(take));
    params.set("skip", String((page - 1) * take));
    return params.toString();
  }, [statusFilter, q, page]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/hotel/bookings?${query}`);
      const data = (await res.json()) as { items?: Booking[]; total?: number; message?: string };
      if (!res.ok) throw new Error(data.message || "Load error");
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [q, statusFilter]);

  useEffect(() => {
    async function loadRoomTypes() {
      try {
        const res = await fetch("/api/hotel/room-types");
        const data = (await res.json()) as { items?: RoomType[]; message?: string };
        if (!res.ok) throw new Error(data.message || "Room types load error");
        setRoomTypes(data.items ?? []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Room types xatosi");
      }
    }
    void loadRoomTypes();
  }, []);

  useEffect(() => {
    if (!checkInDate || !checkOutDate || !roomTypeId) {
      setAvailability(null);
      setAvailabilityError(null);
      return;
    }
    const checkInIso = new Date(checkInDate).toISOString();
    const checkOutIso = new Date(checkOutDate).toISOString();
    if (!(new Date(checkOutIso) > new Date(checkInIso))) {
      setAvailability(null);
      setAvailabilityError("Check-out sanasi check-in dan keyin bo‘lishi kerak");
      return;
    }

    const controller = new AbortController();
    const t = setTimeout(async () => {
      setAvailabilityLoading(true);
      setAvailabilityError(null);
      try {
        const res = await fetch(
          `/api/hotel/bookings/availability?checkInDate=${encodeURIComponent(checkInIso)}&checkOutDate=${encodeURIComponent(checkOutIso)}&roomTypeId=${encodeURIComponent(roomTypeId)}`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as {
          totalRooms?: number;
          usedRooms?: number;
          availableRooms?: number;
          message?: string;
        };
        if (!res.ok) throw new Error(data.message || "Availability error");
        setAvailability({
          totalRooms: data.totalRooms ?? 0,
          usedRooms: data.usedRooms ?? 0,
          availableRooms: data.availableRooms ?? 0,
        });
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setAvailability(null);
        setAvailabilityError(e instanceof Error ? e.message : "Availability xatosi");
      } finally {
        setAvailabilityLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [checkInDate, checkOutDate, roomTypeId]);

  async function createBooking(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/hotel/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName,
          guestPhone,
          roomTypeId,
          checkInDate: new Date(checkInDate).toISOString(),
          checkOutDate: new Date(checkOutDate).toISOString(),
          roomCount: Number(roomCount),
          totalAmount: Number(totalAmount),
          paidAmount: Number(paidAmount),
          source: "ADMIN",
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Create error");
      toast.success("Booking yaratildi");
      setGuestName("");
      setGuestPhone("+998");
      setCheckInDate("");
      setCheckOutDate("");
      setRoomCount(1);
      setRoomTypeId("");
      setTotalAmount("");
      setPaidAmount("0");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: BookingStatus) {
    setActingId(id);
    try {
      const res = await fetch(`/api/hotel/bookings/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Status error");
      toast.success(`Status: ${status}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setActingId(null);
    }
  }

  const maxPage = Math.max(1, Math.ceil(total / take));
  const enoughRooms = availability ? roomCount <= availability.availableRooms : true;
  const statusClass: Record<BookingStatus, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    CONFIRMED: "bg-sky-100 text-sky-800",
    CHECKED_IN: "bg-indigo-100 text-indigo-800",
    CHECKED_OUT: "bg-violet-100 text-violet-800",
    COMPLETED: "bg-emerald-100 text-emerald-800",
    CANCELLED: "bg-rose-100 text-rose-800",
    NO_SHOW: "bg-slate-200 text-slate-700",
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900">Reservations / Bookings</h1>

      <form onSubmit={createBooking} className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-extrabold text-slate-900">Yangi booking</div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <select
            required
            value={roomTypeId}
            onChange={(e) => setRoomTypeId(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Room type tanlang...</option>
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name} ({rt._count?.rooms ?? 0} xona)
              </option>
            ))}
          </select>
          <input required value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Guest name" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+998..." className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input type="number" min={1} value={roomCount} onChange={(e) => setRoomCount(Number(e.target.value))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input type="datetime-local" required value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input type="datetime-local" required value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input type="number" min={0} step="0.01" required value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="Total" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input type="number" min={0} step="0.01" required value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder="Paid" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
          {availabilityLoading ? (
            <span className="text-slate-600">Availability tekshirilmoqda...</span>
          ) : availabilityError ? (
            <span className="text-rose-700">{availabilityError}</span>
          ) : availability ? (
            <span className={enoughRooms ? "text-emerald-700" : "text-rose-700"}>
              Bo‘sh xonalar: {availability.availableRooms} ta (jami: {availability.totalRooms}, band: {availability.usedRooms})
            </span>
          ) : (
            <span className="text-slate-500">Room type + sanalarni tanlang, bo‘sh xonalar real-time ko‘rinadi.</span>
          )}
        </div>
        <button
          disabled={saving || availabilityLoading || !enoughRooms || Boolean(availabilityError)}
          className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Yaratilmoqda..." : "Create booking"}
        </button>
        {!enoughRooms ? (
          <div className="mt-2 text-xs text-rose-700">
            So‘ralgan xona soni mavjud xonadan ko‘p.
          </div>
        ) : null}
      </form>

      <div className="mt-4 flex gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guest..." className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
          <option value="">All</option>
          {Object.keys(nextStatuses).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
        <span>Total: {total}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-300 px-2 py-1 disabled:opacity-50"
          >
            Prev
          </button>
          <span>
            {page} / {maxPage}
          </span>
          <button
            type="button"
            disabled={page >= maxPage}
            onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
            className="rounded-lg border border-slate-300 px-2 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-extrabold text-slate-700">
          <div className="col-span-3">Guest / Room type</div>
          <div className="col-span-3">Dates</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Action</div>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-slate-600">Yuklanmoqda...</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((b) => (
              <div key={b.id} className="grid grid-cols-12 gap-2 px-4 py-3">
                <div className="col-span-3 text-sm">
                  <div className="font-bold">{b.guestName}</div>
                  <div className="text-xs text-slate-500">{b.guestPhone ?? "—"}</div>
                  <div className="text-xs text-slate-500">{b.roomType?.name ?? "Room type yo‘q"}</div>
                </div>
                <div className="col-span-3 text-xs"><div>In: {new Date(b.checkInDate).toLocaleString()}</div><div>Out: {new Date(b.checkOutDate).toLocaleString()}</div></div>
                <div className="col-span-2 text-xs"><div>Total: {b.totalAmount}</div><div>Paid: {b.paidAmount}</div></div>
                <div className="col-span-2 text-xs">
                  <span className={`rounded-full px-2 py-1 font-bold ${statusClass[b.status]}`}>{b.status}</span>
                </div>
                <div className="col-span-2">
                  {nextStatuses[b.status].length ? (
                    <div className="space-y-1">
                      <button
                        type="button"
                        disabled={actingId === b.id}
                        onClick={() => void setStatus(b.id, nextStatuses[b.status][0])}
                        className="w-full rounded-lg bg-slate-900 px-2 py-1 text-xs font-bold text-white disabled:opacity-60"
                      >
                        {nextStatuses[b.status][0]}
                      </button>
                      {nextStatuses[b.status].length > 1 ? (
                        <select
                          disabled={actingId === b.id}
                          defaultValue=""
                          onChange={(e) => {
                            if (!e.target.value) return;
                            void setStatus(b.id, e.target.value as BookingStatus);
                            e.currentTarget.value = "";
                          }}
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                        >
                          <option value="">Other...</option>
                          {nextStatuses[b.status].slice(1).map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">final</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

