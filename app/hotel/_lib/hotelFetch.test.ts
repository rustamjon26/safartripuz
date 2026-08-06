import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hotelFetch, resetRefreshStateForTests } from "./hotelFetch";

type Call = { url: string; init?: RequestInit };

function response(status: number): Response {
  return new Response(status === 204 ? null : JSON.stringify({ status }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("hotelFetch", () => {
  let calls: Call[] = [];

  beforeEach(() => {
    calls = [];
    resetRefreshStateForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** `statuses` maps a URL to the sequence of statuses it answers with. */
  function stubFetch(statuses: Record<string, number[]>) {
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      const queue = statuses[url];
      const status = queue?.length ? (queue.shift() as number) : 200;
      return Promise.resolve(response(status));
    });
  }

  it("passes a successful response straight through", async () => {
    stubFetch({ "/api/hotel/me": [200] });
    const res = await hotelFetch("/api/hotel/me");
    expect(res.status).toBe(200);
    expect(calls.map((c) => c.url)).toEqual(["/api/hotel/me"]);
  });

  it("refreshes once and retries when the access token has expired", async () => {
    stubFetch({
      "/api/hotel/me": [401, 200],
      "/api/auth/refresh": [200],
    });

    const res = await hotelFetch("/api/hotel/me");

    expect(res.status).toBe(200);
    expect(calls.map((c) => c.url)).toEqual([
      "/api/hotel/me",
      "/api/auth/refresh",
      "/api/hotel/me",
    ]);
  });

  it("returns the original 401 when the refresh token is gone too", async () => {
    stubFetch({
      "/api/hotel/me": [401],
      "/api/auth/refresh": [401],
    });

    const res = await hotelFetch("/api/hotel/me");

    expect(res.status).toBe(401);
    // No third call: one refresh attempt, then give the caller the 401.
    expect(calls.map((c) => c.url)).toEqual([
      "/api/hotel/me",
      "/api/auth/refresh",
    ]);
  });

  it("does not retry a 403 — that is authorization, not expiry", async () => {
    stubFetch({ "/api/hotel/me": [403] });
    const res = await hotelFetch("/api/hotel/me");
    expect(res.status).toBe(403);
    expect(calls).toHaveLength(1);
  });

  it("refreshes only once for requests that expire in parallel", async () => {
    // The refresh route rotates and revokes: a second refresh with the old
    // token answers 401 and clears both cookies, logging the user out.
    stubFetch({
      "/api/hotel/me": [401, 200],
      "/api/hotel/rooms": [401, 200],
      "/api/auth/refresh": [200, 401],
    });

    const [a, b] = await Promise.all([
      hotelFetch("/api/hotel/me"),
      hotelFetch("/api/hotel/rooms"),
    ]);

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(calls.filter((c) => c.url === "/api/auth/refresh")).toHaveLength(1);
  });

  it("keeps the original response when the network drops during refresh", async () => {
    vi.stubGlobal("fetch", (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push({ url });
      if (url === "/api/auth/refresh") {
        return Promise.reject(new TypeError("Failed to fetch"));
      }
      return Promise.resolve(response(401));
    });

    const res = await hotelFetch("/api/hotel/me");
    expect(res.status).toBe(401);
  });

  it("sends cookies and preserves the caller's method and body", async () => {
    stubFetch({ "/api/hotel/promos": [201] });

    await hotelFetch("/api/hotel/promos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Kuzgi" }),
    });

    expect(calls[0].init?.credentials).toBe("include");
    expect(calls[0].init?.method).toBe("POST");
    expect(calls[0].init?.body).toBe(JSON.stringify({ title: "Kuzgi" }));
  });

  it("allows a later request to refresh again after an earlier failure", async () => {
    stubFetch({
      "/api/hotel/me": [401, 401, 200],
      "/api/auth/refresh": [401, 200],
    });

    expect((await hotelFetch("/api/hotel/me")).status).toBe(401);
    expect((await hotelFetch("/api/hotel/me")).status).toBe(200);
    expect(calls.filter((c) => c.url === "/api/auth/refresh")).toHaveLength(2);
  });
});
