import type { Booking, Hotel, PaymeTransaction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildPaymeReceiptDetail,
  getPaymeMxikCode as sharedGetPaymeMxikCode,
  getPaymePackageCode as sharedGetPaymePackageCode,
  getPaymeVatPercent as sharedGetPaymeVatPercent,
  type PaymeReceiptDetail as SharedPaymeReceiptDetail,
  type PaymeReceiptItem as SharedPaymeReceiptItem,
} from "@/src/modules/payment/domain/payme-receipt";

export const PAYME_TRANSACTION_TIMEOUT_MS = 12 * 60 * 60 * 1000;

const bookingHotelInclude = {
  hotel: {
    select: { id: true, name: true },
  },
} as const;

export const paymeTransactionInclude = {
  booking: {
    include: bookingHotelInclude,
  },
} as const;

export function normalizePaymeTransactionId(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  const value = String(raw).trim();
  return value.length > 0 ? value : undefined;
}

export type PaymeRpcParams = {
  id?: string | number;
  time?: number;
  amount?: number;
  account?: Record<string, unknown>;
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

export type PaymeReceiptItem = SharedPaymeReceiptItem;
export type PaymeReceiptDetail = SharedPaymeReceiptDetail;

export type BookingWithHotel = Booking & {
  hotel: Pick<Hotel, "id" | "name">;
};

export type PaymeTransactionWithBooking = PaymeTransaction & {
  booking: BookingWithHotel;
};

export type PaymeCreateTransactionResult = {
  create_time: number;
  transaction: string;
  state: number;
};

export type PaymeStatementTransaction = {
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
};

/** Read env at runtime (bracket access avoids Next.js build-time inlining). */
function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;

  let trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  return trimmed.length > 0 ? trimmed : undefined;
}

function isPaymeTestMode(): boolean {
  const flag = readEnv("PAYME_IS_TEST")?.toLowerCase();
  return flag === "true" || flag === "1" || flag === "yes";
}

function resolveSecretKeySource(isTest: boolean, testKey?: string, prodKey?: string): string {
  if (isTest) {
    if (testKey) return "PAYME_TEST_SECRET_KEY";
    if (prodKey) return "PAYME_SECRET_KEY (fallback)";
    return "none";
  }

  return prodKey ? "PAYME_SECRET_KEY" : "none";
}

let loggedPaymeSecretSource = false;

export function getPaymeMerchantId(): string {
  return readEnv("PAYME_MERCHANT_ID") ?? "";
}

export function getPaymeSecretKey(): string {
  const isTest = isPaymeTestMode();
  const testKey = readEnv("PAYME_TEST_SECRET_KEY");
  const prodKey = readEnv("PAYME_SECRET_KEY");
  const secretKey = isTest ? (testKey ?? prodKey ?? "") : (prodKey ?? "");

  if (!loggedPaymeSecretSource) {
    loggedPaymeSecretSource = true;
    // Never log previews/lengths of the secret itself — source is enough.
    console.log(
      "[Payme] Secret key config:",
      JSON.stringify({
        isTest,
        source: resolveSecretKeySource(isTest, testKey, prodKey),
        configured: secretKey.length > 0,
      }),
    );
  }

  return secretKey;
}

export function getPaymeMxikCode(): string {
  return sharedGetPaymeMxikCode();
}

export function getPaymePackageCode(): string {
  return sharedGetPaymePackageCode();
}

export function getPaymeVatPercent(): number {
  return sharedGetPaymeVatPercent();
}

export function isValidTiyinAmount(amount: unknown): amount is number {
  return typeof amount === "number" && Number.isInteger(amount) && amount > 0;
}

export function bigintToNumber(value: bigint | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : 0;
}

export function isTransactionExpired(paymeTime: bigint, nowMs = Date.now()): boolean {
  return nowMs - bigintToNumber(paymeTime) > PAYME_TRANSACTION_TIMEOUT_MS;
}

