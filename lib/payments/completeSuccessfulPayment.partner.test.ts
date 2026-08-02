import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { Money } from "@/src/shared/money";
import { createPartnerEarningIfMissing } from "./completeSuccessfulPaymentTx";
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
    expect(data?.grossAmount).toBe(Money.fromTiyin(grossTiyin).toSomNumber());
    // 10% of 1_000_000 tiyin = 100_000 tiyin fee → 1000 som; net 9000 som
    expect(data?.commissionFee).toBe(Money.fromTiyin(100_000n).toSomNumber());
    expect(data?.netAmount).toBe(Money.fromTiyin(900_000n).toSomNumber());
    expect(Number(data?.netAmount)).toBeLessThan(Number(data?.grossAmount));
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
      join(process.cwd(), "lib/payments/completeSuccessfulPaymentTx.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/partnerUserId:\s*null/);
    expect(src).toContain("throw new MissingPartnerError");
  });
});
