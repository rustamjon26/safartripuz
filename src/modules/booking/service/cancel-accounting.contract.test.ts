import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("hotel staff cancel routes through cancelWithPolicy", () => {
  it("status route uses cancelWithPolicy for CANCELLED/REFUNDED", () => {
    const src = readFileSync(
      join(
        process.cwd(),
        "app/api/hotel/bookings/[id]/status/route.ts",
      ),
      "utf8",
    );
    expect(src).toContain("cancelWithPolicy");
    expect(src).toMatch(/CANCELLED.*REFUNDED|REFUNDED.*CANCELLED/);
    expect(src).not.toMatch(
      /transition\(\s*booking\.id\s*,\s*["']CANCELLED["']/,
    );
  });
});

describe("homestay/guide cancel post accounting", () => {
  it("homestay guest cancel calls postCancelAccountingInTx", () => {
    const src = readFileSync(
      join(process.cwd(), "app/api/homestay/bookings/[id]/route.ts"),
      "utf8",
    );
    expect(src).toContain("postCancelAccountingInTx");
  });

  it("guide guest cancel calls postCancelAccountingInTx", () => {
    const src = readFileSync(
      join(process.cwd(), "app/api/guide/bookings/[id]/route.ts"),
      "utf8",
    );
    expect(src).toContain("postCancelAccountingInTx");
  });
});

describe("no float taxi commission", () => {
  it("taxi complete path does not use * 0.15 or toFixed", () => {
    const src = readFileSync(
      join(process.cwd(), "app/api/taxi/driver/orders/[id]/route.ts"),
      "utf8",
    );
    expect(src).toContain("calcCommissionTiyin");
    expect(src).not.toMatch(/\*\s*0\.15/);
    expect(src).not.toContain(".toFixed(");
  });
});

describe("reversePartnerEarning is fail-loud", () => {
  it("booking.service has no empty catch around reversePartnerEarning", () => {
    const src = readFileSync(
      join(process.cwd(), "src/modules/booking/service/booking.service.ts"),
      "utf8",
    );
    const idx = src.indexOf("async reversePartnerEarning");
    expect(idx).toBeGreaterThan(-1);
    const slice = src.slice(idx, idx + 1200);
    expect(slice).not.toMatch(/catch\s*\{\s*\/\//);
    expect(slice).not.toMatch(/catch\s*\{\s*\}/);
  });
});
