import { describe, expect, it } from "vitest";
import { computeInvoiceTotals } from "./money-calc";

describe("computeInvoiceTotals", () => {
  it("computes tiyin subtotal/vat/total with 8% VAT", () => {
    const t = computeInvoiceTotals(
      [{ name: "Room", quantity: 2, unitPriceSom: 1_000_000 }],
      800,
    );
    expect(t.subtotalTiyin).toBe(200_000_000n); // 2 * 1e6 som → tiyin
    expect(t.vatTiyin).toBe(16_000_000n); // 8%
    expect(t.totalTiyin).toBe(216_000_000n);
  });

  it("rejects bad quantity", () => {
    expect(() =>
      computeInvoiceTotals(
        [{ name: "X", quantity: 0, unitPriceSom: 100 }],
        800,
      ),
    ).toThrow(/quantity/);
  });
});
