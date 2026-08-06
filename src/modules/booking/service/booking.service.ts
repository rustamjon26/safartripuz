import type {
  BookingEventActor,
  BookingSource,
  BookingStatus as PrismaBookingStatus,
  GuideBooking,
  HomeStayBooking,
  HotelBooking,
  Prisma,
} from "@prisma/client";
import { commissionService } from "@/src/modules/commission";
import { HOLD_TTL_MS, inventoryService } from "@/src/modules/inventory";
import { MissingPartnerError } from "@/src/modules/ledger";
import { OutboxEventType, outboxService } from "@/src/modules/outbox";
import { Money } from "@/src/shared/money";
import {
  assertTransition,
  holdsInventory,
  IllegalTransitionError,
  isPaidStatus,
  requiresPaymentEvidence,
  type BookingStatus,
} from "../domain/booking.state";
import {
  canGuestCancelStatus,
  computeGuestCancelRefund,
} from "../domain/guest-cancel";
import {
  computeRefund,
  DEFAULT_FLEXIBLE_RULES,
  type CancellationRuleSnapshot,
  type RefundBreakdown,
} from "../domain/refund";
import { bookingEventRepository } from "../repository/booking-event.repository";
import { bookingRepository, type Tx } from "../repository/booking.repository";
import { postCancelAccountingInTx } from "./cancel-accounting";
import { reversePartnerEarningInTx } from "./partner-earning";

function asStatus(s: PrismaBookingStatus | string): BookingStatus {
  return s as BookingStatus;
}

export class RoomAlreadyAssignedError extends Error {
  constructor(message = "Tanlangan sanalarda xona band") {
    super(message);
    this.name = "RoomAlreadyAssignedError";
  }
}

/**
 * Gross actually collected for a homestay/guide booking, in tiyin.
 *
 * Payment confirmation is what moves these bookings out of PENDING, so a
 * PENDING row was never paid. Refund accounting must stay at zero for those —
 * otherwise cancelling an abandoned checkout claws money out of the ledger
 * that never came in.
 */
async function resolveNonHotelPaidTiyin(
  tx: Tx,
  booking: {
    status: string;
    totalPrice: Prisma.Decimal;
    travelPlanId: string | null;
  },
): Promise<bigint> {
  if (booking.status !== "PENDING") {
    return Money.fromSomNumber(booking.totalPrice.toString()).toTiyin();
  }
  if (!booking.travelPlanId) return 0n;

  const paid = await tx.payment.findFirst({
    where: { travelPlanId: booking.travelPlanId, status: "SUCCESS" },
    select: { id: true },
  });
  return paid
    ? Money.fromSomNumber(booking.totalPrice.toString()).toTiyin()
    : 0n;
}

export type TransitionCtx = {
  actor: BookingEventActor;
  reason?: string;
  metadata?: Prisma.InputJsonValue;
  /** When true, release inventory if leaving a holding status for CANCELLED/EXPIRED/REFUNDED. */
  restoreInventory?: boolean;
  /** Extra HotelBooking fields updated with the status write (e.g. paidAmount, note). */
  extra?: Prisma.HotelBookingUpdateInput;
};

export type CreateHeldHotelBookingInput = {
  hotelId: string;
  roomTypeId: string;
  guestName: string;
  guestPhone?: string | null;
  checkInDate: Date;
  checkOutDate: Date;
  roomCount: number;
  totalAmount: number;
  source?: BookingSource;
  note?: string | null;
  pricingSnapshot?: Prisma.InputJsonValue;
  /** Snapshot at book time; resolved from RoomType when omitted. */
  cancellationPolicyId?: string | null;
  /**
   * Booking owner. Persisted as HotelBooking.userId and used as the
   * authorization key by guest-facing APIs. Null for walk-in/reception.
   */
  guestUserId?: string | null;
  guests?: Prisma.BookingGuestCreateWithoutBookingInput[];
};

export type CancelWithPolicyResult = {
  booking: HotelBooking;
  refund: RefundBreakdown;
};

export type CancelHomestayWithPolicyInput = {
  bookingType: "HOMESTAY";
  bookingId: string;
  actorId: string;
  cancellationReason?: string;
};

export type CancelGuideWithPolicyInput = {
  bookingType: "GUIDE";
  bookingId: string;
  actorId: string;
  actorRole: string;
  /** Schema: GuideBookingCancelledBy = GUIDE | CUSTOMER | SYSTEM */
  cancelledBy: "CUSTOMER" | "GUIDE" | "SYSTEM";
  cancellationReason?: string;
  note?: string | null;
};

