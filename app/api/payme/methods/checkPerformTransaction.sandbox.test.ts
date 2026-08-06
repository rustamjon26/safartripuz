import { beforeEach, describe, expect, it, vi } from "vitest";

const findBookingById = vi.hoisted(() =>
  vi.fn<(id: string | undefined) => Promise<unknown>>(),
);

vi.mock("../utils/helpers", async () => {
  const actual = await vi.importActual<typeof import("../utils/helpers")>(
    "../utils/helpers",
  );
  return {
    ...actual,
    findBookingById: (id: string | undefined) => findBookingById(id),
  };
});

import { checkPerformTransaction } from "./checkPerformTransaction";
import { PAYME_ERRORS } from "../utils/errors";

describe("CheckPerformTransaction sandbox account errors", () => {
  beforeEach(() => {
    findBookingById.mockReset();
  });

  it("unknown booking_id → -31050 INVALID_ACCOUNT (sandbox range -31099..-31050)", async () => {
    findBookingById.mockResolvedValue(null);

    const res = (await checkPerformTransaction(40269, {
      amount: 289525,
      account: { booking_id: "42141412412412341321" },
    })) as { id: number; error?: { code: number; data?: string } };

    expect(res.id).toBe(40269);
    expect(res.error?.code).toBe(PAYME_ERRORS.INVALID_ACCOUNT.code);
    expect(res.error?.code).toBe(-31050);
    expect(res.error?.code).toBeGreaterThanOrEqual(-31099);
    expect(res.error?.code).toBeLessThanOrEqual(-31050);
    expect(res.error?.data).toBe("booking_id");
    // Must NOT be the wrong-amount code the sandbox rejected earlier.
    expect(res.error?.code).not.toBe(-31001);
    expect(res.error?.code).not.toBe(-31003);
  });

  it("empty account → -31050 INVALID_ACCOUNT", async () => {
    findBookingById.mockResolvedValue(null);

    const res = (await checkPerformTransaction(1, {
      amount: 50000,
      account: {},
    })) as { error?: { code: number } };

    expect(res.error?.code).toBe(-31050);
  });
});
