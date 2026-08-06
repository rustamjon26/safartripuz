/**
 * The three read-only Payme `booking_id` RPC methods, after moving off direct
 * Prisma onto paymeBookingRepository. Payme scores a merchant on exact error
 * codes, so each branch is asserted against the code it must return.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = {
  findBookingById: vi.fn(),
  findTransactionByPaymeId: vi.fn(),
  findTransactionByBookingId: vi.fn(),
  findTransactionsInWindow: vi.fn(),
  markTransactionCancelled: vi.fn(),
};

// Both specifiers resolve to the same file; the migrated methods use the
// relative one and app/api/payme/utils/helpers.ts uses the alias.
vi.mock("../../../repository/payme-booking.repository", () => ({
  paymeBookingRepository: repo,
}));
vi.mock("@/src/modules/payment", () => ({ paymeBookingRepository: repo }));

const { PAYME_ERRORS } = await import("../../../domain/errors");
const { checkPerformTransaction } = await import("./checkPerformTransaction");
const { checkTransaction } = await import("./checkTransaction");
const { getStatement } = await import("./getStatement");

function booking(overrides: Record<string, unknown> = {}) {
  return {
    id: "bk_1",
    amount: 500_000,
    status: "PENDING",
    checkIn: new Date("2030-01-01T00:00:00.000Z"),
    checkOut: new Date("2030-01-03T00:00:00.000Z"),
    hotel: { id: "h_1", name: "Registon" },
    ...overrides,
  };
}

const RPC_ID = 77;

beforeEach(() => {
  vi.clearAllMocks();
  repo.findBookingById.mockResolvedValue(null);
  repo.findTransactionByPaymeId.mockResolvedValue(null);
  repo.findTransactionByBookingId.mockResolvedValue(null);
  repo.findTransactionsInWindow.mockResolvedValue([]);
});

describe("CheckPerformTransaction", () => {
  it("allows a pending booking whose amount matches exactly", async () => {
    repo.findBookingById.mockResolvedValue(booking());

    const res = await checkPerformTransaction(RPC_ID, {
      account: { booking_id: "bk_1" },
      amount: 500_000,
    });

    expect(repo.findBookingById).toHaveBeenCalledWith("bk_1");
    expect(res).toMatchObject({ id: RPC_ID, result: { allow: true } });
  });

  it("reports a missing booking, and does not query on a missing account", async () => {
    const res = await checkPerformTransaction(RPC_ID, { account: {}, amount: 1 });
    expect(repo.findBookingById).not.toHaveBeenCalled();
    expect(res).toMatchObject({
      error: { code: PAYME_ERRORS.INVALID_ACCOUNT.code, data: "booking_id" },
    });
  });

  it("rejects a mismatched amount", async () => {
    repo.findBookingById.mockResolvedValue(booking({ amount: 500_000 }));
    const res = await checkPerformTransaction(RPC_ID, {
      account: { booking_id: "bk_1" },
      amount: 499_999,
    });
    expect(res).toMatchObject({
      error: { code: PAYME_ERRORS.WRONG_AMOUNT.code, data: "amount" },
    });
  });

  it("rejects a fractional or non-numeric amount as a mismatch", async () => {
    repo.findBookingById.mockResolvedValue(booking());
    for (const amount of [500_000.5, "500000", null, undefined]) {
      const res = await checkPerformTransaction(RPC_ID, {
        account: { booking_id: "bk_1" },
        amount: amount as never,
      });
      expect(res, String(amount)).toMatchObject({
        error: { code: PAYME_ERRORS.WRONG_AMOUNT.code },
      });
    }
  });

  it("refuses an already paid booking", async () => {
    repo.findBookingById.mockResolvedValue(booking({ status: "PAID" }));
    const res = await checkPerformTransaction(RPC_ID, {
      account: { booking_id: "bk_1" },
      amount: 500_000,
    });
    expect(res).toMatchObject({
      error: { code: PAYME_ERRORS.ORDER_ALREADY_PAID.code },
    });
  });

  it("refuses a cancelled booking", async () => {
    repo.findBookingById.mockResolvedValue(booking({ status: "CANCELLED" }));
    const res = await checkPerformTransaction(RPC_ID, {
      account: { booking_id: "bk_1" },
      amount: 500_000,
    });
    expect(res).toMatchObject({
      error: { code: PAYME_ERRORS.INVALID_ACCOUNT.code },
    });
  });
});

describe("CheckTransaction", () => {
  it("rejects a missing transaction id before touching the database", async () => {
    const res = await checkTransaction(RPC_ID, { id: undefined });
    expect(repo.findTransactionByPaymeId).not.toHaveBeenCalled();
    expect(res).toMatchObject({ error: { code: PAYME_ERRORS.INTERNAL.code } });
  });

  it("reports an unknown transaction", async () => {
    const res = await checkTransaction(RPC_ID, { id: "pt_missing" });
    expect(repo.findTransactionByPaymeId).toHaveBeenCalledWith("pt_missing");
    expect(res).toMatchObject({
      error: { code: PAYME_ERRORS.TRANSACTION_NOT_FOUND.code },
    });
  });

  it("returns the transaction state", async () => {
    repo.findTransactionByPaymeId.mockResolvedValue({
      id: "row_1",
      paymeId: "pt_1",
      state: 2,
      reason: null,
      paymeTime: BigInt(Date.now()),
      createTime: BigInt(Date.now()),
      performTime: BigInt(Date.now()),
      cancelTime: null,
      booking: booking(),
    });

    const res = await checkTransaction(RPC_ID, { id: "pt_1" });
    expect(res).toMatchObject({ id: RPC_ID, result: { state: 2 } });
    expect(repo.markTransactionCancelled).not.toHaveBeenCalled();
  });

  it("auto-cancels a transaction left pending past the 12 hour timeout", async () => {
    const stale = BigInt(Date.now() - 13 * 60 * 60 * 1000);
    repo.findTransactionByPaymeId.mockResolvedValue({
      id: "row_2",
      paymeId: "pt_2",
      state: 1,
      reason: null,
      paymeTime: stale,
      createTime: stale,
      performTime: null,
      cancelTime: null,
      booking: booking(),
    });
    repo.markTransactionCancelled.mockResolvedValue({
      id: "row_2",
      paymeId: "pt_2",
      state: -1,
      reason: 4,
      paymeTime: stale,
      createTime: stale,
      performTime: null,
      cancelTime: BigInt(Date.now()),
      booking: booking(),
    });

    const res = await checkTransaction(RPC_ID, { id: "pt_2" });

    expect(repo.markTransactionCancelled).toHaveBeenCalledWith(
      "row_2",
      expect.objectContaining({ reason: 4 }),
    );
    expect(res).toMatchObject({ result: { state: -1, reason: 4 } });
  });
});

describe("GetStatement", () => {
  it("rejects a non-numeric window", async () => {
    for (const params of [{}, { from: "1", to: 2 }, { from: 1 }, { from: Number.NaN, to: 2 }]) {
      const res = await getStatement(RPC_ID, params as never);
      expect(res).toMatchObject({ error: { code: PAYME_ERRORS.INTERNAL.code } });
    }
    expect(repo.findTransactionsInWindow).not.toHaveBeenCalled();
  });

  it("returns an empty list for an inverted window without querying", async () => {
    const res = await getStatement(RPC_ID, { from: 200, to: 100 });
    expect(res).toMatchObject({ result: { transactions: [] } });
    expect(repo.findTransactionsInWindow).not.toHaveBeenCalled();
  });

  it("queries the window as bigints", async () => {
    const res = await getStatement(RPC_ID, { from: 100, to: 200 });
    expect(repo.findTransactionsInWindow).toHaveBeenCalledWith(100n, 200n);
    expect(res).toMatchObject({ result: { transactions: [] } });
  });
});
