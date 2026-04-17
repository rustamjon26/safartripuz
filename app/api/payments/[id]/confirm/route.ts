import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await ctx.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { travelPlan: { select: { id: true, userId: true, status: true } } },
    });
    if (!payment || payment.travelPlan.userId !== actor.id) {
      return NextResponse.json({ message: "Payment topilmadi" }, { status: 404 });
    }
    if (payment.status !== "PENDING" && payment.status !== "INITIATED") {
      return NextResponse.json(
        { message: "Payment confirm qilish uchun noto‘g‘ri holatda" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { status: "SUCCESS", paidAt: new Date() },
      });

      const updatedPlan = await tx.travelPlan.update({
        where: { id: payment.travelPlanId },
        data: { status: "CONFIRMED" },
        select: { id: true, status: true },
      });

      await tx.hotelBooking.updateMany({
        where: {
          note: { contains: payment.travelPlanId },
          status: "PENDING",
          source: "SAFARTRIP",
        },
        data: { status: "CONFIRMED" },
      });

      const pendingHomeStayBookings = await tx.homeStayBooking.findMany({
        where: {
          travelPlanId: payment.travelPlanId,
          status: "PENDING",
        },
        select: {
          id: true,
          listingId: true,
          checkIn: true,
          checkOut: true,
        },
      });

      if (pendingHomeStayBookings.length) {
        await tx.homeStayBooking.updateMany({
          where: {
            id: { in: pendingHomeStayBookings.map((b) => b.id) },
          },
          data: { status: "CONFIRMED" },
        });

        for (const booking of pendingHomeStayBookings) {
          const existingAvailability = await tx.homeStayAvailability.findFirst({
            where: {
              OR: [
                { bookingId: booking.id },
                {
                  listingId: booking.listingId,
                  startDate: booking.checkIn,
                  endDate: booking.checkOut,
                  reason: "BOOKED",
                },
              ],
            },
            select: { id: true },
          });

          if (existingAvailability) {
            await tx.homeStayAvailability.update({
              where: { id: existingAvailability.id },
              data: { bookingId: booking.id },
            });
            continue;
          }

          await tx.homeStayAvailability.create({
            data: {
              listingId: booking.listingId,
              bookingId: booking.id,
              startDate: booking.checkIn,
              endDate: booking.checkOut,
              reason: "BOOKED",
            },
          });
        }
      }

      const pendingGuideBookings = await tx.guideBooking.findMany({
        where: {
          travelPlanId: payment.travelPlanId,
          status: "PENDING",
        },
        select: { id: true },
      });
      if (pendingGuideBookings.length) {
        await tx.guideBooking.updateMany({
          where: { id: { in: pendingGuideBookings.map((b) => b.id) } },
          data: { status: "CONFIRMED" },
        });
        await tx.guideBookingLog.createMany({
          data: pendingGuideBookings.map((booking) => ({
            bookingId: booking.id,
            actorId: actor.id,
            actorRole: "system",
            fromStatus: "PENDING",
            toStatus: "CONFIRMED",
            note: "Confirmed after payment success",
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "PAYMENT_CONFIRMED",
          entity: "Payment",
          entityId: updatedPayment.id,
          oldData: { status: payment.status },
          newData: { status: updatedPayment.status, travelPlanStatus: updatedPlan.status },
        },
      });

      return { payment: updatedPayment, plan: updatedPlan };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

