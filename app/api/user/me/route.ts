import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { id } = await requireUser();
    const [user, pendingGuideBookings, pendingHomeStayBookings] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          role: true,
          phone: true,
          hotelStaff: {
            select: { role: true },
          },
        },
      }),
      prisma.guideBooking.count({
        where: { guestId: id, status: "PENDING" },
      }),
      prisma.homeStayBooking.count({
        where: { guestId: id, status: "PENDING" },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ message: "Foydalanuvchi topilmadi" }, { status: 404 });
    }

    const pendingBookingsCount = pendingGuideBookings + pendingHomeStayBookings;

    const hotelOr: Array<Record<string, unknown>> = [];
    if (user.phone?.trim()) {
      hotelOr.push({ guestPhone: user.phone.trim() });
    }
    hotelOr.push({
      guests: {
        some: {
          firstName: user.first_name,
          ...(user.last_name?.trim()
            ? { lastName: user.last_name.trim() }
            : {}),
        },
      },
    });

    const [
      travelPlansCount,
      guideBookingsCount,
      homeStayBookingsCount,
      taxiOrdersCount,
      hotelBookingsCount,
      paymentSum,
    ] = await Promise.all([
      prisma.travelPlan.count({ where: { userId: id } }),
      prisma.guideBooking.count({ where: { guestId: id } }),
      prisma.homeStayBooking.count({ where: { guestId: id } }),
      prisma.taxiOrder.count({ where: { customerId: id } }),
      prisma.hotelBooking.count({
        where: { source: "SAFARTRIP", OR: hotelOr },
      }),
      prisma.payment.aggregate({
        where: { travelPlan: { userId: id }, status: "SUCCESS" },
        _sum: { amount: true },
      }),
    ]);

    const bookings =
      guideBookingsCount + homeStayBookingsCount + taxiOrdersCount + hotelBookingsCount;

    return NextResponse.json({
      user,
      pendingBookingsCount,
      stats: {
        travelPlans: travelPlansCount,
        bookings,
        totalSpent: Number(paymentSum._sum.amount ?? 0),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
