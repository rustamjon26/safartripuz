import { beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "TestSecretKeyForCacheSpecs";
const CREDENTIAL = Buffer.from(`Paycom:${KEY}`).toString("base64");

const processedEvents = vi.hoisted(() => new Map<string, unknown>());
const performCalls = vi.hoisted(() => ({ count: 0 }));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

vi.mock("../../service/payment.service", () => ({
  paymentService: {
    logInbound: vi.fn(async () => {}),
    getCachedResponse: vi.fn(
      async (_provider: string, providerEventId: string) =>
        processedEvents.get(providerEventId) ?? null,
    ),
    storeProcessedResponse: vi.fn(
      async (input: { providerEventId: string; response: unknown }) => {
        processedEvents.set(input.providerEventId, input.response);
      },
    ),
    createIntent: vi.fn(async () => ({})),
  },
}));

vi.mock("@/app/api/payme/methods/performTransaction", () => ({
  /** Fails once the way a DB timeout would, then succeeds on Payme's retry. */
  performTransaction: vi.fn(async (id: number) => {
    performCalls.count += 1;
    if (performCalls.count === 1) {
      return {
        jsonrpc: "2.0" as const,
        id,
        error: { code: -32400, message: { ru: "", uz: "", en: "Internal" } },
      };
    }
    return {
      jsonrpc: "2.0" as const,
      id,
      result: { perform_time: 1_700_000_000_000, transaction: "pt_1", state: 2 },
    };
  }),
}));

import { paymeHttpHandler } from "./httpHandler";

const RPC_BODY = {
  id: 42,
  method: "PerformTransaction",
  params: { id: "payme_tx_1" },
};

function makeRequest() {
  return new Request("https://safartrip.uz/api/payme", {
    method: "POST",
    headers: {
      authorization: `Basic ${CREDENTIAL}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(RPC_BODY),
  });
}

async function callHandler() {
  const res = await paymeHttpHandler(makeRequest(), {
    accountMode: "booking_id",
    path: "/api/payme",
  });
  return (await res.json()) as {
    result?: { state?: number };
    error?: { code?: number };
  };
}

describe("paymeHttpHandler booking_id response caching", () => {
  beforeEach(() => {
    processedEvents.clear();
    performCalls.count = 0;
    process.env.PAYME_SECRET_KEY = KEY;
    delete process.env.PAYME_IS_TEST;
  });

  it("does not memoize a transient error, so the retry can still succeed", async () => {
    const first = await callHandler();
    expect(first.error?.code).toBe(-32400);
    // The whole bug: caching this would pin the failure forever.
    expect(processedEvents.size).toBe(0);

    const retry = await callHandler();
    expect(retry.error).toBeUndefined();
    expect(retry.result?.state).toBe(2);
    expect(performCalls.count).toBe(2);
  });

  it("memoizes the success and serves later retries from it", async () => {
    await callHandler(); // transient error
    await callHandler(); // success, cached
    expect(processedEvents.size).toBe(1);
    expect([...processedEvents.keys()][0]).toBe(
      "payme:booking:PerformTransaction:payme_tx_1",
    );

    const replay = await callHandler();
    expect(replay.result?.state).toBe(2);
    // Handler was not re-entered — the cached envelope answered it.
    expect(performCalls.count).toBe(2);
  });

  it("rejects a bad credential before reaching any handler", async () => {
    const res = await paymeHttpHandler(
      new Request("https://safartrip.uz/api/payme", {
        method: "POST",
        headers: { authorization: "Basic d3Jvbmc=" },
        body: JSON.stringify(RPC_BODY),
      }),
      { accountMode: "booking_id", path: "/api/payme" },
    );
    const body = (await res.json()) as { error?: { code?: number } };
    expect(body.error?.code).toBe(-32504);
    expect(performCalls.count).toBe(0);
  });

  it("accepts a lowercase scheme the way RFC 7235 requires", async () => {
    const res = await paymeHttpHandler(
      new Request("https://safartrip.uz/api/payme", {
        method: "POST",
        headers: { authorization: `basic ${CREDENTIAL}` },
        body: JSON.stringify(RPC_BODY),
      }),
      { accountMode: "booking_id", path: "/api/payme" },
    );
    const body = (await res.json()) as { error?: { code?: number } };
    expect(body.error?.code).not.toBe(-32504);
    expect(performCalls.count).toBe(1);
  });
});
