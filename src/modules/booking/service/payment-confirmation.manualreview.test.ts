import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";

const confirmPaymentForHotelBooking = vi.hoisted(() => vi.fn());
const ledgerRecord = vi.hoisted(() => vi.fn());
const enqueueInTx = vi.hoisted(() => vi.fn());

vi.mock("./booking.service", () => ({
  bookingService: { confirmPaymentForHotelBooking },
}));

vi.mock("@/src/modules/ledger", () => ({
  ledgerService: { record: ledgerRecord },
  MissingPartnerError: class MissingPartnerError extends Error {},
}));

vi.mock("@/src/modules/outbox", () => ({
  outboxService: { enqueueInTx },
  OutboxEventType: {
    DIDOX_INVOICE: "DIDOX_INVOICE",
    PAYMENT_RECEIPT: "PAYMENT_RECEIPT",
    BOOKING_CONFIRMED: "BOOKING_CONFIRMED",
    PARTNER_NOTIFY: "PARTNER_NOTIFY",
  },
}));

vi.mock("@/src/modules/commission", () => ({
  commissionService: {
    getRates: vi.fn(async () => ({
      HOTEL: 10,
      HOMESTAY: 10,
      GUIDE: 15,
      TAXI: 10,
    })),
  },
  calcPlatformCommissionTiyin: vi.fn((gross: bigint) => ({
    platformTotal: gross / 10n,
    partnerNet: gross - gross / 10n,
  })),
}));

vi.mock("@/src/shared/observability/sentry", () => ({
  setMoneyPathContext: vi.fn(),
}));

import { completeSuccessfulPaymentInTx } from "./payment-confirmation.service";

const som = (v: string) => ({ toString: () => v });

function makeTx(overrides: Record<string, unknown> = {}) {
  const tx = {
    // Row lock SELECT ... FOR UPDATE — payment still pending by default.
    $queryRaw: vi.fn(async () => [{ id: "pay1", status: "PENDING" }]),
    payment: {
      update: vi.fn(async () => ({
        id: "pay1",
        status: "SUCCESS",
        amount: som("100000.00"),
      })),
      findUniqueOrThrow: vi.fn(async () => ({
        id: "pay1",
        status: "SUCCESS",
        amount: som("100000.00"),
      })),
    },
    travelPlan: {
      update: vi.fn(async () => ({ id: "plan1", status: "CONFIRMED" })),
      findUniqueOrThrow: vi.fn(async () => ({
        id: "plan1",
        status: "PENDING_PAYMENT",
      })),
    },
    hotelBooking: {
      findMany: vi.fn(async () => []),
      update: vi.fn(async () => ({})),
    },
    hotel: {
      findUnique: vi.fn(async () => ({
        ownerType: "PARTNER",
        partner: { userId: "partner1" },
      })),
    },
    homeStayBooking: {
      findMany: vi.fn(async () => []),
      updateMany: vi.fn(async () => ({ count: 1 })),
      update: vi.fn(async () => ({})),
    },
    homeStayListing: {
      findUnique: vi.fn(async () => ({ hostId: "host1", ownerType: "PARTNER" })),
    },
    homeStayAvailability: {
      findFirst: vi.fn(async () => null),
      update: vi.fn(async () => ({})),
      create: vi.fn(async () => ({})),
    },
    guideBooking: {
      findMany: vi.fn(async () => []),
      updateMany: vi.fn(async () => ({ count: 1 })),
      update: vi.fn(async () => ({})),
    },
    guideListing: {
      findUnique: vi.fn(async () => ({ ownerType: "PARTNER" })),
    },
    guideBookingLog: { createMany: vi.fn(async () => ({})) },
    auditLog: { create: vi.fn(async () => ({})) },
    partnerEarning: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({})),
    },
    ...overrides,
  };
  return tx as unknown as Prisma.TransactionClient & typeof tx;
}

const baseOpts = {
  paymentId: "pay1",
  travelPlanId: "plan1",
  actorId: "user1",
  previousPaymentStatus: "PENDING",
};

beforeEach(() => {
  confirmPaymentForHotelBooking.mockReset();
  ledgerRecord.mockReset();
  enqueueInTx.mockReset();
});

