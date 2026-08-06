import type { Booking, PaymeTransaction } from "@prisma/client";
import { db, type DbClient } from "@/src/shared/db/client";

/**
 * Prisma access for the Payme `booking_id` stack (`Booking` + `PaymeTransaction`),
 * which is separate from the `order_id` stack served by `payment.repository.ts`
 * (`Payment`). Both are live: Payme addresses one merchant per account field.
 */

const bookingHotelInclude = {
  hotel: { select: { id: true, name: true } },
} as const;

export const paymeTransactionInclude = {
  booking: { include: bookingHotelInclude },
} as const;

export type BookingWithHotel = Booking & {
  hotel: Pick<import("@prisma/client").Hotel, "id" | "name">;
};

export type PaymeTransactionWithBooking = PaymeTransaction & {
  booking: BookingWithHotel;
};

export class PaymeBookingRepository {
  async findBookingById(
    bookingId: string,
    client: DbClient = db,
  ): Promise<BookingWithHotel | null> {
    return client.booking.findUnique({
      where: { id: bookingId },
      include: bookingHotelInclude,
    });
  }

  async findTransactionByPaymeId(
    paymeId: string,
    client: DbClient = db,
  ): Promise<PaymeTransactionWithBooking | null> {
    return client.paymeTransaction.findUnique({
      where: { paymeId },
      include: paymeTransactionInclude,
    });
  }

  /** GetStatement window, ordered as Payme expects. */
  async findTransactionsInWindow(
    fromMs: bigint,
    toMs: bigint,
    client: DbClient = db,
  ): Promise<PaymeTransactionWithBooking[]> {
    return client.paymeTransaction.findMany({
      where: { paymeTime: { gte: fromMs, lte: toMs } },
      include: paymeTransactionInclude,
      orderBy: { paymeTime: "asc" },
    });
  }

  /** Used by the 12-hour auto-cancel of a transaction left in state 1. */
  async markTransactionCancelled(
    id: string,
    input: { reason: number; cancelTime: bigint },
    client: DbClient = db,
  ): Promise<PaymeTransactionWithBooking> {
    return client.paymeTransaction.update({
      where: { id },
      data: { state: -1, reason: input.reason, cancelTime: input.cancelTime },
      include: paymeTransactionInclude,
    });
  }
}

export const paymeBookingRepository = new PaymeBookingRepository();