export type CancelNonHotelResult<T> = {
  booking: T;
  refund: RefundBreakdown;
};

async function applyRoomSideEffects(
  tx: Tx,
  bookingId: string,
  toStatus: BookingStatus,
): Promise<void> {
  const assignments = await tx.bookingRoomAssignment.findMany({
    where: { bookingId, status: "ACTIVE" },
    select: { id: true, physicalRoomId: true },
  });
  const roomIds = assignments.map((a) => a.physicalRoomId);

  if (toStatus === "CHECKED_IN" && roomIds.length) {
    await tx.physicalRoom.updateMany({
      where: { id: { in: roomIds } },
      data: { status: "OCCUPIED" },
    });
  }

  if (toStatus === "COMPLETED" && assignments.length) {
    await tx.bookingRoomAssignment.updateMany({
      where: { bookingId, status: "ACTIVE" },
      data: { status: "RELEASED" },
    });
    if (roomIds.length) {
      await tx.physicalRoom.updateMany({
        where: { id: { in: roomIds } },
        data: { status: "CLEANING" },
      });
    }
  }

  if (
    (toStatus === "CANCELLED" ||
      toStatus === "NO_SHOW" ||
      toStatus === "REFUNDED") &&
    assignments.length
  ) {
    await tx.bookingRoomAssignment.updateMany({
      where: { bookingId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });
    if (roomIds.length) {
      await tx.physicalRoom.updateMany({
        where: { id: { in: roomIds } },
        data: { status: "AVAILABLE" },
      });
    }
  }
}

export class BookingService {
  /**
   * Load booking (locked), assertTransition, update status, insert BookingEvent,
   * apply room assignment side effects. Optionally joins an outer transaction.
   */
  async transition(
    bookingId: string,
    toStatus: BookingStatus,
    ctx: TransitionCtx,
    outerTx?: Tx,
  ): Promise<HotelBooking> {
    const run = async (tx: Tx) => {
      const booking = await bookingRepository.lockByIdForUpdate(bookingId, tx);
      if (!booking) {
        throw new Error(`Booking not found: ${bookingId}`);
      }

      const fromStatus = asStatus(booking.status);
      const nextStatus = asStatus(toStatus);

      // Guarded edges are settled here, against the locked row, so no call site
      // can confirm an unpaid booking by convention or by passing a flag.
      const paymentConfirmed = requiresPaymentEvidence(fromStatus, nextStatus)
        ? await bookingRepository.hasRecordedPayment(booking, tx)
        : false;
      assertTransition(fromStatus, nextStatus, { paymentConfirmed });

      const shouldRestore =
        ctx.restoreInventory === true ||
        toStatus === "EXPIRED" ||
        toStatus === "CANCELLED" ||
        toStatus === "REFUNDED" ||
        // Guest never arrived — remaining nights go back on sale.
        toStatus === "NO_SHOW";

      const holdingBefore = holdsInventory(fromStatus);

      const holdExpiresAtPatch: Prisma.HotelBookingUpdateInput = {};
      if (toStatus === "HELD") {
        holdExpiresAtPatch.holdExpiresAt = new Date(Date.now() + HOLD_TTL_MS);
      } else if (
        toStatus === "CONFIRMED" ||
        toStatus === "PAID" ||
        toStatus === "EXPIRED" ||
        toStatus === "CANCELLED" ||
        toStatus === "REFUNDED" ||
        toStatus === "COMPLETED" ||
        toStatus === "NO_SHOW"
      ) {
        holdExpiresAtPatch.holdExpiresAt = null;
      }

      const updated = await bookingRepository.updateStatus(
        bookingId,
        toStatus,
        {
          ...holdExpiresAtPatch,
          ...ctx.extra,
        },
        tx,
      );

      await bookingEventRepository.create(
        {
          bookingId,
          fromStatus: booking.status,
          toStatus,
          reason: ctx.reason,
          actor: ctx.actor,
          metadata: ctx.metadata,
        },
        tx,
      );

      await applyRoomSideEffects(tx, bookingId, toStatus);

      if (
        shouldRestore &&
        holdingBefore &&
        (toStatus === "EXPIRED" ||
          toStatus === "CANCELLED" ||
          toStatus === "REFUNDED" ||
          toStatus === "NO_SHOW") &&
        booking.roomTypeId
      ) {
        await inventoryService.releaseRoomNightsInTx(
          {
            roomTypeId: booking.roomTypeId,
            checkIn: booking.checkInDate,
            checkOut: booking.checkOutDate,
            roomCount: booking.roomCount,
          },
          tx,
        );
        await bookingEventRepository.create(
          {
            bookingId,
            fromStatus: toStatus,
            toStatus,
            reason: "INVENTORY_RESTORED",
            actor: "SYSTEM",
            metadata: { restoredFrom: booking.status },
          },
          tx,
        );
      }

      return updated;
    };

    if (outerTx) return run(outerTx);
    return inventoryService.withSerializableRetry(run);
  }

  /**
   * Reserve inventory + create HotelBooking as HELD with 15m TTL.
   * Initial create — not a transition (no prior status).
   */
  async createHeldHotelBooking(
    input: CreateHeldHotelBookingInput,
  ): Promise<HotelBooking> {
    return inventoryService.withSerializableRetry(async (tx) => {
      await inventoryService.reserveRoomNightsInTx(
        {
          roomTypeId: input.roomTypeId,
          checkIn: input.checkInDate,
          checkOut: input.checkOutDate,
          roomCount: input.roomCount,
        },
        tx,
      );

      const holdExpiresAt = new Date(Date.now() + HOLD_TTL_MS);
      const policyId =
        input.cancellationPolicyId !== undefined
          ? input.cancellationPolicyId
          : (
              await tx.roomType.findUnique({
                where: { id: input.roomTypeId },
                select: { cancellationPolicyId: true },
              })
            )?.cancellationPolicyId ?? null;

      const booking = await bookingRepository.create(
        {
          hotel: { connect: { id: input.hotelId } },
          roomType: { connect: { id: input.roomTypeId } },
          guestName: input.guestName,
          guestPhone: input.guestPhone ?? null,
          checkInDate: input.checkInDate,
          checkOutDate: input.checkOutDate,
          roomCount: input.roomCount,
          totalAmount: input.totalAmount,
          paidAmount: 0,
          status: "HELD",
          holdExpiresAt,
          source: input.source ?? "SAFARTRIP",
          note: input.note ?? null,
          ...(input.guestUserId
            ? { user: { connect: { id: input.guestUserId } } }
            : {}),
          ...(input.pricingSnapshot !== undefined
            ? { pricingSnapshot: input.pricingSnapshot }
            : {}),
          ...(policyId
            ? { cancellationPolicy: { connect: { id: policyId } } }
            : {}),
          guests: input.guests?.length ? { create: input.guests } : undefined,
        } as Prisma.HotelBookingCreateInput,
        tx,
      );

      await bookingEventRepository.create(
        {
          bookingId: booking.id,
          fromStatus: "HELD",
          toStatus: "HELD",
          reason: "HOLD_CREATED",
          actor: "SYSTEM",
          metadata: { holdExpiresAt: holdExpiresAt.toISOString() },
        },
        tx,
      );

      return booking;
    });
  }

  /**
   * Staff/walk-in: decrement inventory and create CONFIRMED (no payment hold).
   * Initial create — not a transition.
   */
  async createConfirmedHotelBooking(
    input: CreateHeldHotelBookingInput & {
      paidAmount?: number;
      status?: "CONFIRMED";
      /** Pin the stay to one physical room, checked under the same lock. */
      assignPhysicalRoomId?: string;
    },
  ): Promise<HotelBooking> {
    return inventoryService.withSerializableRetry(async (tx) => {
      await inventoryService.reserveRoomNightsInTx(
        {
          roomTypeId: input.roomTypeId,
          checkIn: input.checkInDate,
          checkOut: input.checkOutDate,
          roomCount: input.roomCount,
        },
        tx,
      );

      const policyId =
        input.cancellationPolicyId !== undefined
          ? input.cancellationPolicyId
          : (
              await tx.roomType.findUnique({
                where: { id: input.roomTypeId },
                select: { cancellationPolicyId: true },
              })
            )?.cancellationPolicyId ?? null;

      const booking = await bookingRepository.create(
        {
          hotel: { connect: { id: input.hotelId } },
          roomType: { connect: { id: input.roomTypeId } },
          guestName: input.guestName,
          guestPhone: input.guestPhone ?? null,
          checkInDate: input.checkInDate,
          checkOutDate: input.checkOutDate,
          roomCount: input.roomCount,
          totalAmount: input.totalAmount,
          paidAmount: input.paidAmount ?? 0,
          status: "CONFIRMED",
          holdExpiresAt: null,
          source: input.source ?? "RECEPTION",
          note: input.note ?? null,
          ...(input.guestUserId
            ? { user: { connect: { id: input.guestUserId } } }
            : {}),
          ...(input.pricingSnapshot !== undefined
            ? { pricingSnapshot: input.pricingSnapshot }
            : {}),
          ...(policyId
            ? { cancellationPolicy: { connect: { id: policyId } } }
            : {}),
          guests: input.guests?.length ? { create: input.guests } : undefined,
        } as Prisma.HotelBookingCreateInput,
        tx,
      );

      if (input.assignPhysicalRoomId) {
        // Room-type inventory alone allows two bookings when the type has
        // several rooms; the physical room row is what serializes assignment.
        await tx.$queryRawUnsafe(
          `SELECT id FROM PhysicalRoom WHERE id = ? FOR UPDATE`,
          input.assignPhysicalRoomId,
        );

        const clash = await tx.bookingRoomAssignment.findFirst({
          where: {
            physicalRoomId: input.assignPhysicalRoomId,
            status: "ACTIVE",
            checkInDate: { lt: input.checkOutDate },
            checkOutDate: { gt: input.checkInDate },
            booking: { status: { notIn: ["CANCELLED", "NO_SHOW", "EXPIRED"] } },
          },
          select: { id: true },
        });
        if (clash) throw new RoomAlreadyAssignedError();

        await tx.bookingRoomAssignment.create({
          data: {
            bookingId: booking.id,
            physicalRoomId: input.assignPhysicalRoomId,
            checkInDate: input.checkInDate,
            checkOutDate: input.checkOutDate,
            status: "ACTIVE",
          },
        });
      }

      await bookingEventRepository.create(
        {
          bookingId: booking.id,
          fromStatus: "CONFIRMED",
          toStatus: "CONFIRMED",
          reason: "STAFF_CREATE",
          actor: "PARTNER",
        },
        tx,
      );

      if (input.guestUserId) {
        await outboxService.enqueueInTx(tx, {
          aggregateType: "HotelBooking",
          aggregateId: booking.id,
          eventType: OutboxEventType.BOOKING_CONFIRMED,
          payload: {
            bookingId: booking.id,
            bookingKind: "HOTEL",
            userId: input.guestUserId,
            dedupeKey: `booking.confirmed:HOTEL:${booking.id}`,
            title: "Mehmonxona bron tasdiqlandi",
            body: "Broningiz tasdiqlandi",
          },
        });
      }

      const hotel = await tx.hotel.findUnique({
        where: { id: input.hotelId },
        select: { partner: { select: { userId: true } } },
      });
      if (hotel?.partner?.userId) {
        await outboxService.enqueueInTx(tx, {
          aggregateType: "HotelBooking",
          aggregateId: booking.id,
          eventType: OutboxEventType.PARTNER_NOTIFY,
          payload: {
            partnerUserId: hotel.partner.userId,
            bookingId: booking.id,
            bookingKind: "HOTEL",
            dedupeKey: `partner.notify:HOTEL:${booking.id}:create`,
            title: "Yangi mehmonxona bron",
            body: `${input.guestName} — yangi bron`,
          },
        });
      }

      return booking;
    });
  }

  /**
   * Idempotent hold expiry for hotel + homestay. Safe to run concurrently.
   */
  async expireHolds(
    limit = 100,
  ): Promise<{ hotel: number; homestay: number; guide: number }> {
    const hotelHolds = await bookingRepository.findExpiredHolds(limit);
    let hotel = 0;

    for (const hold of hotelHolds) {
      try {
        const expired = await inventoryService.withSerializableRetry(async (tx) => {
          const n = await bookingRepository.expireHeldIfDue(hold.id, tx);
          if (n === 0) return false;

          await bookingEventRepository.create(
            {
              bookingId: hold.id,
              fromStatus: "HELD",
              toStatus: "EXPIRED",
              reason: "HOLD_TTL_EXPIRED",
              actor: "SYSTEM",
            },
            tx,
          );

          if (hold.roomTypeId) {
            await inventoryService.releaseRoomNightsInTx(
              {
                roomTypeId: hold.roomTypeId,
                checkIn: hold.checkInDate,
                checkOut: hold.checkOutDate,
                roomCount: hold.roomCount,
              },
              tx,
            );
            await bookingEventRepository.create(
              {
                bookingId: hold.id,
                fromStatus: "EXPIRED",
                toStatus: "EXPIRED",
                reason: "INVENTORY_RESTORED",
                actor: "SYSTEM",
              },
              tx,
            );
          }
          return true;
        });
        if (expired) hotel += 1;
      } catch (err) {
        console.error("[expireHolds] hotel failed", hold.id, err);
      }
    }

    const homestayHolds = await bookingRepository.findExpiredHomestayHolds(limit);
    let homestay = 0;

    for (const hold of homestayHolds) {
      try {
        const ok = await inventoryService.withSerializableRetry(async (tx) => {
          const result = await tx.$executeRawUnsafe(
            `UPDATE HomeStayBooking
             SET status = 'CANCELLED', holdExpiresAt = NULL, updatedAt = NOW(3),
                 cancellationReason = 'HOLD_EXPIRED'
             WHERE id = ? AND status = 'PENDING' AND holdExpiresAt IS NOT NULL AND holdExpiresAt < NOW(3)`,
            hold.id,
          );
          if (Number(result) === 0) return false;

          await tx.homeStayAvailability.deleteMany({
            where: { bookingId: hold.id },
          });
          return true;
        });
        if (ok) homestay += 1;
      } catch (err) {
        console.error("[expireHolds] homestay failed", hold.id, err);
      }
    }

    const guideHolds = await bookingRepository.findExpiredGuideHolds(limit);
    let guide = 0;

    for (const hold of guideHolds) {
      try {
        const ok = await inventoryService.withSerializableRetry(async (tx) => {
          const result = await tx.$executeRawUnsafe(
            `UPDATE GuideBooking
             SET status = 'CANCELLED', holdExpiresAt = NULL, updatedAt = NOW(3),
                 cancelledBy = 'SYSTEM', cancellationReason = 'HOLD_EXPIRED'
             WHERE id = ? AND status = 'PENDING' AND holdExpiresAt IS NOT NULL AND holdExpiresAt < NOW(3)`,
            hold.id,
          );
          if (Number(result) === 0) return false;

          // Release the slot this booking reserved at creation time.
          await tx.guideBlockedSlot.deleteMany({
            where: {
              listingId: hold.listingId,
              guideId: hold.guideId,
              date: hold.date,
              startTime: hold.startTime,
              endTime: hold.endTime,
              note: `BOOKED:${hold.id}`,
            },
          });

          await tx.guideBookingLog.create({
            data: {
              bookingId: hold.id,
              actorRole: "system",
              fromStatus: "PENDING",
              toStatus: "CANCELLED",
              note: "HOLD_EXPIRED",
            },
          });
          return true;
        });
        if (ok) guide += 1;
      } catch (err) {
        console.error("[expireHolds] guide failed", hold.id, err);
      }
    }

    return { hotel, homestay, guide };
  }

  async cancelAndRelease(
    bookingId: string,
    ctx: Omit<TransitionCtx, "restoreInventory">,
  ): Promise<HotelBooking> {
    const { booking } = await this.cancelWithPolicy(bookingId, ctx);
    return booking;
  }

  /**
   * Policy-driven cancel: computeRefund → CANCELLED or REFUNDED → inventory restore
   * → ledger REFUND compensation + PartnerEarning reverse (proportional).
   */
  async cancelWithPolicy(
    bookingId: string,
    ctx: Omit<TransitionCtx, "restoreInventory">,
    outerTx?: Tx,
  ): Promise<CancelWithPolicyResult> {
    const run = async (tx: Tx): Promise<CancelWithPolicyResult> => {
      const locked = await bookingRepository.lockByIdForUpdate(bookingId, tx);
      if (!locked) throw new Error(`Booking not found: ${bookingId}`);

      const rules = await this.resolveCancellationRules(locked, tx);
      const fromStatus = asStatus(locked.status);
      const paidSom = Money.fromSomNumber(locked.paidAmount.toString()).toTiyin();
      const isPaid = isPaidStatus(fromStatus) || paidSom > 0n;
      const grossPaidTiyin = isPaid
        ? paidSom > 0n
          ? paidSom
          : Money.fromSomNumber(locked.totalAmount.toString()).toTiyin()
        : 0n;

      const cancelledAt = new Date();
      const refund = computeRefund({
        checkInAt: locked.checkInDate,
        bookedAt: locked.createdAt,
        cancelledAt,
        grossPaidTiyin,
        policy: { rules },
      });

      const toStatus: BookingStatus =
        isPaid && refund.refundTiyin > 0n ? "REFUNDED" : "CANCELLED";

      const booking = await this.transition(
        bookingId,
        toStatus,
        {
          ...ctx,
          restoreInventory: true,
          metadata: {
            ...(typeof ctx.metadata === "object" &&
            ctx.metadata !== null &&
            !Array.isArray(ctx.metadata)
              ? (ctx.metadata as Record<string, unknown>)
              : {}),
            refund: {
              refundPercent: refund.refundPercent,
              refundTiyin: refund.refundTiyin.toString(),
              retainedTiyin: refund.retainedTiyin.toString(),
              matchedRuleId: refund.matchedRuleId,
              hoursBeforeCheckIn: refund.hoursBeforeCheckIn,
            },
          } as Prisma.InputJsonValue,
        },
        tx,
      );

      if (refund.refundTiyin > 0n) {
        const payoutOwnerType = locked.payoutOwnerType ?? "PARTNER";
        const hotel = await tx.hotel.findUnique({
          where: { id: locked.hotelId },
          select: {
            partner: { select: { userId: true } },
          },
        });
        const partnerUserId = hotel?.partner?.userId ?? null;
        if (payoutOwnerType === "PARTNER" && !partnerUserId) {
          throw new MissingPartnerError(
            `Hotel partner missing for cancel accounting on booking ${bookingId}`,
          );
        }
        const rates = await commissionService.getRates(tx);
        await postCancelAccountingInTx(tx, {
          bookingType: "HOTEL",
          bookingId,
          partnerUserId,
          refund,
          ratePercent: rates.HOTEL,
          payoutOwnerType,
        });
      }

      return { booking, refund };
    };

    if (outerTx) return run(outerTx);
    return inventoryService.withSerializableRetry(run);
  }

  /**
   * Homestay cancel + inventory release + ledger/PartnerEarning reverse.
   * Same accounting path as hotel {@link cancelWithPolicy} via postCancelAccountingInTx.
   */
  async cancelHomestayWithPolicy(
    input: Omit<CancelHomestayWithPolicyInput, "bookingType">,
    outerTx?: Tx,
  ): Promise<CancelNonHotelResult<HomeStayBooking>> {
    const run = async (tx: Tx): Promise<CancelNonHotelResult<HomeStayBooking>> => {
      const booking = await tx.homeStayBooking.findUnique({
        where: { id: input.bookingId },
      });
      if (!booking) {
        throw new Error(`Homestay booking not found: ${input.bookingId}`);
      }
      if (!canGuestCancelStatus(booking.status)) {
        throw new Error(`Homestay booking cannot be cancelled: ${booking.status}`);
      }

      const refund = computeGuestCancelRefund({
        checkInAt: booking.checkIn,
        bookedAt: booking.createdAt,
        grossPaidTiyin: await resolveNonHotelPaidTiyin(tx, booking),
      });

      const next = await tx.homeStayBooking.update({
        where: { id: booking.id },
        data: {
          status: "CANCELLED",
          cancellationReason:
            input.cancellationReason ?? "Cancelled",
        },
      });

      const listing = await tx.homeStayListing.findUnique({
        where: { id: booking.listingId },
        select: { hostId: true },
      });
      const payoutOwnerType = booking.payoutOwnerType ?? "PARTNER";
      if (
        refund.refundTiyin > 0n &&
        payoutOwnerType === "PARTNER" &&
        !listing?.hostId
      ) {
        throw new MissingPartnerError(
          `Homestay host missing for cancel accounting on booking ${booking.id}`,
        );
      }

      const rates = await commissionService.getRates(tx);
      await postCancelAccountingInTx(tx, {
        bookingType: "HOMESTAY",
        bookingId: booking.id,
        partnerUserId: listing?.hostId ?? null,
        refund,
        ratePercent: rates.HOMESTAY,
        payoutOwnerType,
      });

      const linkedAvailability = await tx.homeStayAvailability.findFirst({
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
      if (linkedAvailability) {
        await tx.homeStayAvailability.delete({
          where: { id: linkedAvailability.id },
        });
      }

      if (booking.travelPlanId) {
        const otherLinkedCount = await tx.homeStayBooking.count({
          where: {
            travelPlanId: booking.travelPlanId,
            id: { not: booking.id },
            status: { not: "CANCELLED" },
          },
        });
        if (otherLinkedCount === 0) {
          await tx.travelPlan.update({
            where: { id: booking.travelPlanId },
            data: { status: "DRAFT" },
          });
        }
      }

      return { booking: next, refund };
    };

    if (outerTx) return run(outerTx);
    return inventoryService.withSerializableRetry(run);
  }

  /**
   * Guide cancel + slot release + ledger/PartnerEarning reverse.
   * Same accounting path as hotel {@link cancelWithPolicy} via postCancelAccountingInTx.
   */
  async cancelGuideWithPolicy(
    input: Omit<CancelGuideWithPolicyInput, "bookingType">,
    outerTx?: Tx,
  ): Promise<CancelNonHotelResult<GuideBooking>> {
    const run = async (tx: Tx): Promise<CancelNonHotelResult<GuideBooking>> => {
      const booking = await tx.guideBooking.findUnique({
        where: { id: input.bookingId },
      });
      if (!booking) {
        throw new Error(`Guide booking not found: ${input.bookingId}`);
      }
      if (!canGuestCancelStatus(booking.status) && booking.status !== "DISPUTE") {
        throw new Error(`Guide booking cannot be cancelled: ${booking.status}`);
      }

      const checkInAt = new Date(booking.date);
      if (booking.startTime) {
        const [hh, mm] = booking.startTime.split(":").map(Number);
        if (Number.isFinite(hh)) checkInAt.setHours(hh, mm || 0, 0, 0);
      }

      const refund = computeGuestCancelRefund({
        checkInAt,
        bookedAt: booking.createdAt,
        grossPaidTiyin: await resolveNonHotelPaidTiyin(tx, booking),
      });

      const next = await tx.guideBooking.update({
        where: { id: booking.id },
        data: {
          status: "CANCELLED",
          cancelledBy: input.cancelledBy,
          cancellationReason:
            input.cancellationReason ?? "Cancelled",
          guideNote: input.note ?? booking.guideNote,
        },
      });

      const payoutOwnerType = booking.payoutOwnerType ?? "PARTNER";
      if (
        refund.refundTiyin > 0n &&
        payoutOwnerType === "PARTNER" &&
        !booking.guideId
      ) {
        throw new MissingPartnerError(
          `Guide id missing for cancel accounting on booking ${booking.id}`,
        );
      }

      const rates = await commissionService.getRates(tx);
      await postCancelAccountingInTx(tx, {
        bookingType: "GUIDE",
        bookingId: booking.id,
        partnerUserId: booking.guideId,
        refund,
        ratePercent: rates.GUIDE,
        payoutOwnerType,
      });

      const linkedBlockedSlot = await tx.guideBlockedSlot.findFirst({
        where: {
          listingId: next.listingId,
          guideId: next.guideId,
          date: next.date,
          startTime: next.startTime,
          endTime: next.endTime,
          note: `BOOKED:${next.id}`,
        },
        select: { id: true },
      });
      if (linkedBlockedSlot) {
        await tx.guideBlockedSlot.delete({
          where: { id: linkedBlockedSlot.id },
        });
      }

      await tx.guideBookingLog.create({
        data: {
          bookingId: next.id,
          actorId: input.actorId,
          actorRole: input.actorRole,
          fromStatus: booking.status,
          toStatus: "CANCELLED",
          note: next.cancellationReason ?? null,
        },
      });

      return { booking: next, refund };
    };

    if (outerTx) return run(outerTx);
    return inventoryService.withSerializableRetry(run);
  }

  private async resolveCancellationRules(
    booking: HotelBooking,
    tx: Tx,
  ): Promise<CancellationRuleSnapshot[]> {
    const policyId =
      booking.cancellationPolicyId ??
      (booking.roomTypeId
        ? (
            await tx.roomType.findUnique({
              where: { id: booking.roomTypeId },
              select: { cancellationPolicyId: true },
            })
          )?.cancellationPolicyId
        : null);

    if (!policyId) return DEFAULT_FLEXIBLE_RULES;

    try {
      const policy = await tx.cancellationPolicy.findUnique({
        where: { id: policyId },
        include: { rules: true },
      });
      if (!policy?.rules?.length) return DEFAULT_FLEXIBLE_RULES;
      return policy.rules.map((r) => ({
        id: r.id,
        hoursBeforeCheckIn: r.hoursBeforeCheckIn,
        refundPercent: r.refundPercent,
        conditions: (r.conditions as {
          maxHoursSinceBooking?: number;
          minHoursBeforeCheckIn?: number;
        } | null) ?? null,
      }));
    } catch {
      return DEFAULT_FLEXIBLE_RULES;
    }
  }

  async reversePartnerEarning(
    tx: Tx,
    bookingType: "HOTEL" | "HOMESTAY" | "GUIDE",
    bookingId: string,
    refundPercent: number,
  ): Promise<void> {
    return reversePartnerEarningInTx(tx, bookingType, bookingId, refundPercent);
  }

  /**
   * Payment success: legal chain only.
   * PENDING → HELD → PAID → CONFIRMED
   * HELD → PAID → CONFIRMED
   * Already PAID/CONFIRMED → idempotent ok
   * EXPIRED/CANCELLED → MANUAL_REVIEW (EXPIRED is terminal; no illegal bypass)
   */
  async confirmPaymentForHotelBooking(
    bookingId: string,
    actor: BookingEventActor,
    outerTx?: Tx,
  ): Promise<{ ok: true; booking: HotelBooking } | { ok: false; reason: "MANUAL_REVIEW" }> {
    const run = async (tx: Tx) => {
      const booking = await bookingRepository.lockByIdForUpdate(bookingId, tx);
      if (!booking) throw new Error(`Booking not found: ${bookingId}`);

      if (booking.status === "CONFIRMED" || booking.status === "PAID") {
        if (booking.status === "PAID") {
          const confirmed = await this.transition(
            bookingId,
            "CONFIRMED",
            {
              actor,
              reason: "PAYMENT_SUCCESS",
              extra: { paidAmount: booking.totalAmount },
            },
            tx,
          );
          return { ok: true as const, booking: confirmed };
        }
        return { ok: true as const, booking };
      }

      if (booking.status === "EXPIRED" || booking.status === "CANCELLED") {
        console.error("ALERT payment_after_terminal_status", {
          bookingId,
          status: booking.status,
        });
        await tx.auditLog.create({
          data: {
            action: "PAYMENT_AFTER_EXPIRED_MANUAL_REVIEW",
            entity: "HotelBooking",
            entityId: bookingId,
            newData: { reason: "TERMINAL_STATUS", status: booking.status },
          },
        });
        return { ok: false as const, reason: "MANUAL_REVIEW" as const };
      }

      if (booking.status === "PENDING") {
        await this.transition(
          bookingId,
          "HELD",
          { actor, reason: "PAYMENT_SUCCESS" },
          tx,
        );
        await this.transition(
          bookingId,
          "PAID",
          { actor, reason: "PAYMENT_SUCCESS" },
          tx,
        );
        const confirmed = await this.transition(
          bookingId,
          "CONFIRMED",
          {
            actor,
            reason: "PAYMENT_SUCCESS",
            extra: { paidAmount: booking.totalAmount },
          },
          tx,
        );
        return { ok: true as const, booking: confirmed };
      }

      if (booking.status === "HELD") {
        await this.transition(
          bookingId,
          "PAID",
          { actor, reason: "PAYMENT_SUCCESS" },
          tx,
        );
        const confirmed = await this.transition(
          bookingId,
          "CONFIRMED",
          {
            actor,
            reason: "PAYMENT_SUCCESS",
            extra: { paidAmount: booking.totalAmount },
          },
          tx,
        );
        return { ok: true as const, booking: confirmed };
      }

      console.error("ALERT payment_unexpected_status", {
        bookingId,
        status: booking.status,
      });
      await tx.auditLog.create({
        data: {
          action: "PAYMENT_AFTER_EXPIRED_MANUAL_REVIEW",
          entity: "HotelBooking",
          entityId: bookingId,
          newData: { reason: "UNEXPECTED_STATUS", status: booking.status },
        },
      });
      return { ok: false as const, reason: "MANUAL_REVIEW" as const };
    };

    if (outerTx) return run(outerTx);
    return inventoryService.withSerializableRetry(run);
  }
}

export const bookingService = new BookingService();
export { IllegalTransitionError };
