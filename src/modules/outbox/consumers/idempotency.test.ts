import { beforeEach, describe, expect, it, vi } from "vitest";

const tryMarkProcessed = vi.hoisted(() => vi.fn());
const releaseProcessedKey = vi.hoisted(() => vi.fn());

vi.mock("../repository/outbox.repository", () => ({
  outboxRepository: { tryMarkProcessed, releaseProcessedKey },
}));

import { withProcessedKey } from "./idempotency";

beforeEach(() => {
  tryMarkProcessed.mockReset();
  releaseProcessedKey.mockReset();
});

describe("withProcessedKey — atomic claim-first", () => {
  it("runs the side effect once the claim is won", async () => {
    tryMarkProcessed.mockResolvedValue(true);
    const effect = vi.fn(async () => {});
    await expect(withProcessedKey("push", "k1", effect)).resolves.toBe("sent");
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it("skips WITHOUT running the effect when the claim is lost (concurrent duplicate)", async () => {
    tryMarkProcessed.mockResolvedValue(false);
    const effect = vi.fn(async () => {});
    await expect(withProcessedKey("push", "k1", effect)).resolves.toBe(
      "skipped",
    );
    expect(effect).not.toHaveBeenCalled();
  });

  it("releases the claim and rethrows when the effect fails (retry-safe)", async () => {
    tryMarkProcessed.mockResolvedValue(true);
    const effect = vi.fn(async () => {
      throw new Error("push failed");
    });
    await expect(withProcessedKey("push", "k1", effect)).rejects.toThrow(
      "push failed",
    );
    expect(releaseProcessedKey).toHaveBeenCalledWith("push", "k1");
  });
});
