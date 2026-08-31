import type { BookingSource, BookingStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";
import { encrypt, decrypt } from "@/lib/crypto";
import { bookingService } from "@/src/modules/booking";
import {
  InsufficientInventoryError,
  InventoryLockError,
} from "@/src/modules/inventory";
import { ratesService } from "@/src/modules/rates";

/** Som are stored to 2dp, so allow a rounding cent either way. */
const PRICE_TOLERANCE_SOM = 1;

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

const guestPayloadSchema = z.object({
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  passportData: z.string().trim().max(2000).optional(),
  nationality: z.string().trim().max(100).optional(),
  birthDate: z.union([z.string(), z.number()]).optional(),
  isChild: z.boolean().optional(),
});

const createReceptionBookingSchema = z.object({
  roomTypeId: z.string().min(1),
  checkInDate: z.union([z.string().min(1), z.number()]),
  checkOutDate: z.union([z.string().min(1), z.number()]),
  roomCount: z.number().int().min(1).max(50),
  /**
   * Optional. The server always prices the stay itself; when a total is sent it
   * is only checked against that price, never used in its place.
   */
  totalAmount: z.number().nonnegative().finite().optional(),
  paidAmount: z.number().nonnegative().finite().optional(),
  note: z.string().trim().max(2000).optional(),
  source: z
    .enum(["SAFARTRIP", "DIRECT", "WALK_IN", "PHONE", "CORPORATE", "ADMIN", "RECEPTION"])
    .optional(),
  guests: z.array(guestPayloadSchema).max(50).optional(),
  physicalRoomIds: z.array(z.string().min(1)).max(50).optional(),
});

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager", "receptionist"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const parsed = createReceptionBookingSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }
    const body = parsed.data;

    const start = new Date(body.checkInDate);
    const end = new Date(body.checkOutDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      return NextResponse.json({ message: "Sanalar noto'g'ri" }, { status: 400 });
    }

    const guestRows = body.guests ?? [];

    const encryptedGuests = guestRows.map((g) => ({
      firstName: g.firstName ?? "Mehmon",
      lastName: g.lastName ?? "",
      passportData: g.passportData ? encrypt(g.passportData) : null,
      nationality: g.nationality ?? null,
      birthDate: g.birthDate ? new Date(g.birthDate) : null,
      isChild: !!g.isChild,
    }));

    const bookingSource: BookingSource = body.source ?? "RECEPTION";
    const noteStr = body.note ?? null;
    const roomIds = body.physicalRoomIds ?? [];

    const guest0 = guestRows[0];
    const guestName =
      `${guest0?.firstName ?? "Mehmon"}${guest0?.lastName ? ` ${guest0.lastName}` : ""}`;

    // Same pricing pipeline the guest-facing booking route uses, so a stay
    // costs the same however it was booked.
    const adults = Math.max(1, guestRows.filter((g) => !g.isChild).length);
    const children = guestRows.filter((g) => g.isChild).length;

    let quote;
    try {
      quote = await ratesService.quoteHotel({
        roomTypeId: body.roomTypeId,
        checkIn: start,
        checkOut: end,
        roomCount: body.roomCount,
        adults,
        children,
      });
    } catch {
      return NextResponse.json(
        { message: "Xona turi topilmadi yoki narx hisoblanmadi" },
        { status: 400 },
      );
    }
    const serverTotal = quote.totalSom;

    // A mismatch is usually a stale price on the desk's screen rather than
    // tampering, but either way the booking must not carry the client's number.
    if (
      body.totalAmount !== undefined &&
      Math.abs(body.totalAmount - serverTotal) > PRICE_TOLERANCE_SOM
    ) {
      console.error("ALERT reception_booking_price_mismatch", {
        actorId: actor.id,
        hotelId: ctx.hotel.id,
        roomTypeId: body.roomTypeId,
        checkIn: start.toISOString(),
        checkOut: end.toISOString(),
        roomCount: body.roomCount,
        submittedTotal: body.totalAmount,
        serverTotal,
      });
      return NextResponse.json(
        {
          message:
            "Narx hisobida nomuvofiqlik aniqlandi. Sahifani yangilab, qayta urinib ko'ring.",
          submittedTotal: body.totalAmount,
          serverTotal,
        },
        { status: 400 },
      );
    }

    const paidAmount = body.paidAmount ?? 0;
    if (paidAmount > serverTotal + PRICE_TOLERANCE_SOM) {
      return NextResponse.json(
        { message: "To'langan summa umumiy summadan oshmasligi kerak", serverTotal },
        { status: 400 },
      );
    }

    let booking;
    try {
      booking = await bookingService.createConfirmedHotelBooking({
        hotelId: ctx.hotel.id,
        roomTypeId: body.roomTypeId,
        guestName,
        checkInDate: start,
        checkOutDate: end,
        roomCount: body.roomCount,
        totalAmount: serverTotal,
        paidAmount,
        source: bookingSource,
        note: noteStr,
        pricingSnapshot: quote.snapshot as Prisma.InputJsonValue,
        guests: encryptedGuests,
      });
    } catch (err) {
      if (err instanceof InsufficientInventoryError) {
        return NextResponse.json(
          { message: "Tanlangan sanalarda bo'sh xonalar yetarli emas" },
          { status: 400 },
        );
      }
      if (err instanceof InventoryLockError) {
        return NextResponse.json(
          { message: "Vaqtinchalik bandlik; qayta urinib ko'ring" },
          { status: 503 },
        );
      }
      throw err;
    }

    if (roomIds.length > 0) {
      await prisma.bookingRoomAssignment.createMany({
        data: roomIds.map((physicalRoomId) => ({
          bookingId: booking.id,
          physicalRoomId,
          checkInDate: start,
          checkOutDate: end,
          status: "ACTIVE",
        })),
      });
    }

    const withGuests = await prisma.hotelBooking.findUnique({
      where: { id: booking.id },
      include: { guests: true },
    });

    return NextResponse.json({ booking: withGuests });
  } catch (error) {
    console.error("Bookings POST Error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
