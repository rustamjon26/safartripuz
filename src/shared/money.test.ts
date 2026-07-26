import { describe, expect, it } from "vitest";
import { Money, MoneyError } from "./money";

describe("Money tiyin round-trip", () => {
  it("som number → tiyin → som exact for 2-decimal amounts", () => {
    const m = Money.fromSomNumber(1234.56);
    expect(m.toTiyin()).toBe(123456n);
    expect(m.toSomNumber()).toBe(1234.56);
  });

  it("string som preserves tiyin", () => {
    expect(Money.fromSomNumber("10.05").toTiyin()).toBe(1005n);
  });

  it("equals compares tiyin", () => {
    expect(Money.fromTiyin(100n).equals(Money.fromSomNumber(1))).toBe(true);
  });

  it("rejects negative", () => {
    expect(() => Money.fromTiyin(-1n)).toThrow(MoneyError);
  });
});
