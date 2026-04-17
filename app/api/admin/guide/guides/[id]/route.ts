import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireGuideAdmin, unauthorizedResponse } from "../../_utils";

type PatchInput = {
  action?: "block" | "unblock" | "verify";
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireGuideAdmin();
    const { id } = await params;

    const [guide, recentBookings, revenueStats] = await Promise.all([
      prisma.user.findFirst({
        where: { id, role: "guide" },
        include: {
          partnerProfile: true,
          guideListings: {
            include: {
              _count: { select: { bookings: true, reviews: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      prisma.guideBooking.findMany({
        where: { guideId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          listing: { select: { id: true, title: true, category: true } },
          guest: { select: { id: true, first_name: true, last_name: true, phone: true } },
        },
      }),
      prisma.guideBooking.aggregate({
        where: { guideId: id, status: "COMPLETED" },
        _sum: { totalPrice: true },
        _count: { id: true },
      }),
    ]);

    if (!guide) return NextResponse.json({ message: "Guide not found" }, { status: 404 });

    return NextResponse.json(
      {
        guide,
        recentBookings,
        revenueSummary: {
          completedBookings: revenueStats._count.id,
          totalRevenue: Number(revenueStats._sum.totalPrice ?? 0),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return unauthorizedResponse(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireGuideAdmin();
    const { id } = await params;
    const body = (await req.json()) as PatchInput;
    if (!body.action) return NextResponse.json({ message: "action is required" }, { status: 400 });

    const existing = await prisma.user.findFirst({
      where: { id, role: "guide" },
      select: { id: true, isBlocked: true },
    });
    if (!existing) return NextResponse.json({ message: "Guide not found" }, { status: 404 });

    if (body.action === "block" || body.action === "unblock") {
      const updated = await prisma.user.update({
        where: { id },
        data: { isBlocked: body.action === "block" },
      });

      await prisma.auditLog.create({
        data: {
          actorId: actor.id,
          action: body.action === "block" ? "ADMIN_GUIDE_BLOCKED" : "ADMIN_GUIDE_UNBLOCKED",
          entity: "User",
          entityId: updated.id,
          oldData: { isBlocked: existing.isBlocked },
          newData: { isBlocked: updated.isBlocked },
        },
      });

      return NextResponse.json({ guide: updated }, { status: 200 });
    }

    const partner = await prisma.partner.findFirst({
      where: { userId: id, type: "guide" },
      select: { id: true, status: true },
    });
    if (!partner) return NextResponse.json({ message: "Guide partner profile not found" }, { status: 404 });

    const updatedPartner = await prisma.partner.update({
      where: { id: partner.id },
      data: { status: "approved" },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "ADMIN_GUIDE_VERIFIED",
        entity: "Partner",
        entityId: updatedPartner.id,
        oldData: { status: partner.status },
        newData: { status: updatedPartner.status },
      },
    });

    return NextResponse.json({ partner: updatedPartner }, { status: 200 });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}
