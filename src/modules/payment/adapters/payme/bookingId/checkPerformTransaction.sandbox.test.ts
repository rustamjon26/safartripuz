import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = {
  findBookingById: vi.fn(),
  findTransactionByPaymeId: vi.fn(),
  findTransactionByBookingId: vi.fn(),
  findTransactionsInWindow: vi.fn(),
  markTransactionCancelled: vi.fn(),
};

vi.mock("../../../repository/payme-booking.repository", () => ({
  paymeBookingRepository: repo,
}));
vi.mock("@/src/modules/payment", () => ({ paymeBookingRepository: repo }));

vi.mock("@/app/api/payme/utils/helpers", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/api/payme/utils/helpers")
  >("@/app/api/payme/utils/helpers");
  return {
    ...actual,
    autoCancelExpiredTransaction: vi.fn(async (tx: { state: number }) => tx),
  };
});

const { PAYME_ERRORS } = await import("../../../domain/errors");
const { checkPerformTransaction } = await import("./checkPerformTransaction");
const helpers = await import("@/app/api/payme/utils/helpers");

const PENDING_BOOKING = {
  id: "payme-test-001",
  amount: 15_000_000,
  status: "PENDING",
  hotel: { id: "h1", name: "Test Hotel" },
};

describe("CheckPerformTransaction sandbox account errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.findBookingById.mockResolvedValue(null);
    repo.findTransactionByBookingId.mockResolvedValue(null);
    vi.mocked(helpers.autoCancelExpiredTransaction).mockImplementation(
      async (tx: { state: number }) => tx,
    );
  });

  it("unknown booking_id → -31050 INVALID_ACCOUNT (sandbox range -31099..-31050)", async () => {
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
    expect(res.error?.code).not.toBe(-31001);
    expect(res.error?.code).not.toBe(-31003);
  });

  it("empty account → -31050 INVALID_ACCOUNT", async () => {
    const res = (await checkPerformTransaction(1, {
      amount: 50000,
      account: {},
    })) as { error?: { code: number } };

    expect(repo.findBookingById).not.toHaveBeenCalled();
    expect(res.error?.code).toBe(-31050);
  });

  it("Обрабатывается: active state=1 transaction → -31099 ORDER_ALREADY_PAID", async () => {
    repo.findBookingById.mockResolvedValue(PENDING_BOOKING);
    repo.findTransactionByBookingId.mockResolvedValue({
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
    repo.findBookingById.mockResolvedValue(PENDING_BOOKING);
    repo.findTransactionByBookingId.mockResolvedValue(null);

    const res = (await checkPerformTransaction(1, {
      amount: 15_000_000,
      account: { booking_id: "payme-test-001" },
    })) as { result?: { allow?: boolean }; error?: { code: number } };

    expect(res.error).toBeUndefined();
    expect(res.result?.allow).toBe(true);
  });

  it("Заблокирован: CANCELLED booking → -31050", async () => {
    repo.findBookingById.mockResolvedValue({
      ...PENDING_BOOKING,
      status: "CANCELLED",
    });

    const res = (await checkPerformTransaction(1, {
      amount: 15_000_000,
      account: { booking_id: "payme-test-001" },
    })) as { error?: { code: number } };

    expect(res.error?.code).toBe(-31050);
  });
});
