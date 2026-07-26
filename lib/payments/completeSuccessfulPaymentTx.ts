import type { PartnerEarningType, Prisma } from "@prisma/client";
import { calcCommission, getCommissionRates } from "@/lib/getCommissionRates";
import { bookingService } from "@/src/modules/booking";
import { ledgerService } from "@/src/modules/ledger";
import { OutboxEventType, outboxService } from "@/src/modules/outbox";
import { Money } from "@/src/shared/money";
import { setMoneyPathContext } from "@/src/shared/observability/sentry";

/**
 * Marks payment SUCCESS, confirms travel plan, and confirms linked hotel / homestay / guide bookings.
 * Used by user payment confirm and admin manual confirm.
 *
 * Payme auto-cancels an unconfirmed transaction after 12 hours (state -1, reason 4).
 * Our 15-minute hold is intentionally shorter. If payment arrives after EXPIRED,
 * BookingService re-checks inventory; on failure flags MANUAL_REVIEW (does not blind-confirm).
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

  setMoneyPathContext({ paymentId });

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
      status: { in: ["PENDING", "HELD", "PAID", "EXPIRED", "CANCELLED"] },
      source: "SAFARTRIP",
    },
    select: { id: true, hotelId: true, totalAmount: true, status: true },
  });

  for (const booking of pendingHotelBookings) {
    // Legal chain: PENDING→HELD→PAID→CONFIRMED (or HELD→PAID→CONFIRMED)
    const result = await bookingService.confirmPaymentForHotelBooking(
      booking.id,
      "SYSTEM",
      tx,
    );

    if (!result.ok) {
      // Payment marked SUCCESS but booking needs manual review — keep payment, flag in audit
      console.error("ALERT hotel_booking_manual_review_after_payment", {
        bookingId: booking.id,
        paymentId,
        travelPlanId,
      });
      continue;
    }

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
      data: { status: "CONFIRMED", holdExpiresAt: null },
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

  // Additional ledger post (idempotent). PartnerEarning dual-write unchanged above.
  const grossTiyin = Money.fromSomNumber(Number(updatedPayment.amount)).toTiyin();
  await ledgerService.record(
    {
      idempotencyKey: `payment:${paymentId}:success`,
      bookingId: pendingHotelBookings[0]?.id ?? null,
      grossTiyin,
      partnerUserId: null,
    },
    tx,
  );

  // Side effects via outbox (same tx) — relay dispatches after commit.
  await outboxService.enqueueInTx(tx, {
    aggregateType: "Payment",
    aggregateId: paymentId,
    eventType: OutboxEventType.DIDOX_INVOICE,
    payload: {
      paymentId,
      dedupeKey: `didox:${paymentId}`,
    },
  });

  await outboxService.enqueueInTx(tx, {
    aggregateType: "Payment",
    aggregateId: paymentId,
    eventType: OutboxEventType.PAYMENT_RECEIPT,
    payload: {
      paymentId,
      userId: actorId,
      amount: Number(updatedPayment.amount),
      dedupeKey: `payment.receipt:${paymentId}`,
      title: "To'lov qabul qilindi",
      body: `To'lov ${Number(updatedPayment.amount).toLocaleString("uz-UZ")} so'm muvaffaqiyatli`,
    },
  });

  for (const booking of pendingHotelBookings) {
    await outboxService.enqueueInTx(tx, {
      aggregateType: "HotelBooking",
      aggregateId: booking.id,
      eventType: OutboxEventType.BOOKING_CONFIRMED,
      payload: {
        bookingId: booking.id,
        bookingKind: "HOTEL",
        userId: actorId,
        dedupeKey: `booking.confirmed:HOTEL:${booking.id}`,
        title: "Mehmonxona bron tasdiqlandi",
        body: "To'lovingiz qabul qilindi, bron tasdiqlandi",
      },
    });
    const hotel = await tx.hotel.findUnique({
      where: { id: booking.hotelId },
      select: { partner: { select: { userId: true } } },
    });
    const partnerUserId = hotel?.partner?.userId;
    if (partnerUserId) {
      await outboxService.enqueueInTx(tx, {
        aggregateType: "HotelBooking",
        aggregateId: booking.id,
        eventType: OutboxEventType.PARTNER_NOTIFY,
        payload: {
          partnerUserId,
          bookingId: booking.id,
          bookingKind: "HOTEL",
          dedupeKey: `partner.notify:HOTEL:${booking.id}`,
          title: "Yangi mehmonxona bron",
          body: `Bron #${booking.id.slice(-8)} to'landi`,
        },
      });
    }
  }

  for (const booking of pendingHomeStayBookings) {
    await outboxService.enqueueInTx(tx, {
      aggregateType: "HomeStayBooking",
      aggregateId: booking.id,
      eventType: OutboxEventType.BOOKING_CONFIRMED,
      payload: {
        bookingId: booking.id,
        bookingKind: "HOMESTAY",
        userId: actorId,
        dedupeKey: `booking.confirmed:HOMESTAY:${booking.id}`,
        title: "HomeStay bron tasdiqlandi",
        body: "To'lovingiz qabul qilindi, bron tasdiqlandi",
      },
    });
    const listing = await tx.homeStayListing.findUnique({
      where: { id: booking.listingId },
      select: { hostId: true },
    });
    if (listing?.hostId) {
      await outboxService.enqueueInTx(tx, {
        aggregateType: "HomeStayBooking",
        aggregateId: booking.id,
        eventType: OutboxEventType.PARTNER_NOTIFY,
        payload: {
          partnerUserId: listing.hostId,
          bookingId: booking.id,
          bookingKind: "HOMESTAY",
          dedupeKey: `partner.notify:HOMESTAY:${booking.id}`,
          title: "Yangi HomeStay bron",
          body: `Bron #${booking.id.slice(-8)} to'landi`,
        },
      });
    }
  }

  for (const booking of pendingGuideBookings) {
    await outboxService.enqueueInTx(tx, {
      aggregateType: "GuideBooking",
      aggregateId: booking.id,
      eventType: OutboxEventType.BOOKING_CONFIRMED,
      payload: {
        bookingId: booking.id,
        bookingKind: "GUIDE",
        userId: actorId,
        dedupeKey: `booking.confirmed:GUIDE:${booking.id}`,
        title: "Gid bron tasdiqlandi",
        body: "To'lovingiz qabul qilindi, bron tasdiqlandi",
      },
    });
    await outboxService.enqueueInTx(tx, {
      aggregateType: "GuideBooking",
      aggregateId: booking.id,
      eventType: OutboxEventType.PARTNER_NOTIFY,
      payload: {
        partnerUserId: booking.guideId,
        bookingId: booking.id,
        bookingKind: "GUIDE",
        dedupeKey: `partner.notify:GUIDE:${booking.id}`,
        title: "Yangi gid bron",
        body: `Bron #${booking.id.slice(-8)} to'landi`,
      },
    });
  }

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
