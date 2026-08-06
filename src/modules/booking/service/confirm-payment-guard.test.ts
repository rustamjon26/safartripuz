/**
 * The state table alone cannot stop a skip-payment confirm: the guard has to
 * run inside `transition`, against the locked row, so no call site can reach
 * CONFIRMED from PENDING/HELD by convention.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";

const repo = vi.hoisted(() => ({
  lockByIdForUpdate: vi.fn(),
  hasRecordedPayment: vi.fn(async () => false),
  updateStatus: vi.fn(async (_id: string, status: string) => ({
    id: "bk1",
    status,
  })),
}));

const events = vi.hoisted(() => ({ create: vi.fn(async () => {}) }));

vi.mock("../repository/booking.repository", () => ({
  bookingRepository: repo,
}));
vi.mock("../repository/booking-event.repository", () => ({
  bookingEventRepository: events,
}));

vi.mock("@/src/modules/inventory", () => ({
  HOLD_TTL_MS: 15 * 60 * 1000,
  inventoryService: {
    withSerializableRetry: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        bookingRoomAssignment: {
          findMany: vi.fn(async () => []),
          updateMany: vi.fn(async () => ({ count: 0 })),
        },
        physicalRoom: { updateMany: vi.fn(async () => ({ count: 0 })) },
      }),
    releaseRoomNightsInTx: vi.fn(),
    reserveRoomNightsInTx: vi.fn(),
  },
}));

vi.mock("@/src/modules/ledger", () => ({
  MissingPartnerError: class extends Error {},
  calcPlatformCommissionTiyin: () => ({ platformTotal: 0n, partnerNet: 0n }),
  ledgerService: {},
  ledgerRepository: {},
}));

vi.mock("@/src/modules/outbox", () => ({
  OutboxEventType: {},
  outboxService: { enqueueInTx: vi.fn() },
}));

vi.mock("@/lib/getCommissionRates", () => ({
  getCommissionRates: async () => ({ HOTEL: 10, HOMESTAY: 10, GUIDE: 15, TAXI: 15 }),
  calcCommissionTiyin: () => ({ commissionFee: 0n, netAmount: 0n }),
}));

import { UnpaidConfirmationError } from "../domain/booking.state";
import { bookingService } from "./booking.service";

function bookingAt(status: string) {
  return {
    id: "bk1",
    status,
    paidAmount: { toString: () => "0" } as unknown as Prisma.Decimal,
    totalAmount: { toString: () => "500000" } as unknown as Prisma.Decimal,
    travelPlanId: null,
    roomTypeId: "rt1",
    checkInDate: new Date("2030-01-10"),
    checkOutDate: new Date("2030-01-12"),
    roomCount: 1,
  };
}

const ctx = { actor: "PARTNER" as const, reason: "HMS_STATUS_PATCH" };

beforeEach(() => {
  vi.clearAllMocks();
  repo.updateStatus.mockImplementation(async (_id: string, status: string) => ({
    id: "bk1",
    status,
  }));
});

describe("transition to CONFIRMED without a recorded payment", () => {
  it("rejects PENDING → CONFIRMED", async () => {
    repo.lockByIdForUpdate.mockResolvedValue(bookingAt("PENDING"));
    repo.hasRecordedPayment.mockResolvedValue(false);

    await expect(
      bookingService.transition("bk1", "CONFIRMED", ctx),
    ).rejects.toBeInstanceOf(UnpaidConfirmationError);

    expect(repo.updateStatus).not.toHaveBeenCalled();
    expect(events.create).not.toHaveBeenCalled();
  });

  it("rejects HELD → CONFIRMED", async () => {
    repo.lockByIdForUpdate.mockResolvedValue(bookingAt("HELD"));
    repo.hasRecordedPayment.mockResolvedValue(false);

    await expect(
      bookingService.transition("bk1", "CONFIRMED", ctx),
    ).rejects.toBeInstanceOf(UnpaidConfirmationError);

    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  it("cannot be talked into it by the caller's context", async () => {
    repo.lockByIdForUpdate.mockResolvedValue(bookingAt("PENDING"));
    repo.hasRecordedPayment.mockResolvedValue(false);

    await expect(
      bookingService.transition("bk1", "CONFIRMED", {
        ...ctx,
        // A caller claiming the money is there changes nothing; the answer
        // comes from the repository read.
        extra: { paidAmount: 500000 },
        metadata: { paymentConfirmed: true },
      }),
    ).rejects.toBeInstanceOf(UnpaidConfirmationError);

    expect(repo.updateStatus).not.toHaveBeenCalled();
  });
});

describe("transition to CONFIRMED with a recorded payment", () => {
  it("allows PENDING → CONFIRMED once the payment is on record", async () => {
    repo.lockByIdForUpdate.mockResolvedValue(bookingAt("PENDING"));
    repo.hasRecordedPayment.mockResolvedValue(true);

    const updated = await bookingService.transition("bk1", "CONFIRMED", ctx);

    expect(updated.status).toBe("CONFIRMED");
    expect(repo.hasRecordedPayment).toHaveBeenCalledTimes(1);
  });

  it("allows HELD → CONFIRMED once the payment is on record", async () => {
    repo.lockByIdForUpdate.mockResolvedValue(bookingAt("HELD"));
    repo.hasRecordedPayment.mockResolvedValue(true);

    const updated = await bookingService.transition("bk1", "CONFIRMED", ctx);
    expect(updated.status).toBe("CONFIRMED");
  });
});

describe("the legal payment chain is untouched", () => {
  it("PAID → CONFIRMED never consults the payment guard", async () => {
    repo.lockByIdForUpdate.mockResolvedValue(bookingAt("PAID"));

    const updated = await bookingService.transition("bk1", "CONFIRMED", ctx);

    expect(updated.status).toBe("CONFIRMED");
    // The booking is already PAID; no extra lookup is needed or performed.
    expect(repo.hasRecordedPayment).not.toHaveBeenCalled();
  });

  it("HELD → PAID stays open", async () => {
    repo.lockByIdForUpdate.mockResolvedValue(bookingAt("HELD"));

    const updated = await bookingService.transition("bk1", "PAID", ctx);

    expect(updated.status).toBe("PAID");
    expect(repo.hasRecordedPayment).not.toHaveBeenCalled();
  });

  it("PENDING → HELD stays open", async () => {
    repo.lockByIdForUpdate.mockResolvedValue(bookingAt("PENDING"));

    const updated = await bookingService.transition("bk1", "HELD", ctx);
    expect(updated.status).toBe("HELD");
  });
});
