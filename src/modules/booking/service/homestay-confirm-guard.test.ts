/**
 * A PENDING homestay booking is an unpaid 15-minute hold — payment is what
 * moves it to CONFIRMED (see completeSuccessfulPaymentInTx). The host-facing
 * confirm action bypassed that, marking a stay sold with nothing behind it.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({
  findHomestayStatusAndPlan: vi.fn(),
  hasHomestayRecordedPayment: vi.fn(async () => false),
  lockByIdForUpdate: vi.fn(),
  updateStatus: vi.fn(),
}));

vi.mock("../repository/booking.repository", () => ({
  bookingRepository: repo,
}));
vi.mock("../repository/booking-event.repository", () => ({
  bookingEventRepository: { create: vi.fn() },
}));

vi.mock("@/src/modules/inventory", () => ({
  HOLD_TTL_MS: 15 * 60 * 1000,
  inventoryService: {
    withSerializableRetry: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("assertHomestayPaymentRecorded", () => {
  it("refuses a PENDING booking with no settled payment", async () => {
    repo.findHomestayStatusAndPlan.mockResolvedValue({
      status: "PENDING",
      travelPlanId: "tp1",
    });
    repo.hasHomestayRecordedPayment.mockResolvedValue(false);

    await expect(
      bookingService.assertHomestayPaymentRecorded("hs1"),
    ).rejects.toBeInstanceOf(UnpaidConfirmationError);
  });

  it("refuses a booking that is not attached to any travel plan", async () => {
    repo.findHomestayStatusAndPlan.mockResolvedValue({
      status: "PENDING",
      travelPlanId: null,
    });
    repo.hasHomestayRecordedPayment.mockResolvedValue(false);

    await expect(
      bookingService.assertHomestayPaymentRecorded("hs1"),
    ).rejects.toBeInstanceOf(UnpaidConfirmationError);
  });

  it("allows it once the travel plan payment succeeded", async () => {
    repo.findHomestayStatusAndPlan.mockResolvedValue({
      status: "PENDING",
      travelPlanId: "tp1",
    });
    repo.hasHomestayRecordedPayment.mockResolvedValue(true);

    await expect(
      bookingService.assertHomestayPaymentRecorded("hs1"),
    ).resolves.toBeUndefined();
  });

  it("reads the answer from the repository, never from the caller", async () => {
    repo.findHomestayStatusAndPlan.mockResolvedValue({
      status: "PENDING",
      travelPlanId: "tp1",
    });
    repo.hasHomestayRecordedPayment.mockResolvedValue(false);

    await expect(
      bookingService.assertHomestayPaymentRecorded("hs1"),
    ).rejects.toBeInstanceOf(UnpaidConfirmationError);

    expect(repo.hasHomestayRecordedPayment).toHaveBeenCalledWith(
      { status: "PENDING", travelPlanId: "tp1" },
      undefined,
    );
  });

  it("throws a plain error for a missing booking", async () => {
    repo.findHomestayStatusAndPlan.mockResolvedValue(null);

    await expect(
      bookingService.assertHomestayPaymentRecorded("nope"),
    ).rejects.toThrow(/not found/);
  });
});
