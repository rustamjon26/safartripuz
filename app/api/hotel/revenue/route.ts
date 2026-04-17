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

    // Get all bookings from the last 30 days
    const bookings = await prisma.hotelBooking.findMany({
      where: { 
        hotelId: ctx.hotel.id,
        createdAt: { gte: last30Days },
        status: { not: "CANCELLED" }
      },
      include: { roomType: true }
    });

    const totalRooms = ctx.hotel.totalRooms || 20;

    // Calculate basic metrics for the last 30 days
    const totalAmount = bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    const totalPaid = bookings.reduce((sum, b) => sum + Number(b.paidAmount), 0);
    const totalNights = bookings.reduce((sum, b) => {
       const nights = Math.max(1, Math.round((+new Date(b.checkOutDate) - +new Date(b.checkInDate)) / 86400000));
       return sum + (nights * b.roomCount);
    }, 0);

    // Occupancy % = (Occupied Room Nights / Total Available Room Nights) * 100
    const availableRoomNights = totalRooms * 30;
    const occupancyRate = (totalNights / availableRoomNights) * 100;

    // ADR (Average Daily Rate) = Total Room Revenue / Number of Rooms Sold
    const adr = totalNights > 0 ? totalAmount / totalNights : 0;

    // RevPAR (Revenue Per Available Room) = Total Room Revenue / Total Available Rooms
    const revpar = totalAmount / availableRoomNights;

    // Daily Trend (Group by day) - Simple real trend for last 7 days
    const dailyTrend = [];
    const sourceDistribution: Record<string, number> = { "PLATFORM": 0, "ADMIN": 0, "RECEPTION": 0 };

    for(let i=6; i>=0; i--) {
       const d = new Date(today);
       d.setDate(d.getDate() - i);
       const dateStr = d.toISOString().split('T')[0];
       const dayBookings = bookings.filter(b => b.createdAt.toISOString().split('T')[0] === dateStr);
       const dayAmount = dayBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
       
       dailyTrend.push({ date: dateStr, amount: dayAmount });
    }

    // Source distribution based on all 30 days bookings
    bookings.forEach(b => {
      const s = b.source || "ADMIN";
      sourceDistribution[s] = (sourceDistribution[s] || 0) + 1;
    });

    const totalB = bookings.length || 1;
    const sources = [
      { label: "SafarTrip", val: Math.round((sourceDistribution["PLATFORM"] / totalB) * 100), color: "bg-[var(--accent)]" },
      { label: "To'g'ridan to'g'ri", val: Math.round((sourceDistribution["ADMIN"] / totalB) * 100), color: "bg-slate-400" },
      { label: "Qabulxona", val: Math.round((sourceDistribution["RECEPTION"] / totalB) * 100), color: "bg-blue-500" },
    ];

    return NextResponse.json({
      metrics: {
        totalRevenue: totalAmount,
        totalPaid: totalPaid,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        adr: Math.round(adr),
        revpar: Math.round(revpar),
        totalBookings: bookings.length
      },
      dailyTrend,
      sources
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
