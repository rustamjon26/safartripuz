import type { Booking, Hotel, PaymeTransaction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PAYME_TRANSACTION_TIMEOUT_MS = 12 * 60 * 60 * 1000;

export type PaymeRpcParams = {
  id?: string;
  time?: number;
  amount?: number;
  account?: Record<string, string | undefined>;
  reason?: number;
  from?: number;
  to?: number;
};

export type PaymeRpcRequest = {
  jsonrpc?: string;
  method: string;
  params: PaymeRpcParams;
  id: number;
};

export type PaymeReceiptItem = {
  title: string;
  price: number;
  count: number;
  code: string;
  package_code: string;
  vat_percent: number;
};

export type PaymeReceiptDetail = {
  receipt_type: number;
  items: PaymeReceiptItem[];
};

export type BookingWithHotel = Booking & {
  hotel: Pick<Hotel, "id" | "name">;
};

export type PaymeTransactionWithBooking = PaymeTransaction & {
  booking: BookingWithHotel;
};

export function getPaymeMerchantId(): string {
  return process.env.PAYME_MERCHANT_ID ?? "";
}

export function getPaymeSecretKey(): string {
  const isTest = process.env.PAYME_IS_TEST === "true";
  if (isTest) {
    return process.env.PAYME_TEST_SECRET_KEY ?? process.env.PAYME_SECRET_KEY ?? "";
  }
  return process.env.PAYME_SECRET_KEY ?? "";
}

export function getPaymeMxikCode(): string {
  return process.env.PAYME_MXIK_CODE ?? "00702001001000001";
}

export function getPaymePackageCode(): string {
  return process.env.PAYME_PACKAGE_CODE ?? "123456";
}

export function getPaymeVatPercent(): number {
  const parsed = Number(process.env.PAYME_VAT_PERCENT ?? "12");
  return Number.isFinite(parsed) ? parsed : 12;
}

export function isValidTiyinAmount(amount: unknown): amount is number {
  return typeof amount === "number" && Number.isInteger(amount) && amount > 0;
}

export function bigintToNumber(value: bigint | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export function isTransactionExpired(paymeTime: bigint, nowMs = Date.now()): boolean {
  return nowMs - Number(paymeTime) > PAYME_TRANSACTION_TIMEOUT_MS;
}

export function getBookingIdFromAccount(
  account: Record<string, string | undefined> | undefined,
): string | undefined {
  return account?.booking_id?.trim() || undefined;
}

export async function findBookingById(bookingId: string | undefined): Promise<BookingWithHotel | null> {
  if (!bookingId) return null;

  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      hotel: {
        select: { id: true, name: true },
      },
    },
  });
}

export async function findPaymeTransactionByPaymeId(
  paymeId: string | undefined,
): Promise<PaymeTransactionWithBooking | null> {
  if (!paymeId) return null;

  return prisma.paymeTransaction.findUnique({
    where: { paymeId },
    include: {
      booking: {
        include: {
          hotel: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });
}

export function buildReceiptDetail(booking: BookingWithHotel): PaymeReceiptDetail {
  return {
    receipt_type: 0,
    items: [
      {
        title: `Hotel booking - ${booking.hotel.name}`,
        price: booking.amount,
        count: 1,
        code: getPaymeMxikCode(),
        package_code: getPaymePackageCode(),
        vat_percent: getPaymeVatPercent(),
      },
    ],
  };
}

export function serializePaymeTransaction(
  transaction: PaymeTransactionWithBooking,
): {
  id: string;
  time: number;
  amount: number;
  account: { booking_id: string };
  create_time: number;
  perform_time: number;
  cancel_time: number;
  transaction: string;
  state: number;
  reason: number | null;
} {
  return {
    id: transaction.paymeId,
    time: bigintToNumber(transaction.paymeTime),
    amount: transaction.amount,
    account: { booking_id: transaction.bookingId },
    create_time: bigintToNumber(transaction.paymeTime),
    perform_time: bigintToNumber(transaction.performTime),
    cancel_time: bigintToNumber(transaction.cancelTime),
    transaction: transaction.paymeId,
    state: transaction.state,
    reason: transaction.reason ?? null,
  };
}

export function createTransactionResponse(transaction: PaymeTransaction) {
  return {
    create_time: bigintToNumber(transaction.paymeTime),
    transaction: transaction.paymeId,
    state: transaction.state,
  };
}

export async function autoCancelExpiredTransaction(
  transaction: PaymeTransactionWithBooking,
): Promise<PaymeTransactionWithBooking> {
  if (transaction.state !== 1 || !isTransactionExpired(transaction.paymeTime)) {
    return transaction;
  }

  const cancelTime = BigInt(Date.now());

  const updated = await prisma.paymeTransaction.update({
    where: { id: transaction.id },
    data: {
      state: -1,
      reason: 4,
      cancelTime,
    },
    include: {
      booking: {
        include: {
          hotel: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  return updated;
}
