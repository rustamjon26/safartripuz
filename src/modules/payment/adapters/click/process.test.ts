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
    amountTiyin?: bigint | null;
    travelPlanId: string;
    travelPlan: { id: string; userId: string };
  };
  type TxnRow = {
    id: string;
    provider: string;
    legacyPaymentId: string;
    status: string;
    externalRef: string | null;
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

vi.mock("../../domain/provider-config", () => ({
  getPaymentProvidersConfig: async () => ({}),
  getClickConfig: () => ({
    enabled: true,
    serviceId: "222",
    merchantId: "333",
    secretKey: "test_secret",
  }),
}));

vi.mock("@/src/modules/booking", () => ({
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
      const row = {
        id: "ptx_1",
        provider: "CLICK",
        legacyPaymentId: "pay_1",
        status: "PENDING",
        externalRef: null as string | null,
      };
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
    updatePaymentTransaction: async (
      id: string,
      data: { status?: string; externalRef?: string },
    ) => {
      const row = harness.txns.get(id);
      if (row && data.status) row.status = data.status;
      if (row && data.externalRef !== undefined) row.externalRef = data.externalRef;
    },
    runTransaction: async (fn: (tx: Record<string, never>) => Promise<void>) =>
      fn({}),
  },
}));

import { POST as postComplete } from "@/app/api/payments/webhook/click/complete/route";
import { POST as postPrepare } from "@/app/api/payments/webhook/click/prepare/route";

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

function formRequest(path: string, body: Record<string, unknown>): Request {
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined || v === null) continue;
    form.set(k, String(v));
  }
  return new Request(`https://safartrip.uz${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
}

async function prepare(
  body: ClickShopBody = signedPrepare(),
): Promise<Record<string, unknown>> {
  const res = await postPrepare(
    formRequest("/api/payments/webhook/click/prepare", body),
  );
  return (await res.json()) as Record<string, unknown>;
}

async function complete(
  body: ClickShopBody = signedComplete(),
): Promise<Record<string, unknown>> {
  const res = await postComplete(
    formRequest("/api/payments/webhook/click/complete", body),
  );
  return (await res.json()) as Record<string, unknown>;
}

describe("Click Shop Prepare/Complete via live routes", () => {
  beforeEach(() => {
    seedPendingPayment();
  });

  it("Prepare: valid amount and order returns error 0 and merchant_prepare_id", async () => {
    const resp = await prepare();
    expect(resp.error).toBe(CLICK_ERRORS.SUCCESS);
    expect(resp.merchant_prepare_id).toBe("ptx_1");
    expect(harness.txns.get("ptx_1")?.status).toBe("PENDING");
  });

  it("Prepare: wrong amount returns -2", async () => {
    const resp = await prepare(signedPrepare({ amount: "1.00" }));
    expect(resp.error).toBe(CLICK_ERRORS.INCORRECT_AMOUNT);
    expect(resp.error).toBe(-2);
  });

  it("Prepare: non-existent order returns -5", async () => {
    const resp = await prepare(signedPrepare({ merchant_trans_id: "missing" }));
    expect(resp.error).toBe(CLICK_ERRORS.USER_NOT_FOUND);
    expect(resp.error).toBe(-5);
  });

  it("Prepare: tampered MD5 returns -1 and logs [click-shop]", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const body = signedPrepare();
    body.sign_string = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const resp = await prepare(body);
    expect(resp.error).toBe(CLICK_ERRORS.SIGN_FAILED);
    expect(resp.error).toBe(-1);
    const logged = spy.mock.calls.some(
      (c) => c[0] === "[click-shop]" && String(c[1]).includes('"response_error":-1'),
    );
    spy.mockRestore();
    expect(logged).toBe(true);
  });

  it("Complete: first success fulfills once; retry does not double-credit", async () => {
    const prepared = await prepare();
    expect(prepared.error).toBe(0);

    const first = await complete();
    expect(first.error).toBe(CLICK_ERRORS.SUCCESS);
    expect(first.error).toBe(0);
    expect(first.merchant_confirm_id).toBe("111");
    expect(harness.fulfill.count).toBe(1);

    const retry = await complete();
    expect(retry.error).toBe(CLICK_ERRORS.SUCCESS);
    expect(harness.fulfill.count).toBe(1);
    expect(retry.merchant_confirm_id).toBe(first.merchant_confirm_id);
  });

  it("rejects a complete that never went through prepare (-6)", async () => {
    const resp = await complete();
    expect(resp.error).toBe(CLICK_ERRORS.TRANSACTION_NOT_EXIST);
    expect(resp.error).toBe(-6);
    expect(harness.fulfill.count).toBe(0);
  });

  it("rejects a merchant_prepare_id belonging to another payment", async () => {
    await prepare();
    const ptx = harness.txns.get("ptx_1");
    if (ptx) ptx.legacyPaymentId = "pay_other";
    const resp = await complete();
    expect(resp.error).toBe(-6);
    expect(harness.fulfill.count).toBe(0);
  });

  it("rejects a prepare record stamped for a different click transaction", async () => {
    await prepare();
    const resp = await complete(signedComplete({ click_trans_id: 120 }));
    expect(resp.error).toBe(-6);
    expect(harness.fulfill.count).toBe(0);
  });

  it("answers ALREADY_PAID when a consumed prepare is replayed without cache", async () => {
    await prepare();
    await complete();
    harness.cache.clear();
    const resp = await complete();
    expect(resp.error).toBe(CLICK_ERRORS.ALREADY_PAID);
    expect(resp.error).toBe(-4);
    expect(harness.fulfill.count).toBe(1);
  });

  it("Complete without merchant_prepare_id fails the signature (-1)", async () => {
    const resp = await complete({
      click_trans_id: 111,
      service_id: 222,
      merchant_trans_id: "pay_1",
      amount: "1000.50",
      action: 1,
      sign_time: "2026-01-01 12:00:00",
      error: 0,
      error_note: "",
      sign_string: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    expect(resp.error).toBe(CLICK_ERRORS.SIGN_FAILED);
    expect(harness.fulfill.count).toBe(0);
  });

  it("lets Click cancel without a matching prepare and returns error 0", async () => {
    const resp = await complete(
      signedComplete({ error: -5, error_note: "cancelled" }),
    );
    expect(resp.error).toBe(0);
    expect(resp.error_note).toBe("Cancelled");
    expect(harness.fulfill.count).toBe(0);
    expect(harness.payments.get("pay_1")?.status).toBe("FAILED");
  });

  it("Prepare→Complete logs two [click-shop] lines with response_error 0", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    expect((await prepare()).error).toBe(0);
    expect((await complete()).error).toBe(0);
    const zeroLogs = spy.mock.calls.filter(
      (c) => c[0] === "[click-shop]" && String(c[1]).includes('"response_error":0'),
    );
    spy.mockRestore();
    expect(zeroLogs.length).toBeGreaterThanOrEqual(2);
  });
});
