/**
 * The geocode proxy was unauthenticated and unlimited, so anyone could drive
 * our server's outbound traffic to Nominatim — which bans sources that exceed
 * its usage policy, taking location search down for everyone.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const calls = vi.hoisted(() => ({ keys: [] as string[], allow: true }));
const upstream = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: async (key: string) => {
    calls.keys.push(key);
    return calls.allow;
  },
}));

import { GET } from "./route";

function searchRequest(q: string, ip = "1.2.3.4"): NextRequest {
  // The route reads `req.nextUrl`, so it needs a real NextRequest.
  return new NextRequest(
    `https://safartrip.uz/api/geocode/search?q=${encodeURIComponent(q)}`,
    { headers: { "x-forwarded-for": ip } },
  );
}

beforeEach(() => {
  calls.keys = [];
  calls.allow = true;
  upstream.mockReset();
  vi.stubGlobal("fetch", upstream);
});

describe("geocode proxy rate limit", () => {
  it("returns 429 once the window is exhausted, without calling Nominatim", async () => {
    calls.allow = false;

    const res = await GET(searchRequest("Zomin"));
    const body = (await res.json()) as { message?: string };

    expect(res.status).toBe(429);
    expect(body.message).toMatch(/Juda ko'p qidiruv/);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("buckets per client IP", async () => {
    upstream.mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    await GET(searchRequest("Zomin", "1.1.1.1"));
    await GET(searchRequest("Zomin", "2.2.2.2"));

    expect(calls.keys).toEqual(["geocode:1.1.1.1", "geocode:2.2.2.2"]);
  });

  it("does not spend budget on a query too short to forward", async () => {
    const res = await GET(searchRequest("Z"));

    expect(res.status).toBe(200);
    expect(calls.keys).toEqual([]);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("passes a normal search through", async () => {
    upstream.mockResolvedValue(
      new Response(
        JSON.stringify([
          { lat: "39.6", lon: "68.4", display_name: "Zomin, Jizzax" },
        ]),
        { status: 200 },
      ),
    );

    const res = await GET(searchRequest("Zomin"));
    const body = (await res.json()) as { results?: unknown[] };

    expect(res.status).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(upstream).toHaveBeenCalledTimes(1);
  });
});
