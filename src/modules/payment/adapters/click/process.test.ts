import { beforeEach, describe, expect, it, vi } from "vitest";
import { CLICK_ERRORS } from "../../domain/errors";
import { buildClickSignString, md5Hex } from "./sign";
import type { ClickShopBody } from "./schema";

const SECRET = "test_secret";

const { harness } = vi.hoisted(() => {
  type PaymentRow = {
    id: string;
    provider: string;
    status: string;
    amount: string;
    travelPlanId: string;
    travelPlan: { id: string; userId: string };
  };
  type TxnRow = {
    id: string;
    legacyPaymentId: string;
    status: string;
  };

  const payments = new Map<string, PaymentRow>();
  const txns = new Map<string, TxnRow>();
  const cache = new Map<string, Record<string, unknown>>();
  const fulfill = { count: 0 };

  return { harness: { payments, txns, cache, fulfill } };
});

vi.mock("@/src/shared/observability/sentry", () => ({
  setMoneyPathContext: () => undefined,
}));

vi.mock("@/lib/payments/providerConfig", () => ({
  getPaymentProvidersConfig: async () => ({}),
  getClickConfig: () => ({
    enabled: true,
    serviceId: "222",
    merchantId: "333",
    secretKey: "test_secret",
  }),
}));

vi.mock("@/lib/payments/completeSuccessfulPaymentTx", () => ({
  completeSuccessfulPaymentInTx: async () => {
    harness.fulfill.count += 1;
    const row = harness.payments.get("pay_1");
    if (row) row.status = "SUCCESS";
  },
}));

vi.mock("../../service/payment.service", () => ({
  paymentService: {
    logInbound: async () => undefined,
    getCachedResponse: async (_provider: string, id: string) =>
      harness.cache.get(id) ?? null,
    storeProcessedResponse: async (input: {
      providerEventId: string;
      response: Record<string, unknown>;
    }) => {
      harness.cache.set(input.providerEventId, input.response);
    },
    createIntent: async () => {
      const row = { id: "ptx_1", legacyPaymentId: "pay_1", status: "PENDING" };
      harness.txns.set(row.id, row);
      return row;
    },
  },
}));

vi.mock("../../repository/payment.repository", () => ({
  paymentRepository: {
    findPaymentWithTravelPlanUser: async (id: string) =>
      harness.payments.get(id) ?? null,
    findPaymentTransactionById: async (id: string) =>
      harness.txns.get(id) ?? null,
    updatePaymentFields: async (id: string, data: { status?: string }) => {
      const row = harness.payments.get(id);
      if (row && data.status) row.status = data.status;
    },
    updatePaymentTransaction: async (id: string, data: { status?: string }) => {
      const row = harness.txns.get(id);
      if (row && data.status) row.status = data.status;
    },
    runTransaction: async (fn: (tx: Record<string, never>) => Promise<void>) =>
      fn({}),
  },
}));

function seedPendingPayment() {
  harness.payments.clear();
  harness.txns.clear();
  harness.cache.clear();
  harness.fulfill.count = 0;
  harness.payments.set("pay_1", {
    id: "pay_1",
    provider: "CLICK",
    status: "PENDING",
    amount: "1000.50",
    travelPlanId: "plan_1",
    travelPlan: { id: "plan_1", userId: "user_1" },
  });
}

function signedPrepare(overrides: Partial<ClickShopBody> = {}): ClickShopBody {
  const body = {
    click_trans_id: 111,
    service_id: 222,
    merchant_trans_id: "pay_1",
    amount: "1000.50",
    action: 0,
    sign_time: "2026-01-01 12:00:00",
    error: 0,
    error_note: "",
    sign_string: "",
    ...overrides,
  };
  return {
    ...body,
    sign_string: md5Hex(buildClickSignString(body, SECRET, "prepare")),
  };
}

function signedComplete(overrides: Partial<ClickShopBody> = {}): ClickShopBody {
  const body = {
    click_trans_id: 111,
    service_id: 222,
    merchant_trans_id: "pay_1",
    merchant_prepare_id: "ptx_1",
    amount: "1000.50",
    action: 1,
    sign_time: "2026-01-01 12:00:00",
    error: 0,
    error_note: "",
    sign_string: "",
    ...overrides,
  };
  return {
    ...body,
    sign_string: md5Hex(buildClickSignString(body, SECRET, "complete")),
  };
}

describe("Click Shop Prepare/Complete", () => {
  beforeEach(() => {
    seedPendingPayment();
  });

  it("Prepare: valid amount and order returns error 0 and merchant_prepare_id", async () => {
    const { processClickShop } = await import("./process");
    const resp = await processClickShop({
      body: signedPrepare(),
      rawBody: "{}",
      path: "/api/payments/webhook/click/prepare",
    });
    expect(resp.error).toBe(CLICK_ERRORS.SUCCESS);
    expect(resp.merchant_prepare_id).toBe("ptx_1");
    expect(harness.txns.get("ptx_1")?.status).toBe("PENDING");
  });

  it("Prepare: wrong amount returns -2", async () => {
    const { processClickShop } = await import("./process");
    const resp = await processClickShop({
      body: signedPrepare({ amount: "1.00" }),
      rawBody: "{}",
      path: "/api/payments/webhook/click/prepare",
    });
    expect(resp.error).toBe(CLICK_ERRORS.INCORRECT_AMOUNT);
    expect(resp.error).toBe(-2);
  });

  it("Prepare: non-existent order returns -5", async () => {
    const { processClickShop } = await import("./process");
    const resp = await processClickShop({
      body: signedPrepare({ merchant_trans_id: "missing" }),
      rawBody: "{}",
      path: "/api/payments/webhook/click/prepare",
    });
    expect(resp.error).toBe(CLICK_ERRORS.USER_NOT_FOUND);
    expect(resp.error).toBe(-5);
  });

  it("Prepare: tampered MD5 returns -1", async () => {
    const { processClickShop } = await import("./process");
    const body = signedPrepare();
    body.sign_string = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const resp = await processClickShop({
      body,
      rawBody: "{}",
      path: "/api/payments/webhook/click/prepare",
    });
    expect(resp.error).toBe(CLICK_ERRORS.SIGN_FAILED);
    expect(resp.error).toBe(-1);
  });

  it("Complete: first success fulfills once; retry does not double-credit", async () => {
    const { processClickShop } = await import("./process");

    const prepare = await processClickShop({
      body: signedPrepare(),
      rawBody: "{}",
      path: "/api/payments/webhook/click/prepare",
    });
    expect(prepare.error).toBe(0);

    const first = await processClickShop({
      body: signedComplete(),
      rawBody: "{}",
      path: "/api/payments/webhook/click/complete",
    });
    expect(first.error).toBe(CLICK_ERRORS.SUCCESS);
    expect(first.error).toBe(0);
    expect(harness.fulfill.count).toBe(1);

    const retry = await processClickShop({
      body: signedComplete(),
      rawBody: "{}",
      path: "/api/payments/webhook/click/complete",
    });
    expect(retry.error).toBe(CLICK_ERRORS.SUCCESS);
    expect(harness.fulfill.count).toBe(1);
    expect(retry.merchant_confirm_id).toBe(first.merchant_confirm_id);
  });
});
