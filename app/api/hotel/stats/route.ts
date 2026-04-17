import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";

export async function GET() {
  try {
    const actor = await requireRole(["hotel_manager", "admin", "receptionist"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // 1. Arrivals & Departures
    const [arrivalsCount, departuresCount] = await Promise.all([
      prisma.hotelBooking.count({
        where: { hotelId: ctx.hotel.id, checkInDate: { gte: todayStart, lt: todayEnd }, status: "CONFIRMED" },
      }),
      prisma.hotelBooking.count({
        where: { hotelId: ctx.hotel.id, checkOutDate: { gte: todayStart, lt: todayEnd }, status: "CHECKED_IN" },
      }),
    ]);

    // 2. Active Guests (Checked-In)
    const activeBookings = await prisma.hotelBooking.findMany({
      where: { hotelId: ctx.hotel.id, status: "CHECKED_IN" },
    });
    const currentGuests = activeBookings.length; // Simplified for now

    // 3. Room Occupancy Calculation
    // Total rooms
    const totalPhysicalRooms = await prisma.physicalRoom.count({
      where: { hotelId: ctx.hotel.id, isActive: true }
    });

    // Currently checked-in rooms
    const occupiedByCheckedIn = await prisma.hotelBooking.aggregate({
        where: { hotelId: ctx.hotel.id, status: "CHECKED_IN" },
        _sum: { roomCount: true }
    });
    const occupiedCount = occupiedByCheckedIn._sum.roomCount || 0;

    // Expected arrivals today (treat as reserved/taken for dashboard summary)
    const reservedByArrivals = await prisma.hotelBooking.aggregate({
        where: { hotelId: ctx.hotel.id, checkInDate: { gte: todayStart, lt: todayEnd }, status: "CONFIRMED" },
        _sum: { roomCount: true }
    });
    const reservedCount = reservedByArrivals._sum.roomCount || 0;

    // Final Metric: "Band" (Occupied/Reserved) vs "Available"
    const totalTaken = occupiedCount + reservedCount;
    const availableTotal = Math.max(0, totalPhysicalRooms - totalTaken);

    // 4. Low stock alerts
    const inventory = await prisma.inventoryItem.findMany({
      where: { hotelId: ctx.hotel.id },
      select: { quantity: true, minQuantity: true }
    });
    const lowStockCount = inventory.filter(item => Number(item.quantity) <= Number(item.minQuantity)).length;

    // 5. Recent Activity
    const recentActivity = await prisma.hotelBooking.findMany({
      where: { hotelId: ctx.hotel.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      metrics: {
        arrivals: arrivalsCount,
        departures: departuresCount,
        currentGuests,
        lowStockCount,
        roomStatuses: {
          AVAILABLE: availableTotal,
          OCCUPIED: totalTaken, // This combines checked-in + today's arrivals per user request
          CLEANING: 0, // Would need dedicated physical state for this
          MAINTENANCE: 0,
          BLOCKED: 0,
        },
      },
      recentActivity,
    });
  } catch (error) {
    console.error("Stats Error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
