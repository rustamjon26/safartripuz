import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  paymeTransaction: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("@/lib/prisma", () => ({ prisma }));

const helpers = {
  autoCancelExpiredTransaction: vi.fn(async (tx: { state: number }) => tx),
  createTransactionResponse: vi.fn((tx: { id: string; state: number }) => ({
    create_time: 1,
    transaction: tx.id,
    state: tx.state,
    receivers: null,
  })),
  findBookingById: vi.fn(),
  findPaymeTransactionByPaymeId: vi.fn(),
  getBookingIdFromAccount: vi.fn(
    (account: { booking_id?: string } | undefined) => account?.booking_id ?? null,
  ),
  isValidTiyinAmount: vi.fn((n: unknown) => typeof n === "number" && Number.isInteger(n)),
  normalizePaymeTransactionId: vi.fn((raw: unknown) =>
    typeof raw === "string" && raw.length > 0 ? raw : undefined,
  ),
};

vi.mock("../utils/helpers", () => helpers);

const { createTransaction } = await import("./createTransaction");

const PENDING = {
  id: "payme-test-001",
  amount: 15_000_000,
  status: "PENDING",
  hotel: { id: "h1", name: "Test" },
};

describe("CreateTransaction sandbox account errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    helpers.findPaymeTransactionByPaymeId.mockResolvedValue(null);
    helpers.findBookingById.mockResolvedValue(null);
    prisma.paymeTransaction.findUnique.mockResolvedValue(null);
    helpers.autoCancelExpiredTransaction.mockImplementation(async (tx) => tx);
  });

  it("Не существует: unknown booking_id → -31050", async () => {
    const res = (await createTransaction(1, {
      id: "payme-tx-new",
      time: Date.now(),
      amount: 15_000_000,
      account: { booking_id: "payme-test-missing" },
    })) as { error?: { code: number; data?: string } };

    expect(res.error?.code).toBe(-31050);
    expect(res.error?.data).toBe("booking_id");
  });

  it("Заблокирован: PAID booking → -31099 (not -31008)", async () => {
    helpers.findBookingById.mockResolvedValue({ ...PENDING, status: "PAID" });

    const res = (await createTransaction(1, {
      id: "payme-tx-new",
      time: Date.now(),
      amount: 15_000_000,
      account: { booking_id: "payme-test-001" },
    })) as { error?: { code: number } };

    expect(res.error?.code).toBe(-31099);
    expect(res.error?.code).toBeGreaterThanOrEqual(-31099);
    expect(res.error?.code).toBeLessThanOrEqual(-31050);
  });

  it("Заблокирован: CANCELLED booking → -31050 (not -31003)", async () => {
    helpers.findBookingById.mockResolvedValue({
      ...PENDING,
      status: "CANCELLED",
    });

    const res = (await createTransaction(1, {
      id: "payme-tx-new",
      time: Date.now(),
      amount: 15_000_000,
      account: { booking_id: "payme-test-001" },
    })) as { error?: { code: number } };

    expect(res.error?.code).toBe(-31050);
  });

  it("Обрабатывается: active state=1 → -31099", async () => {
    helpers.findBookingById.mockResolvedValue(PENDING);
    prisma.paymeTransaction.findUnique.mockResolvedValue({
      id: "ptx_1",
      bookingId: "payme-test-001",
      state: 1,
      amount: 15_000_000,
    });

    const res = (await createTransaction(1, {
      id: "payme-tx-new",
      time: Date.now(),
      amount: 15_000_000,
      account: { booking_id: "payme-test-001" },
    })) as { error?: { code: number } };

    expect(res.error?.code).toBe(-31099);
  });

  it("Ожидает оплаты: creates state=1 transaction", async () => {
    helpers.findBookingById.mockResolvedValue(PENDING);
    prisma.paymeTransaction.create.mockResolvedValue({
      id: "ptx_new",
      state: 1,
      amount: 15_000_000,
    });

    const res = (await createTransaction(1, {
      id: "payme-tx-new",
      time: Date.now(),
      amount: 15_000_000,
      account: { booking_id: "payme-test-001" },
    })) as { result?: { state?: number }; error?: { code: number } };

    expect(res.error).toBeUndefined();
    expect(res.result?.state).toBe(1);
    expect(prisma.paymeTransaction.create).toHaveBeenCalled();
  });
});
