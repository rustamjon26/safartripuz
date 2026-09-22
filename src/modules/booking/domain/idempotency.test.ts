import { describe, expect, it } from "vitest";
import { decideIdempotency, readIdempotencyKey } from "./idempotency";

describe("booking idempotency key", () => {
  it("accepts a client key and rejects junk", () => {
    expect(readIdempotencyKey("booking-key-1")).toBe("booking-key-1");
    expect(readIdempotencyKey("short")).toBeNull();
    expect(readIdempotencyKey("has space!!")).toBeNull();
    expect(readIdempotencyKey(null)).toBeNull();
  });

  it("replays a finished claim and holds an in-flight one", () => {
    const now = Date.parse("2026-09-22T10:00:00.000Z");
    expect(decideIdempotency(null, now)).toEqual({ kind: "fresh" });
    expect(
      decideIdempotency(
        {
          statusCode: 201,
          responseJson: { success: true },
          createdAt: new Date(now - 5_000),
        },
        now,
      ),
    ).toEqual({ kind: "replay", statusCode: 201, body: { success: true } });
    expect(
      decideIdempotency(
        { statusCode: null, responseJson: null, createdAt: new Date(now - 5_000) },
        now,
      ).kind,
    ).toBe("busy");
    expect(
      decideIdempotency(
        { statusCode: null, responseJson: null, createdAt: new Date(now - 120_000) },
        now,
      ).kind,
    ).toBe("reclaim");
  });
});
