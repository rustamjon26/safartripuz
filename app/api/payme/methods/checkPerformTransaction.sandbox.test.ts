import { beforeEach, describe, expect, it, vi } from "vitest";

const findBookingById = vi.hoisted(() =>
  vi.fn<(id: string | undefined) => Promise<unknown>>(),
);
const findPaymeTransactionByBookingId = vi.hoisted(() =>
  vi.fn<(id: string | undefined) => Promise<unknown>>(),
);
const autoCancelExpiredTransaction = vi.hoisted(() =>
  vi.fn(async (tx: { state: number }) => tx),
);

vi.mock("../utils/helpers", async () => {
  const actual = await vi.importActual<typeof import("../utils/helpers")>(
    "../utils/helpers",
  );
  return {
    ...actual,
    findBookingById: (id: string | undefined) => findBookingById(id),
    findPaymeTransactionByBookingId: (id: string | undefined) =>
      findPaymeTransactionByBookingId(id),
    autoCancelExpiredTransaction: (tx: { state: number }) =>
      autoCancelExpiredTransaction(tx),
  };
});

import { checkPerformTransaction } from "./checkPerformTransaction";
import { PAYME_ERRORS } from "../utils/errors";

const PENDING_BOOKING = {
  id: "payme-test-001",
  amount: 15_000_000,
  status: "PENDING",
  hotel: { id: "h1", name: "Test Hotel" },
};

describe("CheckPerformTransaction sandbox account errors", () => {
  beforeEach(() => {
    findBookingById.mockReset();
    findPaymeTransactionByBookingId.mockReset();
    autoCancelExpiredTransaction.mockReset();
    autoCancelExpiredTransaction.mockImplementation(async (tx) => tx);
  });

  it("unknown booking_id → -31050 INVALID_ACCOUNT (sandbox range -31099..-31050)", async () => {
    findBookingById.mockResolvedValue(null);

    const res = (await checkPerformTransaction(40269, {
      amount: 289525,
      account: { booking_id: "42141412412412341321" },
    })) as { id: number; error?: { code: number; data?: string } };

    expect(res.id).toBe(40269);
    expect(res.error?.code).toBe(PAYME_ERRORS.INVALID_ACCOUNT.code);
    expect(res.error?.code).toBe(-31050);
    expect(res.error?.code).toBeGreaterThanOrEqual(-31099);
    expect(res.error?.code).toBeLessThanOrEqual(-31050);
    expect(res.error?.data).toBe("booking_id");
    // Must NOT be the wrong-amount code the sandbox rejected earlier.
    expect(res.error?.code).not.toBe(-31001);
    expect(res.error?.code).not.toBe(-31003);
  });

  it("empty account → -31050 INVALID_ACCOUNT", async () => {
    findBookingById.mockResolvedValue(null);

    const res = (await checkPerformTransaction(1, {
      amount: 50000,
      account: {},
    })) as { error?: { code: number } };

    expect(res.error?.code).toBe(-31050);
  });

  it("Обрабатывается: active state=1 transaction → -31099 ORDER_ALREADY_PAID", async () => {
    findBookingById.mockResolvedValue(PENDING_BOOKING);
    findPaymeTransactionByBookingId.mockResolvedValue({
      id: "ptx_1",
      bookingId: "payme-test-001",
      state: 1,
      booking: PENDING_BOOKING,
    });

    const res = (await checkPerformTransaction(48716, {
      amount: 15_000_000,
      account: { booking_id: "payme-test-001" },
    })) as { result?: unknown; error?: { code: number } };

    expect(res.result).toBeUndefined();
    expect(res.error?.code).toBe(-31099);
  });

  it("Ожидает оплаты: no active transaction → allow true", async () => {
    findBookingById.mockResolvedValue(PENDING_BOOKING);
    findPaymeTransactionByBookingId.mockResolvedValue(null);

    const res = (await checkPerformTransaction(1, {
      amount: 15_000_000,
      account: { booking_id: "payme-test-001" },
    })) as { result?: { allow?: boolean }; error?: { code: number } };

    expect(res.error).toBeUndefined();
    expect(res.result?.allow).toBe(true);
  });

  it("Заблокирован: CANCELLED booking → -31050", async () => {
    findBookingById.mockResolvedValue({ ...PENDING_BOOKING, status: "CANCELLED" });

    const res = (await checkPerformTransaction(1, {
      amount: 15_000_000,
      account: { booking_id: "payme-test-001" },
    })) as { error?: { code: number } };

    expect(res.error?.code).toBe(-31050);
  });
});

