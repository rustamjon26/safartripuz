import { describe, expect, it } from "vitest";
import { enumerateNights } from "./nights";

describe("enumerateNights", () => {
  it("returns half-open nights", () => {
    const nights = enumerateNights(
      new Date("2026-08-01T00:00:00.000Z"),
      new Date("2026-08-04T00:00:00.000Z"),
    );
    expect(nights).toHaveLength(3);
    expect(nights[0]!.toISOString().slice(0, 10)).toBe("2026-08-01");
    expect(nights[2]!.toISOString().slice(0, 10)).toBe("2026-08-03");
  });
});
