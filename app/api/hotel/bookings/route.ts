import type { BookingSource, BookingStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";
import { encrypt, decrypt } from "@/lib/crypto";

export async function GET(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager", "admin", "receptionist"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const url = new URL(req.url);
    const take = parseInt(url.searchParams.get("take") || "10");
    const skip = parseInt(url.searchParams.get("skip") || "0");
    const status = url.searchParams.get("status");
    const q = url.searchParams.get("q");

    const where: Prisma.HotelBookingWhereInput = { hotelId: ctx.hotel.id };
    if (status && status !== "ALL") {
      where.status = status as BookingStatus;
    }
    if (q) {
      where.OR = [
        { guestName: { contains: q } },
        { guests: { some: { firstName: { contains: q } } } },
      ];
    }

    const [bookings, total] = await Promise.all([
      prisma.hotelBooking.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: "desc" },
        include: {
          roomType: { select: { name: true } },
          guests: true,
        },
      }),
      prisma.hotelBooking.count({ where }),
    ]);

    const decodedBookings = bookings.map((b) => ({
      ...b,
      guests: b.guests.map((g) => ({
        ...g,
        passportData: g.passportData ? decrypt(g.passportData) : null,
      })),
    }));

    return NextResponse.json({ items: decodedBookings, total });
  } catch (error) {
    console.error("Bookings GET Error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

type GuestPayload = {
  firstName?: string;
  lastName?: string;
  passportData?: string;
  nationality?: string;
  birthDate?: string | number | Date;
  isChild?: boolean;
};

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager", "receptionist"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const body = (await req.json()) as Record<string, unknown>;
    const {
      roomTypeId,
      checkInDate,
      checkOutDate,
      roomCount,
      totalAmount,
      paidAmount,
      note,
      source,
      guests,
      physicalRoomIds,
    } = body;

    const start = new Date(checkInDate as string | number | Date);
    const end = new Date(checkOutDate as string | number | Date);

    const guestRows = Array.isArray(guests) ? (guests as GuestPayload[]) : [];

    const concurrentBookings = await prisma.hotelBooking.findMany({
      where: {
        hotelId: ctx.hotel.id,
        roomTypeId: String(roomTypeId),
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        OR: [{ checkInDate: { lt: end }, checkOutDate: { gt: start } }],
      },
      select: { roomCount: true },
    });

    const totalPhysicalRooms = await prisma.physicalRoom.count({
      where: {
        hotelId: ctx.hotel.id,
        roomTypeId: String(roomTypeId),
        isActive: true,
      },
    });

    const usedRoomCount = concurrentBookings.reduce((sum, b) => sum + b.roomCount, 0);
    if (usedRoomCount + Number(roomCount) > totalPhysicalRooms) {
      return NextResponse.json(
        {
          message: "Tanlangan sanalarda bo'sh xonalar yetarli emas",
          available: totalPhysicalRooms - usedRoomCount,
        },
        { status: 400 },
      );
    }

    const encryptedGuests = guestRows.map((g) => ({
      firstName: g.firstName ?? "Mehmon",
      lastName: g.lastName ?? "",
      passportData: g.passportData ? encrypt(g.passportData) : null,
      nationality: g.nationality ?? null,
      birthDate: g.birthDate ? new Date(g.birthDate as string | number | Date) : null,
      isChild: !!g.isChild,
    }));

    const bookingSources: BookingSource[] = [
      "SAFARTRIP",
      "DIRECT",
      "WALK_IN",
      "PHONE",
      "CORPORATE",
      "ADMIN",
      "RECEPTION",
    ];
    const bookingSource: BookingSource =
      typeof source === "string" && bookingSources.includes(source as BookingSource)
        ? (source as BookingSource)
        : "RECEPTION";
    const noteStr = typeof note === "string" ? note : null;
    const roomIds = Array.isArray(physicalRoomIds)
      ? (physicalRoomIds as unknown[]).map((pid) => String(pid))
      : [];

    const booking = await prisma.$transaction(async (tx) => {
      const guest0 = guestRows[0];
      const guestName =
        `${guest0?.firstName ?? "Mehmon"}${guest0?.lastName ? ` ${guest0.lastName}` : ""}`;
      const b = await tx.hotelBooking.create({
        data: {
          hotelId: ctx.hotel.id,
          roomTypeId: String(roomTypeId),
          guestName,
          checkInDate: start,
          checkOutDate: end,
          roomCount: Number(roomCount),
          totalAmount: Number(totalAmount),
          paidAmount: Number(paidAmount),
          status: "CONFIRMED",
          source: bookingSource,
          note: noteStr,
          guests: { create: encryptedGuests },
        },
        include: { guests: true },
      });

      if (roomIds.length > 0) {
        await tx.bookingRoomAssignment.createMany({
          data: roomIds.map((physicalRoomId) => ({
            bookingId: b.id,
            physicalRoomId,
            checkInDate: start,
            checkOutDate: end,
            status: "ACTIVE",
          })),
        });
      }

      return b;
    });

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Bookings POST Error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
