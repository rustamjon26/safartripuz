import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await ctx.params;

    const plan = await prisma.travelPlan.findFirst({
      where: { id, userId: actor.id },
      include: {
        items: true,
        tourPackage: {
          select: { title: true, imageUrl: true },
        },
        homeStayBookings: {
          include: {
            listing: { select: { id: true, title: true, city: true, images: true } },
          },
        },
        taxiOrders: {
          include: {
            service: { select: { id: true, title: true } },
          },
        },
        guideBookings: {
          include: {
            listing: { select: { id: true, title: true, region: true, images: true } },
            guide: { select: { id: true, first_name: true, last_name: true } },
            review: { select: { id: true } },
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ message: "Sayohat topilmadi" }, { status: 404 });
    }

    const hotelBookingsLinked = await prisma.hotelBooking.findMany({
      where: {
        note: { contains: plan.id },
      },
      include: {
        hotel: { select: { id: true, name: true, city: true } },
        roomType: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      ...plan,
      hotelBookingsLinked,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