describe("completeSuccessfulPaymentInTx — manual review safety", () => {
  it("confirms the plan when every booking confirms", async () => {
    const tx = makeTx({
      hotelBooking: {
        findMany: vi.fn(async () => [
          {
            id: "hb1",
            hotelId: "h1",
            totalAmount: som("100000.00"),
            status: "HELD",
          },
        ]),
        update: vi.fn(async () => ({})),
      },
    });
    confirmPaymentForHotelBooking.mockResolvedValue({
      ok: true,
      booking: { id: "hb1" },
    });

    const result = await completeSuccessfulPaymentInTx(tx, baseOpts);

    expect(tx.travelPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "CONFIRMED" } }),
    );
    expect(result.plan.status).toBe("CONFIRMED");
    expect(ledgerRecord).toHaveBeenCalledTimes(1);
    const confirmedEvents = enqueueInTx.mock.calls.filter(
      ([, e]) => (e as { eventType: string }).eventType === "BOOKING_CONFIRMED",
    );
    expect(confirmedEvents).toHaveLength(1);
  });

  it("does NOT confirm the plan when a hotel booking needs manual review", async () => {
    const tx = makeTx({
      hotelBooking: {
        findMany: vi.fn(async () => [
          {
            id: "hb1",
            hotelId: "h1",
            totalAmount: som("100000.00"),
            status: "EXPIRED",
          },
        ]),
        update: vi.fn(async () => ({})),
      },
    });
    confirmPaymentForHotelBooking.mockResolvedValue({
      ok: false,
      reason: "MANUAL_REVIEW",
    });

    const result = await completeSuccessfulPaymentInTx(tx, baseOpts);

    // Money arrived but no ledger entry backs it, so the payment must not claim
    // SUCCESS — that is exactly what used to break PSP ↔ ledger reconciliation.
    expect(tx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING_REVIEW" }),
      }),
    );
    expect(tx.payment.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUCCESS" }),
      }),
    );
    // The plan is NOT blind-confirmed either.
    expect(tx.travelPlan.update).not.toHaveBeenCalled();
    expect(result.plan.status).toBe("PENDING_PAYMENT");
    // No ledger post, no confirmation push for the failed booking.
    expect(ledgerRecord).not.toHaveBeenCalled();
    const confirmedEvents = enqueueInTx.mock.calls.filter(
      ([, e]) => (e as { eventType: string }).eventType === "BOOKING_CONFIRMED",
    );
    expect(confirmedEvents).toHaveLength(0);
    // Nothing that asserts a settled sale goes out while under review.
    const settledEvents = enqueueInTx.mock.calls.filter(([, e]) =>
      ["DIDOX_INVOICE", "PAYMENT_RECEIPT"].includes(
        (e as { eventType: string }).eventType,
      ),
    );
    expect(settledEvents).toHaveLength(0);
    // Ops audit trail exists.
    const auditActions = (
      tx.auditLog.create as ReturnType<typeof vi.fn>
    ).mock.calls.map(
      ([arg]) => (arg as { data: { action: string } }).data.action,
    );
    expect(auditActions).toContain("PAYMENT_SUCCESS_MANUAL_REVIEW");
  });

  it("settles to SUCCESS once every booking confirmed and posted", async () => {
    const tx = makeTx({
      hotelBooking: {
        findMany: vi.fn(async () => [
          {
            id: "hb1",
            hotelId: "h1",
            totalAmount: som("100000.00"),
            status: "HELD",
          },
        ]),
        update: vi.fn(async () => ({})),
      },
    });
    confirmPaymentForHotelBooking.mockResolvedValue({
      ok: true,
      booking: { id: "hb1" },
    });

    await completeSuccessfulPaymentInTx(tx, baseOpts);

    expect(ledgerRecord).toHaveBeenCalledTimes(1);
    expect(tx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUCCESS" }),
      }),
    );
    const settledEvents = enqueueInTx.mock.calls.filter(([, e]) =>
      ["DIDOX_INVOICE", "PAYMENT_RECEIPT"].includes(
        (e as { eventType: string }).eventType,
      ),
    );
    expect(settledEvents).toHaveLength(2);
  });

  it("never resurrects an expired homestay booking (conditional confirm)", async () => {
    const tx = makeTx({
      homeStayBooking: {
        findMany: vi.fn(async () => [
          {
            id: "hs1",
            listingId: "l1",
            checkIn: new Date("2026-08-10"),
            checkOut: new Date("2026-08-12"),
            totalPrice: som("50000.00"),
          },
        ]),
        // Race: hold-expiry cancelled it between read and confirm.
        updateMany: vi.fn(async () => ({ count: 0 })),
        update: vi.fn(async () => ({})),
      },
    });

    const result = await completeSuccessfulPaymentInTx(tx, baseOpts);

    expect(tx.travelPlan.update).not.toHaveBeenCalled();
    expect(result.plan.status).toBe("PENDING_PAYMENT");
    expect(ledgerRecord).not.toHaveBeenCalled();
    // Availability must not be (re)created for a cancelled booking.
    expect(tx.homeStayAvailability.create).not.toHaveBeenCalled();
  });

  it("confirms homestay only with status=PENDING guard in the update", async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const tx = makeTx({
      homeStayBooking: {
        findMany: vi.fn(async () => [
          {
            id: "hs1",
            listingId: "l1",
            checkIn: new Date("2026-08-10"),
            checkOut: new Date("2026-08-12"),
            totalPrice: som("50000.00"),
          },
        ]),
        updateMany,
        update: vi.fn(async () => ({})),
      },
    });

    await completeSuccessfulPaymentInTx(tx, baseOpts);

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "PENDING" }),
      }),
    );
    expect(tx.travelPlan.update).toHaveBeenCalled();
    expect(ledgerRecord).toHaveBeenCalledTimes(1);
  });

  it("replays idempotently when payment row is already SUCCESS (webhook race)", async () => {
    const tx = makeTx();
    (tx.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "pay1", status: "SUCCESS" },
    ]);

    const result = await completeSuccessfulPaymentInTx(tx, baseOpts);

    // Second concurrent webhook: no re-application of side effects.
    expect(tx.payment.update).not.toHaveBeenCalled();
    expect(tx.travelPlan.update).not.toHaveBeenCalled();
    expect(ledgerRecord).not.toHaveBeenCalled();
    expect(enqueueInTx).not.toHaveBeenCalled();
    expect(result.payment.status).toBe("SUCCESS");
  });
});
