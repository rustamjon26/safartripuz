import type { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const REVENUE_STATUSES: BookingStatus[] = [
  "PAID",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
];

export type FinanceKpi = {
  id: string;
  label: string;
  value: number;
  unit: string;
  hint: string;
  tone: "up" | "down" | "flat";
};

export type FinanceRevenuePoint = {
  label: string;
  current: number;
  previous: number;
};

export type FinanceTopRoom = {
  name: string;
  bookings: number;
  occupancy: number;
  revenue: number;
};

export type FinancePaymentRow = {
  id: string;
  guest: string;
  method: string;
  amount: number;
  status: "success" | "pending";
  when: string;
  createdAt: string;
};

export type HotelFinanceAnalytics = {
  kpis: FinanceKpi[];
  revenueSeries: FinanceRevenuePoint[];
  topRooms: FinanceTopRoom[];
  paymentHistory: FinancePaymentRow[];
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function nightsBetween(checkIn: Date, checkOut: Date): number {
  return Math.max(
    1,
    Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000),
  );
}

function pctChange(current: number, previous: number): {
  hint: string;
  tone: "up" | "down" | "flat";
} {
  if (previous <= 0 && current <= 0) {
    return { hint: "—", tone: "flat" };
  }
  if (previous <= 0) {
    return { hint: "+100%", tone: "up" };
  }
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.05) return { hint: "0%", tone: "flat" };
  const rounded = Math.round(pct * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return {
    hint: `${sign}${rounded}%`,
    tone: rounded < 0 ? "down" : "up",
  };
}

function weekLabel(start: Date): string {
  const dd = String(start.getDate()).padStart(2, "0");
  const months = [
    "Yan",
    "Fev",
    "Mar",
    "Apr",
    "May",
    "Iyn",
    "Iyl",
    "Avg",
    "Sen",
    "Okt",
    "Noy",
    "Dek",
  ];
  return `${dd} ${months[start.getMonth()]}`;
}

function formatWhen(iso: Date, now = new Date()): string {
  const startToday = startOfDay(now);
  const startYesterday = addDays(startToday, -1);
  const t = startOfDay(iso);
  const hh = String(iso.getHours()).padStart(2, "0");
  const mm = String(iso.getMinutes()).padStart(2, "0");
  if (t.getTime() === startToday.getTime()) return `Bugun, ${hh}:${mm}`;
  if (t.getTime() === startYesterday.getTime()) return `Kecha, ${hh}:${mm}`;
  return `${iso.getDate()}.${iso.getMonth() + 1}.${iso.getFullYear()} ${hh}:${mm}`;
}

function methodLabel(method: string): string {
  const m = method.toUpperCase();
  if (m === "CASH") return "Naqd";
  if (m === "CARD") return "Karta";
  if (m === "TRANSFER") return "Transfer";
  if (m === "PAYME") return "Payme";
  if (m === "CLICK") return "Click";
  return method;
}

type BookingRow = {
  id: string;
  guestName: string;
  checkInDate: Date;
  checkOutDate: Date;
  roomCount: number;
  totalAmount: Prisma.Decimal | number;
  paidAmount: Prisma.Decimal | number;
  status: BookingStatus;
  roomType: { name: string } | null;
  payments: Array<{
    id: string;
    amount: Prisma.Decimal | number;
    method: string;
    status: string;
    createdAt: Date;
  }>;
};

/**
 * Pure analytics from already-loaded bookings + inventory size.
 * Amounts are hotel SOM (legacy Decimal), matching PMS folio UI.
 */
export function buildHotelFinanceAnalytics(input: {
  bookings: BookingRow[];
  sellableRooms: number;
  now?: Date;
}): HotelFinanceAnalytics {
  const now = input.now ?? new Date();
  const today = startOfDay(now);
  const periodEnd = addDays(today, 1); // exclusive
  const periodStart = addDays(today, -30);
  const prevStart = addDays(today, -60);
  const prevEnd = periodStart;

  const active = input.bookings.filter((b) =>
    REVENUE_STATUSES.includes(b.status),
  );

  function inRange(d: Date, start: Date, end: Date): boolean {
    const t = d.getTime();
    return t >= start.getTime() && t < end.getTime();
  }

  const current = active.filter((b) =>
    inRange(b.checkInDate, periodStart, periodEnd),
  );
  const previous = active.filter((b) =>
    inRange(b.checkInDate, prevStart, prevEnd),
  );

  const sumPaid = (rows: BookingRow[]) =>
    rows.reduce((acc, b) => acc + Number(b.paidAmount), 0);
  const sumTotal = (rows: BookingRow[]) =>
    rows.reduce((acc, b) => acc + Number(b.totalAmount), 0);
  const sumRoomNights = (rows: BookingRow[]) =>
    rows.reduce(
      (acc, b) =>
        acc + nightsBetween(b.checkInDate, b.checkOutDate) * Math.max(1, b.roomCount),
      0,
    );

  const revenue = sumPaid(current);
  const prevRevenue = sumPaid(previous);
  const roomRevenue = sumTotal(current);
  const prevRoomRevenue = sumTotal(previous);
  const roomNights = sumRoomNights(current);
  const prevRoomNights = sumRoomNights(previous);

  const adr = roomNights > 0 ? roomRevenue / roomNights : 0;
  const prevAdr = prevRoomNights > 0 ? prevRoomRevenue / prevRoomNights : 0;

  const inventory = Math.max(1, input.sellableRooms);
  const periodDays = 30;
  const revpar = roomRevenue / (inventory * periodDays);
  const prevRevpar = prevRoomRevenue / (inventory * periodDays);

  // Collected cash — we do not invent COGS for "sof foyda".
  const collected = revenue;
  const prevCollected = prevRevenue;

  const revCh = pctChange(revenue, prevRevenue);
  const adrCh = pctChange(adr, prevAdr);
  const revparCh = pctChange(revpar, prevRevpar);
  const colCh = pctChange(collected, prevCollected);

  const kpis: FinanceKpi[] = [
    {
      id: "revenue",
      label: "Umumiy tushum",
      value: Math.round(revenue),
      unit: "so‘m (30 kun)",
      hint: revCh.hint,
      tone: revCh.tone,
    },
    {
      id: "adr",
      label: "O‘rtacha kunlik narx (ADR)",
      value: Math.round(adr),
      unit: "so‘m / xona-kecha",
      hint: adrCh.hint,
      tone: adrCh.tone,
    },
    {
      id: "revpar",
      label: "RevPAR",
      value: Math.round(revpar),
      unit: "so‘m / xona-kun",
      hint: revparCh.hint,
      tone: revparCh.tone,
    },
    {
      id: "collected",
      label: "Yig‘ilgan to‘lov",
      value: Math.round(collected),
      unit: "so‘m (30 kun)",
      hint: colCh.hint,
      tone: colCh.tone,
    },
  ];

  // 5 weekly buckets ending today (current) vs the 5 weeks before that.
  const revenueSeries: FinanceRevenuePoint[] = [];
  for (let i = 4; i >= 0; i--) {
    const curEnd = addDays(today, -i * 7 + 1);
    const curStart = addDays(curEnd, -7);
    const prevEndW = curStart;
    const prevStartW = addDays(prevEndW, -7);
    const curSum = active
      .filter((b) => inRange(b.checkInDate, curStart, curEnd))
      .reduce((acc, b) => acc + Number(b.paidAmount), 0);
    const prevSum = active
      .filter((b) => inRange(b.checkInDate, prevStartW, prevEndW))
      .reduce((acc, b) => acc + Number(b.paidAmount), 0);
    revenueSeries.push({
      label: weekLabel(curStart),
      current: Math.round(curSum),
      previous: Math.round(prevSum),
    });
  }

  const byType = new Map<
    string,
    { name: string; bookings: number; revenue: number; nights: number }
  >();
  for (const b of current) {
    const name = b.roomType?.name?.trim() || "Noma'lum";
    const row = byType.get(name) ?? {
      name,
      bookings: 0,
      revenue: 0,
      nights: 0,
    };
    row.bookings += 1;
    row.revenue += Number(b.totalAmount);
    row.nights += nightsBetween(b.checkInDate, b.checkOutDate) * Math.max(1, b.roomCount);
    byType.set(name, row);
  }

  const topRooms: FinanceTopRoom[] = [...byType.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((r) => ({
      name: r.name,
      bookings: r.bookings,
      revenue: Math.round(r.revenue),
      occupancy: Math.min(
        100,
        Math.round((r.nights / (inventory * periodDays)) * 100),
      ),
    }));

  const paymentHistory: FinancePaymentRow[] = input.bookings
    .flatMap((b) =>
      b.payments.map((p) => ({
        id: p.id,
        guest: b.guestName,
        method: methodLabel(p.method),
        amount: Math.round(Number(p.amount)),
        status:
          p.status.toUpperCase() === "COMPLETED" ||
          p.status.toUpperCase() === "SUCCESS"
            ? ("success" as const)
            : ("pending" as const),
        when: formatWhen(p.createdAt, now),
        createdAt: p.createdAt.toISOString(),
      })),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 20);

  return { kpis, revenueSeries, topRooms, paymentHistory };
}

export async function loadHotelFinancePage(hotelId: string): Promise<{
  bookings: Awaited<ReturnType<typeof prisma.hotelBooking.findMany>>;
  analytics: HotelFinanceAnalytics;
}> {
  const [bookings, sellableRooms, hotel] = await Promise.all([
    prisma.hotelBooking.findMany({
      where: { hotelId },
      include: {
        folioItems: true,
        payments: true,
        roomType: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.physicalRoom.count({
      where: { hotelId, isActive: true },
    }),
    prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { totalRooms: true },
    }),
  ]);

  const rooms =
    sellableRooms > 0 ? sellableRooms : Math.max(1, hotel?.totalRooms ?? 1);

  return {
    bookings,
    analytics: buildHotelFinanceAnalytics({
      bookings,
      sellableRooms: rooms,
    }),
  };
}
