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

    const where: any = { hotelId: ctx.hotel.id };
    if (status && status !== "ALL") where.status = status;
    if (q) {
      where.OR = [
        { guestName: { contains: q, mode: "insensitive" } },
        { guests: { some: { firstName: { contains: q, mode: "insensitive" } } } }
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
          guests: true
        },
      }),
      prisma.hotelBooking.count({ where })
    ]);

    // Decrypt passport data for all guests
    const decodedBookings = bookings.map(b => ({
      ...b,
      guests: b.guests.map(g => ({
        ...g,
        passportData: g.passportData ? decrypt(g.passportData) : null
      }))
    }));

    return NextResponse.json({ items: decodedBookings, total });
  } catch (error) {
    console.error("Bookings GET Error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager", "receptionist"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const body = await req.json();
    const { 
      roomTypeId, checkInDate, checkOutDate, 
      roomCount, totalAmount, paidAmount, note, source,
      guests, // Array of { firstName, lastName, passportData, nationality, birthDate, isChild }
      physicalRoomIds // Array of IDs
    } = body;

    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);

    // 1. Overlap / Availability Check
    const concurrentBookings = await prisma.hotelBooking.findMany({
        where: {
            hotelId: ctx.hotel.id,
            roomTypeId,
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
            OR: [
                { checkInDate: { lt: end }, checkOutDate: { gt: start } }
            ]
        },
        select: { roomCount: true }
    });

    const totalPhysicalRooms = await prisma.physicalRoom.count({
        where: { hotelId: ctx.hotel.id, roomTypeId, isActive: true }
    });

    const usedRoomCount = concurrentBookings.reduce((sum, b) => sum + b.roomCount, 0);
    if (usedRoomCount + Number(roomCount) > totalPhysicalRooms) {
        return NextResponse.json({ 
            message: "Tanlangan sanalarda bo'sh xonalar yetarli emas",
            available: totalPhysicalRooms - usedRoomCount 
        }, { status: 400 });
    }

    // 2. Encryption for all guests
    const encryptedGuests = (guests || []).map((g: any) => ({
        firstName: g.firstName,
        lastName: g.lastName,
        passportData: g.passportData ? encrypt(g.passportData) : null,
        nationality: g.nationality,
        birthDate: g.birthDate ? new Date(g.birthDate) : null,
        isChild: !!g.isChild
    }));

    // 3. Create Booking & Guests & Assignments in Transaction
    const booking = await prisma.$transaction(async (tx) => {
        const b = await tx.hotelBooking.create({
            data: {
                hotelId: ctx.hotel.id,
                roomTypeId,
                guestName: (guests?.[0]?.firstName || "Mehmon") + (guests?.[0]?.lastName ? " " + guests?.[0]?.lastName : ""),
                checkInDate: start,
                checkOutDate: end,
                roomCount: Number(roomCount),
                totalAmount: Number(totalAmount),
                paidAmount: Number(paidAmount),
                status: "CONFIRMED",
                source: source || "RECEPTION",
                note,
                guests: { create: encryptedGuests }
            },
            include: { guests: true }
        });

        // 4. Create Room Assignments if provided
        if (Array.isArray(physicalRoomIds) && physicalRoomIds.length > 0) {
            await tx.bookingRoomAssignment.createMany({
                data: physicalRoomIds.map(pid => ({
                    bookingId: b.id,
                    physicalRoomId: pid,
                    checkInDate: start,
                    checkOutDate: end,
                    status: "ACTIVE"
                }))
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