export function getBookingIdFromAccount(
  account: Record<string, unknown> | undefined,
): string | undefined {
  const raw = account?.booking_id;
  if (raw === undefined || raw === null) return undefined;

  const bookingId = String(raw).trim();
  return bookingId.length > 0 ? bookingId : undefined;
}

export async function findBookingById(bookingId: string | undefined): Promise<BookingWithHotel | null> {
  if (!bookingId) return null;

  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: bookingHotelInclude,
  });
}

export async function findPaymeTransactionByPaymeId(
  paymeId: unknown,
): Promise<PaymeTransactionWithBooking | null> {
  const normalizedPaymeId = normalizePaymeTransactionId(paymeId);
  if (!normalizedPaymeId) return null;

  return prisma.paymeTransaction.findUnique({
    where: { paymeId: normalizedPaymeId },
    include: paymeTransactionInclude,
  });
}

/** One PaymeTransaction per booking (unique bookingId). */
export async function findPaymeTransactionByBookingId(
  bookingId: string | undefined,
): Promise<PaymeTransactionWithBooking | null> {
  if (!bookingId) return null;
  return prisma.paymeTransaction.findUnique({
    where: { bookingId },
    include: paymeTransactionInclude,
  });
}

export function buildReceiptDetail(booking: BookingWithHotel): PaymeReceiptDetail {
  return buildPaymeReceiptDetail({
    title: `Hotel booking - ${booking.hotel.name}`,
    priceTiyin: booking.amount,
  });
}

export function serializePaymeTransaction(
  transaction: PaymeTransactionWithBooking,
): PaymeStatementTransaction {
  return {
    id: transaction.paymeId,
    time: bigintToNumber(transaction.paymeTime),
    amount: transaction.amount,
    account: { booking_id: transaction.bookingId },
    create_time: bigintToNumber(transaction.paymeTime),
    perform_time: bigintToNumber(transaction.performTime),
    cancel_time: bigintToNumber(transaction.cancelTime),
    transaction: transaction.id,
    state: transaction.state,
    reason: transaction.reason ?? null,
  };
}

export function createTransactionResponse(transaction: {
  id: string;
  paymeTime: bigint;
  state: number;
}): PaymeCreateTransactionResult {
  return {
    create_time: bigintToNumber(transaction.paymeTime),
    transaction: transaction.id,
    state: transaction.state,
  };
}

export function toPerformTransactionResult(transaction: {
  id: string;
  performTime: bigint | null;
  state: number;
}) {
  return {
    transaction: transaction.id,
    perform_time: bigintToNumber(transaction.performTime),
    state: transaction.state,
  };
}

export function toCancelTransactionResult(transaction: {
  id: string;
  cancelTime: bigint | null;
  state: number;
}) {
  return {
    transaction: transaction.id,
    cancel_time: bigintToNumber(transaction.cancelTime),
    state: transaction.state,
  };
}

export function toCheckTransactionResult(transaction: {
  id: string;
  paymeTime: bigint;
  performTime: bigint | null;
  cancelTime: bigint | null;
  state: number;
  reason: number | null;
}) {
  return {
    create_time: bigintToNumber(transaction.paymeTime),
    perform_time:
      transaction.state === -1 ? 0 : bigintToNumber(transaction.performTime),
    cancel_time: bigintToNumber(transaction.cancelTime),
    transaction: transaction.id,
    state: transaction.state,
    reason: transaction.reason ?? null,
  };
}

export async function autoCancelExpiredTransaction(
  transaction: PaymeTransactionWithBooking,
): Promise<PaymeTransactionWithBooking> {
  if (transaction.state !== 1 || !isTransactionExpired(transaction.paymeTime)) {
    return transaction;
  }

  const cancelTime = BigInt(Date.now());

  return prisma.paymeTransaction.update({
    where: { id: transaction.id },
    data: {
      state: -1,
      reason: 4,
      cancelTime,
    },
    include: {
      booking: {
        include: bookingHotelInclude,
      },
    },
  });
}
