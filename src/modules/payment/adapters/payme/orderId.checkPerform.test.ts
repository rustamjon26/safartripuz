import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findPaymentWithTravelPlanUser,
  getCachedResponse,
  storeProcessedResponse,
} = vi.hoisted(() => ({
  findPaymentWithTravelPlanUser: vi.fn<(id: string) => Promise<unknown>>(),
  getCachedResponse: vi.fn<(provider: string, eventId: string) => Promise<unknown>>(
    async () => null,
  ),
  storeProcessedResponse: vi.fn<(input: unknown) => Promise<void>>(async () => undefined),
}));

vi.mock("../../repository/payment.repository", () => ({
  paymentRepository: {
    findPaymentWithTravelPlanUser,
    findPaymentByExternalRefAndProvider: vi.fn(),
    updatePaymentFields: vi.fn(),
    runTransaction: vi.fn(),
  },
}));

vi.mock("../../service/payment.service", () => ({
  paymentService: {
    getCachedResponse,
    storeProcessedResponse,
    createIntent: vi.fn(),
  },
}));

vi.mock("@/lib/payments/completeSuccessfulPaymentTx", () => ({
  completeSuccessfulPaymentInTx: vi.fn(),
}));

vi.mock("@/src/shared/observability/sentry", () => ({
  setMoneyPathContext: vi.fn(),
}));

import { handleOrderIdMethod } from "./orderIdHandlers";
import { PAYME_ERRORS } from "../../domain/errors";

describe("order_id CheckPerformTransaction fiscal detail", () => {
  beforeEach(() => {
    findPaymentWithTravelPlanUser.mockReset();
    getCachedResponse.mockClear();
    storeProcessedResponse.mockClear();
    delete process.env.PAYME_MXIK_CODE;
    delete process.env.PAYME_PACKAGE_CODE;
    delete process.env.PAYME_VAT_PERCENT;
  });

  it("returns allow + detail with title/price/count/code/package_code/vat_percent", async () => {
    process.env.PAYME_MXIK_CODE = "10405001001000000";
    process.env.PAYME_PACKAGE_CODE = "1505098";
    process.env.PAYME_VAT_PERCENT = "12";

    findPaymentWithTravelPlanUser.mockResolvedValue({
      id: "pay_1",
      provider: "PAYME",
      status: "PENDING",
      amount: { toString: () => "15000.00" },
      amountTiyin: 1_500_000n,
      travelPlanId: "tp_1",
      travelPlan: { id: "tp_1", userId: "u_1" },
    });

    const res = (await handleOrderIdMethod(
      "CheckPerformTransaction",
      42,
      { amount: 1_500_000, account: { order_id: "pay_1" } },
      "{}",
    )) as {
      result?: {
        allow?: boolean;
        detail?: {
          receipt_type: number;
          items: Array<Record<string, unknown>>;
        };
      };
    };

    expect(res.result?.allow).toBe(true);
    expect(res.result?.detail).toEqual({
      receipt_type: 0,
      items: [
        {
          title: "SafarTrip sayohat to'lovi",
          price: 1_500_000,
          count: 1,
          code: "10405001001000000",
          package_code: "1505098",
          vat_percent: 12,
        },
      ],
    });
    // CheckPerform must not be memoized — only mutating methods are.
    expect(storeProcessedResponse).not.toHaveBeenCalled();
  });

  it("rejects a wrong amount without returning detail", async () => {
    findPaymentWithTravelPlanUser.mockResolvedValue({
      id: "pay_1",
      provider: "PAYME",
      status: "PENDING",
      amount: { toString: () => "15000.00" },
      amountTiyin: 1_500_000n,
      travelPlanId: "tp_1",
      travelPlan: { id: "tp_1", userId: "u_1" },
    });

    const res = (await handleOrderIdMethod(
      "CheckPerformTransaction",
      7,
      { amount: 1, account: { order_id: "pay_1" } },
      "{}",
    )) as { error?: { code: number } };

    expect(res.error?.code).toBe(PAYME_ERRORS.WRONG_AMOUNT.code);
  });
});
