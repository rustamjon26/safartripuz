import { describe, expect, it } from "vitest";
import { nextBackoffMs } from "./domain/types";

describe("outbox backoff", () => {
  it("grows as 2^attempts * 5s capped at 1h (base without requiring jitter)", () => {
    // nextBackoffMs includes jitter 0–999; assert bounds
    const b0 = nextBackoffMs(0);
    expect(b0).toBeGreaterThanOrEqual(5_000);
    expect(b0).toBeLessThan(6_000);
    const b20 = nextBackoffMs(20);
    expect(b20).toBeGreaterThanOrEqual(3_600_000);
    expect(b20).toBeLessThan(3_601_000);
  });
});

describe("outbox atomic enqueue (simulated tx)", () => {
  it("rollback leaves zero events; commit leaves one PENDING", () => {
    const store: Array<{ status: string }> = [];
    type TxBag = { ops: Array<() => void> };
    function enqueueInTx(txBag: TxBag, event: { eventType: string }) {
      txBag.ops.push(() => store.push({ ...event, status: "PENDING" }));
    }
    function commit(txBag: TxBag) {
      for (const op of txBag.ops) op();
    }
    const aborted: TxBag = { ops: [] };
    enqueueInTx(aborted, { eventType: "push.test" });
    expect(store).toHaveLength(0);

    const okTx: TxBag = { ops: [] };
    enqueueInTx(okTx, { eventType: "push.test" });
    commit(okTx);
    expect(store).toHaveLength(1);
    expect(store[0]!.status).toBe("PENDING");
  });
});

describe("idempotent consumer (processed key)", () => {
  it("second dispatch with same dedupe key skips side effect", async () => {
    const keys = new Set<string>();
    let sends = 0;
    async function withProcessedKey(
      consumer: string,
      key: string,
      sideEffect: () => Promise<void>,
    ) {
      const full = `${consumer}:${key}`;
      if (keys.has(full)) return "skipped";
      await sideEffect();
      keys.add(full);
      return "sent";
    }
    const dedupeKey = "push.driver_new_order:order1:driver1";
    expect(
      await withProcessedKey("push", dedupeKey, async () => {
        sends += 1;
      }),
    ).toBe("sent");
    expect(
      await withProcessedKey("push", dedupeKey, async () => {
        sends += 1;
      }),
    ).toBe("skipped");
    expect(sends).toBe(1);
  });
});
