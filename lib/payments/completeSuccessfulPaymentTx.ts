import type { Prisma } from "@prisma/client";

/**
 * Marks payment SUCCESS, confirms travel plan, and confirms linked hotel / homestay / guide bookings.
 * Used by user payment confirm and admin manual confirm.
 */
export async function completeSuccessfulPaymentInTx(
  tx: Prisma.TransactionClient,
  opts: {
    paymentId: string;
    travelPlanId: string;
    actorId: string;
    previousPaymentStatus: string;
  },
) {
  const { paymentId, travelPlanId, actorId, previousPaymentStatus } = opts;

  const updatedPayment = await tx.payment.update({
    where: { id: paymentId },
    data: { status: "SUCCESS", paidAt: new Date() },
  });

  const updatedPlan = await tx.travelPlan.update({
    where: { id: travelPlanId },
    data: { status: "CONFIRMED" },
    select: { id: true, status: true },
  });

  await tx.hotelBooking.updateMany({
    where: {
      note: { contains: travelPlanId },
      status: "PENDING",
      source: "SAFARTRIP",
    },
    data: { status: "CONFIRMED" },
  });

  const pendingHomeStayBookings = await tx.homeStayBooking.findMany({
    where: {
      travelPlanId,
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
      travelPlanId,
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
        actorId,
        actorRole: "system",
        fromStatus: "PENDING",
        toStatus: "CONFIRMED",
        note: "Confirmed after payment success",
      })),
    });
  }

  await tx.auditLog.create({
    data: {
      actorId,
      action: "PAYMENT_CONFIRMED",
      entity: "Payment",
      entityId: updatedPayment.id,
      oldData: { status: previousPaymentStatus },
      newData: { status: updatedPayment.status, travelPlanStatus: updatedPlan.status },
    },
  });

  return { payment: updatedPayment, plan: updatedPlan };
}
