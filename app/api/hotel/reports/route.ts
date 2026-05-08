import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";

export async function GET(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const today = new Date();
    const last30Days = new Date(today.getTime() - 30 * 86400000);

    const bookings = await prisma.hotelBooking.findMany({
      where: {
        hotelId: ctx.hotel.id,
        createdAt: { gte: last30Days },
        status: { not: "CANCELLED" },
      },
    });

    const restaurantOrders = await prisma.restaurantOrder.findMany({
      where: {
        hotelId: ctx.hotel.id,
        createdAt: { gte: last30Days },
        status: "SERVED",
      },
    });

    const staff = await prisma.hotelStaff.findMany({
      where: { hotelId: ctx.hotel.id, isActive: true },
    });
    const totalStaffCosts = staff.reduce((sum, s) => sum + Number(s.salary ?? 0), 0);

    const inventoryCosts = await prisma.inventoryTransaction.findMany({
      where: {
        hotelId: ctx.hotel.id,
        createdAt: { gte: last30Days },
        type: "OUT",
      },
      include: { inventoryItem: true },
    });
    const totalLogisticsCosts = inventoryCosts.length * 50000;

    const dailyTrend: Array<{
      date: string;
      roomRev: number;
      foodRev: number;
      total: number;
    }> = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];

      const roomRev = bookings
        .filter((b) => b.createdAt.toISOString().split("T")[0] === dateStr)
        .reduce((sum, b) => sum + Number(b.totalAmount), 0);

      const foodRev = restaurantOrders
        .filter((o) => o.createdAt.toISOString().split("T")[0] === dateStr)
        .reduce((sum, o) => sum + Number(o.totalAmount), 0);

      if (roomRev > 0 || foodRev > 0) {
        dailyTrend.push({ date: dateStr, roomRev, foodRev, total: roomRev + foodRev });
      }
    }

    const totalRoomRev = bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    const totalFoodRev = restaurantOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const occupancyRate = (bookings.length / (ctx.hotel.totalRooms * 30)) * 100;

    return NextResponse.json({
      summary: {
        totalRevenue: totalRoomRev + totalFoodRev,
        roomRevenue: totalRoomRev,
        foodRevenue: totalFoodRev,
        staffCosts: totalStaffCosts,
        logisticsCosts: totalLogisticsCosts,
        netProfit: totalRoomRev + totalFoodRev - (totalStaffCosts + totalLogisticsCosts),
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        adr: totalRoomRev > 0 ? totalRoomRev / bookings.length : 0,
        revpar: totalRoomRev / (ctx.hotel.totalRooms * 30),
      },
      dailyTrend: dailyTrend.reverse(),
    });
  } catch (error) {
    console.error("Reports API Error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
