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

    // 1. Room Revenue (Bookings)
    const bookings = await prisma.hotelBooking.findMany({
      where: { hotelId: ctx.hotel.id, createdAt: { gte: last30Days }, status: { not: "CANCELLED" } }
    });

    // 2. F&B Revenue (Restaurant Orders)
    const restaurantOrders = await (prisma as any).restaurantOrder.findMany({
      where: { hotelId: ctx.hotel.id, createdAt: { gte: last30Days }, status: "SERVED" }
    });

    // 3. HR Costs (Staff Salaries)
    const staff = await (prisma as any).hotelStaff.findMany({
      where: { hotelId: ctx.hotel.id, isActive: true }
    });
    const totalStaffCosts = staff.reduce((sum: number, s: any) => sum + Number(s.salary || 0), 0);

    // 4. Logistics Costs (Inventory OUT transactions)
    const inventoryCosts = await (prisma as any).inventoryTransaction.findMany({
      where: { hotelId: ctx.hotel.id, createdAt: { gte: last30Days }, type: "OUT" },
      include: { inventoryItem: true }
    });
    const totalLogisticsCosts = inventoryCosts.length * 50000; 

    // Aggregating Daily Revenue Trend (Rooms + F&B)
    const dailyTrend = [];
    for(let i=29; i>=0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const roomRev = bookings
        .filter((b: any) => b.createdAt.toISOString().split('T')[0] === dateStr)
        .reduce((sum: number, b: any) => sum + Number(b.totalAmount), 0);

      const foodRev = restaurantOrders
        .filter((o: any) => o.createdAt.toISOString().split('T')[0] === dateStr)
        .reduce((sum: number, o: any) => sum + Number(o.totalAmount), 0);
      
      if (roomRev > 0 || foodRev > 0) {
        dailyTrend.push({ date: dateStr, roomRev, foodRev, total: roomRev + foodRev });
      }
    }

    const totalRoomRev = bookings.reduce((sum: number, b: any) => sum + Number(b.totalAmount), 0);
    const totalFoodRev = restaurantOrders.reduce((sum: number, o: any) => sum + Number(o.totalAmount), 0);

    // Revenue Metrics
    const occupancyRate = (bookings.length / (ctx.hotel.totalRooms * 30)) * 100;

    return NextResponse.json({
      summary: {
        totalRevenue: totalRoomRev + totalFoodRev,
        roomRevenue: totalRoomRev,
        foodRevenue: totalFoodRev,
        staffCosts: totalStaffCosts,
        logisticsCosts: totalLogisticsCosts,
        netProfit: (totalRoomRev + totalFoodRev) - (totalStaffCosts + totalLogisticsCosts),
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        adr: totalRoomRev > 0 ? totalRoomRev / bookings.length : 0, // Simplified ADR
        revpar: totalRoomRev / (ctx.hotel.totalRooms * 30)
      },
      dailyTrend: dailyTrend.reverse()
    });

  } catch (error) {
    console.error("Reports API Error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
