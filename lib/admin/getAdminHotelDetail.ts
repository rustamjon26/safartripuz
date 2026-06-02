import type { BookingStatus, HotelStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function starRating(meta: unknown): number {
  if (!meta || typeof meta !== "object") return 4;
  const m = meta as { starRating?: number; stars?: number };
  const n = Number(m.starRating ?? m.stars ?? 4);
  if (Number.isNaN(n) || n < 1) return 4;
  return Math.min(5, Math.round(n));
}

function parsePartnerMeta(meta: unknown) {
  if (!meta || typeof meta !== "object") {
    return { stars: 4, category: null as string | null, website: null as string | null, region: null as string | null };
  }
  const m = meta as Record<string, unknown>;
  return {
    stars: starRating(meta),
    category: typeof m.category === "string" ? m.category : null,
    website: typeof m.website === "string" ? m.website : null,
    region: typeof m.region === "string" ? m.region : null,
  };
}

function formatYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type AdminHotelDetail = {
  hotel: {
    id: string;
    name: string;
    status: HotelStatus;
    city: string | null;
    address: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    totalRooms: number;
    createdAt: string;
    updatedAt: string;
    stars: number;
    category: string | null;
    website: string | null;
    region: string | null;
  };
  owner: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    role: string;
  };
  stats: {
    physicalRooms: number;
    activeBookings: number;
    guestCount: number;
    totalRevenue: number;
    bookingsByStatus: Partial<Record<BookingStatus, number>>;
    totalBookings: number;
  };
  roomTypes: Array<{
    id: string;
    name: string;
    basePrice: number;
    roomCount: number;
    occupied: number;
    available: number;
  }>;
  recentBookings: Array<{
    id: string;
    guestName: string;
    roomNumber: string | null;
    roomType: string | null;
    checkIn: string;
    checkOut: string;
    totalAmount: number;
    status: BookingStatus;
  }>;
};

export async function getAdminHotelDetail(id: string): Promise<AdminHotelDetail | null> {
  const hotel = await prisma.hotel.findUnique({
    where: { id },
    include: {
      partner: {
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              phone: true,
              role: true,
            },
          },
        },
      },
      roomTypes: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          basePrice: true,
          rooms: {
            where: { isActive: true },
            select: { id: true, status: true },
          },
        },
      },
      bookings: {
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          roomType: { select: { name: true } },
          roomAssignments: {
            where: { status: "ACTIVE" },
            take: 1,
            include: { physicalRoom: { select: { roomNumber: true } } },
          },
        },
      },
    },
  });

  if (!hotel) return null;

  const [physicalRooms, guestCount, bookingGroups, revenueAgg, activeBookings] =
    await Promise.all([
      prisma.physicalRoom.count({ where: { hotelId: id, isActive: true } }),
      prisma.hotelGuest.count({ where: { hotelId: id } }),
      prisma.hotelBooking.groupBy({
        by: ["status"],
        where: { hotelId: id },
        _count: { _all: true },
      }),
      prisma.hotelBooking.aggregate({
        where: { hotelId: id, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
      }),
      prisma.hotelBooking.count({
        where: { hotelId: id, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
      }),
    ]);

  const bookingsByStatus: Partial<Record<BookingStatus, number>> = {};
  let totalBookings = 0;
  for (const row of bookingGroups) {
    bookingsByStatus[row.status] = row._count._all;
    totalBookings += row._count._all;
  }

  const meta = parsePartnerMeta(hotel.partner.meta);

  return {
    hotel: {
      id: hotel.id,
      name: hotel.name,
      status: hotel.status,
      city: hotel.city,
      address: hotel.address,
      contactEmail: hotel.contactEmail,
      contactPhone: hotel.contactPhone,
      totalRooms: hotel.totalRooms,
      createdAt: hotel.createdAt.toISOString(),
      updatedAt: hotel.updatedAt.toISOString(),
      stars: meta.stars,
      category: meta.category,
      website: meta.website,
      region: meta.region,
    },
    owner: hotel.partner.user,
    stats: {
      physicalRooms,
      activeBookings,
      guestCount,
      totalRevenue: Number(revenueAgg._sum.totalAmount ?? 0),
      bookingsByStatus,
      totalBookings,
    },
    roomTypes: hotel.roomTypes.map((rt) => {
      const occupied = rt.rooms.filter((r) => r.status === "OCCUPIED").length;
      const available = rt.rooms.filter((r) => r.status === "AVAILABLE").length;
      return {
        id: rt.id,
        name: rt.name,
        basePrice: Number(rt.basePrice),
        roomCount: rt.rooms.length,
        occupied,
        available,
      };
    }),
    recentBookings: hotel.bookings.map((b) => {
      const assignment = b.roomAssignments[0];
      return {
        id: b.id,
        guestName: b.guestName,
        roomNumber: assignment?.physicalRoom.roomNumber ?? null,
        roomType: b.roomType?.name ?? null,
        checkIn: formatYmd(b.checkInDate),
        checkOut: formatYmd(b.checkOutDate),
        totalAmount: Number(b.totalAmount),
        status: b.status,
      };
    }),
  };
}
