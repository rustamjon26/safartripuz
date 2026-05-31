import type { PartnerEarningType, Prisma } from "@prisma/client";
import { calcCommission, getCommissionRates } from "@/lib/getCommissionRates";

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

  const rates = await getCommissionRates(tx);

  const pendingHotelBookings = await tx.hotelBooking.findMany({
    where: {
      note: { contains: travelPlanId },
      status: "PENDING",
      source: "SAFARTRIP",
    },
    select: { id: true, hotelId: true, totalAmount: true },
  });

  for (const booking of pendingHotelBookings) {
    await tx.hotelBooking.update({
      where: { id: booking.id },
      data: {
        status: "CONFIRMED",
        paidAmount: booking.totalAmount,
      },
    });

    const hotel = await tx.hotel.findUnique({
      where: { id: booking.hotelId },
      select: { partner: { select: { userId: true } } },
    });
    const partnerUserId = hotel?.partner?.userId;
    if (partnerUserId) {
      await createPartnerEarningIfMissing(tx, {
        partnerId: partnerUserId,
        bookingType: "HOTEL",
        bookingId: booking.id,
        grossAmount: Number(booking.totalAmount),
        rate: rates.HOTEL,
      });
    }
  }

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
      totalPrice: true,
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
      const listing = await tx.homeStayListing.findUnique({
        where: { id: booking.listingId },
        select: { hostId: true },
      });

      if (listing?.hostId) {
        await createPartnerEarningIfMissing(tx, {
          partnerId: listing.hostId,
          bookingType: "HOMESTAY",
          bookingId: booking.id,
          grossAmount: Number(booking.totalPrice),
          rate: rates.HOMESTAY,
        });
      }

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
    select: { id: true, guideId: true, totalPrice: true },
  });

  if (pendingGuideBookings.length) {
    await tx.guideBooking.updateMany({
      where: { id: { in: pendingGuideBookings.map((b) => b.id) } },
      data: { status: "CONFIRMED" },
    });

    for (const booking of pendingGuideBookings) {
      await createPartnerEarningIfMissing(tx, {
        partnerId: booking.guideId,
        bookingType: "GUIDE",
        bookingId: booking.id,
        grossAmount: Number(booking.totalPrice),
        rate: rates.GUIDE,
      });
    }

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

async function createPartnerEarningIfMissing(
  tx: Prisma.TransactionClient,
  opts: {
    partnerId: string;
    bookingType: PartnerEarningType;
    bookingId: string;
    grossAmount: number;
    rate: number;
  },
) {
  const existing = await tx.partnerEarning.findUnique({
    where: {
      bookingType_bookingId: {
        bookingType: opts.bookingType,
        bookingId: opts.bookingId,
      },
    },
    select: { id: true },
  });
  if (existing) return;

  const { commissionFee, netAmount } = calcCommission(opts.grossAmount, opts.rate);

  await tx.partnerEarning.create({
    data: {
      partnerId: opts.partnerId,
      bookingType: opts.bookingType,
      bookingId: opts.bookingId,
      grossAmount: opts.grossAmount,
      commissionRate: opts.rate,
      commissionFee,
      netAmount,
      status: "PENDING",
    },
  });
}
