import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { createPartnerEarningIfMissing } from "./payment-confirmation.service";
import { MissingPartnerError } from "@/src/modules/ledger";

describe("createPartnerEarningIfMissing (payment completion split)", () => {
  it("writes partner net from tiyin commission (not 100% platform)", async () => {
    const create = vi.fn(
      async (_args: { data: Record<string, unknown> }) => ({ id: "pe1" }),
    );
    const findUnique = vi.fn(async () => null);
    const tx = {
      partnerEarning: { findUnique, create },
    } as unknown as Prisma.TransactionClient;

    const grossTiyin = 1_000_000n; // 10_000 som
    await createPartnerEarningIfMissing(tx, {
      partnerId: "partner_user_1",
      bookingType: "HOTEL",
      bookingId: "hb_1",
      grossTiyin,
      rate: 10,
    });

    expect(create).toHaveBeenCalledTimes(1);
    const data = create.mock.calls[0]?.[0]?.data;
    expect(data).toBeDefined();
    expect(data?.partnerId).toBe("partner_user_1");
    expect(data?.commissionRate).toBe(10);
    // Tiyin BigInt straight through — no som round-trip on the way to the DB.
    expect(data?.grossTiyin).toBe(grossTiyin);
    expect(data?.commissionFeeTiyin).toBe(100_000n);
    expect(data?.netTiyin).toBe(900_000n);
    expect(
      (data?.commissionFeeTiyin as bigint) + (data?.netTiyin as bigint),
    ).toBe(grossTiyin);
  });

  it("keeps odd tiyin amounts exact (no rounding to som)", async () => {
    const create = vi.fn(
      async (_args: { data: Record<string, unknown> }) => ({ id: "pe2" }),
    );
    const tx = {
      partnerEarning: { findUnique: vi.fn(async () => null), create },
    } as unknown as Prisma.TransactionClient;

    // 333 tiyin is 3.33 som; a float som round-trip is where drift creeps in.
    await createPartnerEarningIfMissing(tx, {
      partnerId: "p1",
      bookingType: "HOMESTAY",
      bookingId: "hs1",
      grossTiyin: 333n,
      rate: 10,
    });

    const data = create.mock.calls[0]?.[0]?.data;
    expect(data?.grossTiyin).toBe(333n);
    expect(data?.commissionFeeTiyin).toBe(33n);
    expect(data?.netTiyin).toBe(300n);
  });

  it("is idempotent when earning already exists", async () => {
    const create = vi.fn();
    const tx = {
      partnerEarning: {
        findUnique: vi.fn(async () => ({ id: "existing" })),
        create,
      },
    } as unknown as Prisma.TransactionClient;

    await createPartnerEarningIfMissing(tx, {
      partnerId: "p1",
      bookingType: "GUIDE",
      bookingId: "g1",
      grossTiyin: 100n,
      rate: 15,
    });
    expect(create).not.toHaveBeenCalled();
  });
});

describe("payment success rejects silent null partner", () => {
  it("MissingPartnerError is the typed failure for unresolved partner", () => {
    const err = new MissingPartnerError("Hotel partner missing for booking x");
    expect(err).toBeInstanceOf(MissingPartnerError);
    expect(err.message).toMatch(/partner/i);
  });

  it("completeSuccessfulPayment source never assigns partnerUserId: null", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(
      join(
        process.cwd(),
        "src/modules/booking/service/payment-confirmation.service.ts",
      ),
      "utf8",
    );
    expect(src).not.toMatch(/partnerUserId:\s*null/);
    expect(src).toContain("throw new MissingPartnerError");
  });
});
