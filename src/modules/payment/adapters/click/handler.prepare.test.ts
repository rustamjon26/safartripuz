import { beforeEach, describe, expect, it, vi } from "vitest";

const PAYMENT_ID = "pay_1";
const CLICK_TRANS_ID = 555;
const PREPARE_ID = "ptx_1";

type Ptx = {
  id: string;
  provider: string;
  status: string;
  legacyPaymentId: string | null;
  externalRef: string | null;
};

const state = vi.hoisted(() => ({
  paymentStatus: "PENDING",
  ptx: null as Ptx | null,
  processed: new Map<string, Record<string, unknown>>(),
  completed: 0,
}));

vi.mock("./sign", () => ({
  verifyClickSignature: () => true,
}));

vi.mock("@/lib/payments/providerConfig", () => ({
  getPaymentProvidersConfig: async () => ({}),
  getClickConfig: () => ({
    enabled: true,
    serviceId: "77",
    secretKey: "secret",
  }),
}));

vi.mock("@/src/shared/observability/sentry", () => ({
  setMoneyPathContext: vi.fn(),
}));

vi.mock("@/lib/payments/completeSuccessfulPaymentTx", () => ({
  completeSuccessfulPaymentInTx: vi.fn(async () => {
    state.completed += 1;
    state.paymentStatus = "SUCCESS";
  }),
}));

vi.mock("../../service/payment.service", () => ({
  paymentService: {
    logInbound: vi.fn(async () => {}),
    getCachedResponse: vi.fn(
      async (_p: string, id: string) => state.processed.get(id) ?? null,
    ),
    storeProcessedResponse: vi.fn(
      async (input: {
        providerEventId: string;
        response: Record<string, unknown>;
      }) => {
        state.processed.set(input.providerEventId, input.response);
      },
    ),
    createIntent: vi.fn(async () => {
      state.ptx = {
        id: PREPARE_ID,
        provider: "CLICK",
        status: "PENDING",
        legacyPaymentId: PAYMENT_ID,
        externalRef: String(CLICK_TRANS_ID),
      };
      return state.ptx;
    }),
  },
}));

vi.mock("../../repository/payment.repository", () => ({
  paymentRepository: {
    findPaymentWithTravelPlanUser: vi.fn(async (id: string) =>
      id === PAYMENT_ID
        ? {
            id: PAYMENT_ID,
            provider: "CLICK",
            status: state.paymentStatus,
            amount: { toString: () => "1000.00" },
            amountTiyin: 100_000n,
            travelPlanId: "tp_1",
            travelPlan: { id: "tp_1", userId: "u_1" },
          }
        : null,
    ),
    findPaymentTransactionById: vi.fn(async (id: string) =>
      state.ptx && state.ptx.id === id ? state.ptx : null,
    ),
    updatePaymentFields: vi.fn(async () => ({})),
    updatePaymentTransaction: vi.fn(
      async (_id: string, data: Record<string, unknown>) => {
        if (state.ptx) {
          state.ptx = { ...state.ptx, ...(data as Partial<Ptx>) };
        }
        return state.ptx;
      },
    ),
    runTransaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    ),
  },
}));

import { clickHttpHandler } from "./handler";

function request(fields: Record<string, string | number | undefined>) {
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) form.set(k, String(v));
  }
  return new Request("https://safartrip.uz/api/payments/webhook/click", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
}

const BASE = {
  click_trans_id: CLICK_TRANS_ID,
  service_id: 77,
  merchant_trans_id: PAYMENT_ID,
  amount: 1000,
  error: 0,
  error_note: "",
  sign_time: "2026-08-05 20:00:00",
  sign_string: "x",
};

async function call(
  fields: Record<string, string | number | undefined>,
): Promise<Record<string, unknown>> {
  const res = await clickHttpHandler(request(fields));
  return (await res.json()) as Record<string, unknown>;
}

const prepare = () => call({ ...BASE, action: 0 });
const complete = (over: Record<string, string | number | undefined> = {}) =>
  call({
    ...BASE,
    action: 1,
    merchant_prepare_id: PREPARE_ID,
    ...over,
  });

describe("Click complete requires a real prepare record", () => {
  beforeEach(() => {
    state.paymentStatus = "PENDING";
    state.ptx = null;
    state.processed.clear();
    state.completed = 0;
  });

  it("rejects a complete that never went through prepare", async () => {
    const body = await complete();

    // -6 "Transaction does not exist"
    expect(body.error).toBe(-6);
    expect(state.completed).toBe(0);
    expect(state.paymentStatus).toBe("PENDING");
  });

  it("rejects a complete with no merchant_prepare_id at all", async () => {
    await prepare();

    const body = await complete({
      merchant_prepare_id: undefined,
      click_trans_id: CLICK_TRANS_ID + 1,
    });

    expect(body.error).toBe(-6);
    expect(state.completed).toBe(0);
  });

  it("rejects a merchant_prepare_id belonging to another payment", async () => {
    await prepare();
    state.ptx = { ...(state.ptx as Ptx), legacyPaymentId: "pay_other" };

    const body = await complete();

    expect(body.error).toBe(-6);
    expect(state.completed).toBe(0);
  });

  it("rejects a prepare record stamped for a different click transaction", async () => {
    await prepare();

    const body = await complete({ click_trans_id: CLICK_TRANS_ID + 9 });

    expect(body.error).toBe(-6);
    expect(state.completed).toBe(0);
  });

  it("completes once after a valid prepare", async () => {
    const prepared = await prepare();
    expect(prepared.error).toBe(0);
    expect(prepared.merchant_prepare_id).toBe(PREPARE_ID);

    const body = await complete();

    expect(body.error).toBe(0);
    expect(body.merchant_confirm_id).toBe(CLICK_TRANS_ID);
    expect(state.completed).toBe(1);
    expect(state.ptx?.status).toBe("SUCCESS");
  });

  it("is idempotent: the same complete replays the stored response", async () => {
    await prepare();
    const first = await complete();
    const second = await complete();

    expect(first).toEqual(second);
    expect(state.completed).toBe(1);
  });

  it("answers ALREADY_PAID when a consumed prepare is replayed fresh", async () => {
    await prepare();
    await complete();
    // Same click transaction, but the cached response is gone (e.g. purged).
    state.processed.clear();

    const body = await complete();

    // -4 "Already paid" — the only error Click allows after a good Complete.
    expect(body.error).toBe(-4);
    expect(state.completed).toBe(1);
  });

  it("still lets Click cancel a payment without a prepare lookup", async () => {
    const body = await complete({
      error: -5,
      error_note: "cancelled",
      merchant_prepare_id: undefined,
    });

    expect(body.error).toBe(0);
    expect(state.completed).toBe(0);
  });
});
