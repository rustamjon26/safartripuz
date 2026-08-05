import type { PartnerEarningType, Prisma } from "@prisma/client";
import {
  calcPlatformCommissionTiyin,
  commissionService,
} from "@/src/modules/commission";
import { bookingService } from "./booking.service";
import { ledgerService, MissingPartnerError } from "@/src/modules/ledger";
import { OutboxEventType, outboxService } from "@/src/modules/outbox";
import { Money } from "@/src/shared/money";
import { setMoneyPathContext } from "@/src/shared/observability/sentry";

/**
 * Confirms linked hotel / homestay / guide bookings, posts their ledger
 * entries, and only then settles the payment.
 *
 * The payment reaches SUCCESS only when every linked booking confirmed and
 * its ledger entry was posted in this same transaction. If any booking hit a
 * terminal state (hold expired before payment landed), the money is still ours
 * but the ledger holds less than we captured — the payment lands in
 * PENDING_REVIEW, the plan keeps its status, and a PAYMENT_SUCCESS_MANUAL_REVIEW
 * audit row + ALERT log is written for ops (refund or re-book manually).
 *
 * Marking such a payment SUCCESS is what used to break reconciliation: PSP
 * clearing totals counted the full amount while the ledger only counted the
 * confirmed subset.
 *
 * Payme auto-cancels an unconfirmed transaction after 12 hours (state -1, reason 4).
 * Our 15-minute hold is intentionally shorter — never blind-confirm after expiry.
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

  // Serialize concurrent webhooks on the payment row. The second caller
  // blocks here until the first commits, then sees SUCCESS and returns
  // idempotently — side effects (ledger/outbox/booking confirm) run once.
  const lockedRows = await tx.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT id, status FROM \`Payment\` WHERE id = ${paymentId} FOR UPDATE
  `;
  const lockedPayment = lockedRows[0];
  if (!lockedPayment) {
    throw new Error(`Payment not found: ${paymentId}`);
  }
  if (lockedPayment.status === "SUCCESS") {
    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: paymentId },
    });
    const plan = await tx.travelPlan.findUniqueOrThrow({
      where: { id: travelPlanId },
      select: { id: true, status: true },
    });
    return { payment, plan };
  }

  // Status is written at the end, once we know whether every booking confirmed
  // and every ledger entry posted. Read the row now for the amount we need below.
  const payment = await tx.payment.findUniqueOrThrow({
    where: { id: paymentId },
  });

  // Plan is confirmed ONLY after every linked booking actually confirms.
  // If any booking hit a terminal state (e.g. hold expired before payment),
  // the plan stays un-confirmed and ops must resolve (refund or re-book).
  let manualReviewCount = 0;

  const rates = await commissionService.getRates(tx);

  const pendingHotelBookings = await tx.hotelBooking.findMany({
    where: {
      // FK first; note-contains covers rows created before the FK migration.
      OR: [{ travelPlanId }, { note: { contains: travelPlanId } }],
      status: { in: ["PENDING", "HELD", "PAID", "EXPIRED", "CANCELLED"] },
      source: "SAFARTRIP",
    },
    select: { id: true, hotelId: true, totalAmount: true, status: true },
  });

  const confirmedHotelBookings: typeof pendingHotelBookings = [];

  for (const booking of pendingHotelBookings) {
    const result = await bookingService.confirmPaymentForHotelBooking(
      booking.id,
      "SYSTEM",
      tx,
    );

    if (!result.ok) {
      manualReviewCount += 1;
      console.error("ALERT hotel_booking_manual_review_after_payment", {
        bookingId: booking.id,
        paymentId,
        travelPlanId,
      });
      continue;
    }
    confirmedHotelBookings.push(booking);

    const hotel = await tx.hotel.findUnique({
      where: { id: booking.hotelId },
      select: {
        ownerType: true,
        partner: { select: { userId: true } },
      },
    });
    const payoutOwnerType = hotel?.ownerType ?? "PARTNER";
    await tx.hotelBooking.update({
      where: { id: booking.id },
      data: { payoutOwnerType },
    });

    const grossTiyin = Money.fromSomNumber(
      booking.totalAmount.toString(),
    ).toTiyin();

    if (payoutOwnerType === "PLATFORM") {
      await ledgerService.record(
        {
          idempotencyKey: `payment:${paymentId}:booking:${booking.id}:success`,
          bookingId: booking.id,
          bookingType: "HOTEL",
          grossTiyin,
          payoutOwnerType: "PLATFORM",
        },
        tx,
      );
      continue;
    }

    const partnerUserId = hotel?.partner?.userId;
    if (!partnerUserId) {
      throw new MissingPartnerError(
        `Hotel partner missing for booking ${booking.id}`,
      );
    }

    await createPartnerEarningIfMissing(tx, {
      partnerId: partnerUserId,
      bookingType: "HOTEL",
      bookingId: booking.id,
      grossTiyin,
      rate: rates.HOTEL,
    });
    await ledgerService.record(
      {
        idempotencyKey: `payment:${paymentId}:booking:${booking.id}:success`,
        bookingId: booking.id,
        bookingType: "HOTEL",
        grossTiyin,
        partnerUserId,
        payoutOwnerType: "PARTNER",
        ratePercent: rates.HOTEL,
      },
      tx,
    );
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

  const confirmedHomeStayBookings: typeof pendingHomeStayBookings = [];

  if (pendingHomeStayBookings.length) {
    for (const booking of pendingHomeStayBookings) {
      // Conditional confirm — a concurrent hold-expiry may have CANCELLED this
      // row between our read and now. Never resurrect terminal bookings.
      const confirmed = await tx.homeStayBooking.updateMany({
        where: { id: booking.id, status: "PENDING" },
        data: { status: "CONFIRMED", holdExpiresAt: null },
      });
      if (confirmed.count === 0) {
        manualReviewCount += 1;
        console.error("ALERT homestay_booking_manual_review_after_payment", {
          bookingId: booking.id,
          paymentId,
          travelPlanId,
        });
        await tx.auditLog.create({
          data: {
            action: "PAYMENT_AFTER_EXPIRED_MANUAL_REVIEW",
            entity: "HomeStayBooking",
            entityId: booking.id,
            newData: { reason: "TERMINAL_STATUS", paymentId },
          },
        });
        continue;
      }
      confirmedHomeStayBookings.push(booking);

      const listing = await tx.homeStayListing.findUnique({
        where: { id: booking.listingId },
        select: { hostId: true, ownerType: true },
      });
      const payoutOwnerType = listing?.ownerType ?? "PARTNER";
      await tx.homeStayBooking.update({
        where: { id: booking.id },
        data: { payoutOwnerType },
      });

      const grossTiyin = Money.fromSomNumber(
        booking.totalPrice.toString(),
      ).toTiyin();

      if (payoutOwnerType === "PLATFORM") {
        await ledgerService.record(
          {
            idempotencyKey: `payment:${paymentId}:booking:${booking.id}:success`,
            bookingId: booking.id,
            bookingType: "HOMESTAY",
            grossTiyin,
            payoutOwnerType: "PLATFORM",
          },
          tx,
        );
      } else {
        if (!listing?.hostId) {
          throw new MissingPartnerError(
            `Homestay host missing for booking ${booking.id}`,
          );
        }
        await createPartnerEarningIfMissing(tx, {
          partnerId: listing.hostId,
          bookingType: "HOMESTAY",
          bookingId: booking.id,
          grossTiyin,
          rate: rates.HOMESTAY,
        });
        await ledgerService.record(
          {
            idempotencyKey: `payment:${paymentId}:booking:${booking.id}:success`,
            bookingId: booking.id,
            bookingType: "HOMESTAY",
            grossTiyin,
            partnerUserId: listing.hostId,
            payoutOwnerType: "PARTNER",
            ratePercent: rates.HOMESTAY,
          },
          tx,
        );
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
    select: { id: true, guideId: true, listingId: true, totalPrice: true },
  });

  const confirmedGuideBookings: typeof pendingGuideBookings = [];

  if (pendingGuideBookings.length) {
    for (const booking of pendingGuideBookings) {
      // Conditional confirm — never resurrect expired/cancelled guide bookings.
      const confirmed = await tx.guideBooking.updateMany({
        where: { id: booking.id, status: "PENDING" },
        data: { status: "CONFIRMED" },
      });
      if (confirmed.count === 0) {
        manualReviewCount += 1;
        console.error("ALERT guide_booking_manual_review_after_payment", {
          bookingId: booking.id,
          paymentId,
          travelPlanId,
        });
        await tx.auditLog.create({
          data: {
            action: "PAYMENT_AFTER_EXPIRED_MANUAL_REVIEW",
            entity: "GuideBooking",
            entityId: booking.id,
            newData: { reason: "TERMINAL_STATUS", paymentId },
          },
        });
        continue;
      }
      confirmedGuideBookings.push(booking);

      const listing = await tx.guideListing.findUnique({
        where: { id: booking.listingId },
        select: { ownerType: true },
      });
      const payoutOwnerType = listing?.ownerType ?? "PARTNER";
      await tx.guideBooking.update({
        where: { id: booking.id },
        data: { payoutOwnerType },
      });

      const grossTiyin = Money.fromSomNumber(
        booking.totalPrice.toString(),
      ).toTiyin();

      if (payoutOwnerType === "PLATFORM") {
        await ledgerService.record(
          {
            idempotencyKey: `payment:${paymentId}:booking:${booking.id}:success`,
            bookingId: booking.id,
            bookingType: "GUIDE",
            grossTiyin,
            payoutOwnerType: "PLATFORM",
          },
          tx,
        );
        continue;
      }

      if (!booking.guideId) {
        throw new MissingPartnerError(
          `Guide id missing for booking ${booking.id}`,
        );
      }
      await createPartnerEarningIfMissing(tx, {
        partnerId: booking.guideId,
        bookingType: "GUIDE",
        bookingId: booking.id,
        grossTiyin,
        rate: rates.GUIDE,
      });
      await ledgerService.record(
        {
          idempotencyKey: `payment:${paymentId}:booking:${booking.id}:success`,
          bookingId: booking.id,
          bookingType: "GUIDE",
          grossTiyin,
          partnerUserId: booking.guideId,
          payoutOwnerType: "PARTNER",
          ratePercent: rates.GUIDE,
        },
        tx,
      );
    }

    if (confirmedGuideBookings.length) {
      await tx.guideBookingLog.createMany({
        data: confirmedGuideBookings.map((booking) => ({
          bookingId: booking.id,
          actorId,
          actorRole: "system",
          fromStatus: "PENDING",
          toStatus: "CONFIRMED",
          note: "Confirmed after payment success",
        })),
      });
    }
  }

  // Everything above ran in `tx`, so the booking confirmations, their ledger
  // entries and this status write commit together — a payment is never SUCCESS
  // without the matching ledger postings.
  const settled = manualReviewCount === 0;
  const updatedPayment = await tx.payment.update({
    where: { id: paymentId },
    data: {
      status: settled ? "SUCCESS" : "PENDING_REVIEW",
      paidAt: new Date(),
    },
  });

  // Plan status: CONFIRMED only when nothing needs manual review.
  const updatedPlan = settled
    ? await tx.travelPlan.update({
        where: { id: travelPlanId },
        data: { status: "CONFIRMED" },
        select: { id: true, status: true },
      })
    : await tx.travelPlan.findUniqueOrThrow({
        where: { id: travelPlanId },
        select: { id: true, status: true },
      });

  if (manualReviewCount > 0) {
    console.error("ALERT payment_success_manual_review", {
      paymentId,
      travelPlanId,
      manualReviewCount,
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: "PAYMENT_SUCCESS_MANUAL_REVIEW",
        entity: "TravelPlan",
        entityId: travelPlanId,
        newData: { paymentId, manualReviewCount },
      },
    });
  }

  await tx.auditLog.create({
    data: {
      actorId,
      action: "PAYMENT_CONFIRMED",
      entity: "Payment",
      entityId: updatedPayment.id,
      oldData: { status: previousPaymentStatus },
      newData: {
        status: updatedPayment.status,
        travelPlanStatus: updatedPlan.status,
        manualReviewCount,
      },
    },
  });

  const paymentSom = Money.fromSomNumber(payment.amount.toString());

  // A fiscal invoice and a "payment accepted" receipt both assert the booking
  // stands. Under review it does not, so they wait for ops to settle it.
  if (settled) {
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
        amount: paymentSom.toSomNumber(),
        dedupeKey: `payment.receipt:${paymentId}`,
        title: "To'lov qabul qilindi",
        body: `To'lov ${paymentSom.toSomNumber().toLocaleString("uz-UZ")} so'm muvaffaqiyatli`,
      },
    });
  }

  for (const booking of confirmedHotelBookings) {
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

  for (const booking of confirmedHomeStayBookings) {
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

  for (const booking of confirmedGuideBookings) {
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

/** Alias matching Step-2 plan name; same implementation. */
export const completeSuccessfulPaymentTx = completeSuccessfulPaymentInTx;

/**
 * Idempotent PartnerEarning create (tiyin → SOM Decimal columns).
 * Exported for Payme legacy dual-write and unit tests.
 * Never pass a silent null partner — caller must resolve or throw.
 */
export async function createPartnerEarningIfMissing(
  tx: Prisma.TransactionClient,
  opts: {
    partnerId: string;
    bookingType: PartnerEarningType;
    bookingId: string;
    grossTiyin: bigint;
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

  const { platformTotal: commissionFee, partnerNet: netAmount } =
    calcPlatformCommissionTiyin(opts.grossTiyin, opts.rate);

  await tx.partnerEarning.create({
    data: {
      partnerId: opts.partnerId,
      bookingType: opts.bookingType,
      bookingId: opts.bookingId,
      grossTiyin: opts.grossTiyin,
      commissionRate: opts.rate,
      commissionFeeTiyin: commissionFee,
      netTiyin: netAmount,
      status: "PENDING",
    },
  });
}
