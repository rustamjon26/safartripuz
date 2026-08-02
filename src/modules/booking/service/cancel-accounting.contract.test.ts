import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("hotel staff cancel routes through cancelWithPolicy", () => {
  it("status route uses cancelWithPolicy for CANCELLED/REFUNDED", () => {
    const src = read("app/api/hotel/bookings/[id]/status/route.ts");
    expect(src).toContain("cancelWithPolicy");
    expect(src).toMatch(/CANCELLED.*REFUNDED|REFUNDED.*CANCELLED/);
    expect(src).not.toMatch(
      /transition\(\s*booking\.id\s*,\s*["']CANCELLED["']/,
    );
  });

  it("updateBookingStatus helper uses cancelWithPolicy", () => {
    const src = read("lib/hotel/updateBookingStatus.ts");
    expect(src).toContain("cancelWithPolicy");
  });
});

describe("homestay/guide cancel funnel through shared policy accounting", () => {
  it("homestay guest cancel uses cancelHomestayWithPolicy", () => {
    const src = read("app/api/homestay/bookings/[id]/route.ts");
    expect(src).toContain("cancelHomestayWithPolicy");
    expect(src).not.toMatch(/await\s+postCancelAccountingInTx/);
  });

  it("guide guest cancel uses cancelGuideWithPolicy", () => {
    const src = read("app/api/guide/bookings/[id]/route.ts");
    expect(src).toContain("cancelGuideWithPolicy");
    expect(src).not.toMatch(/await\s+postCancelAccountingInTx/);
  });

  it("guide partner cancel uses cancelGuideWithPolicy", () => {
    const src = read("app/api/guide/partner/bookings/[id]/route.ts");
    expect(src).toContain("cancelGuideWithPolicy");
  });

  it("admin homestay cancel uses cancelHomestayWithPolicy", () => {
    const src = read("app/api/admin/homestay/bookings/[id]/route.ts");
    expect(src).toContain("cancelHomestayWithPolicy");
  });

  it("admin guide cancel uses cancelGuideWithPolicy", () => {
    const src = read("app/api/admin/guide/bookings/[id]/route.ts");
    expect(src).toContain("cancelGuideWithPolicy");
  });

  it("hotel + non-hotel cancel services both call postCancelAccountingInTx", () => {
    const bookingSvc = read("src/modules/booking/service/booking.service.ts");
    expect(bookingSvc).toContain("postCancelAccountingInTx");
    expect(bookingSvc.match(/postCancelAccountingInTx/g)?.length).toBeGreaterThanOrEqual(3);
  });
});

describe("no float taxi commission", () => {
  it("taxi complete path does not use * 0.15 or toFixed", () => {
    const src = read("app/api/taxi/driver/orders/[id]/route.ts");
    expect(src).toContain("calcCommissionTiyin");
    expect(src).not.toMatch(/\*\s*0\.15/);
    expect(src).not.toContain(".toFixed(");
  });
});

describe("reversePartnerEarning is fail-loud", () => {
  it("booking.service has no empty catch around reversePartnerEarning", () => {
    const src = read("src/modules/booking/service/booking.service.ts");
    const idx = src.indexOf("async reversePartnerEarning");
    expect(idx).toBeGreaterThan(-1);
    const slice = src.slice(idx, idx + 400);
    expect(slice).not.toMatch(/catch\s*\{\s*\/\//);
    expect(slice).not.toMatch(/catch\s*\{\s*\}/);
  });

  it("cancel-accounting logs and rethrows (no empty catch)", () => {
    const src = read("src/modules/booking/service/cancel-accounting.ts");
    expect(src).toContain("ALERT cancel_accounting_failed");
    expect(src).toMatch(/throw err/);
    expect(src).not.toMatch(/catch\s*\{\s*\}/);
    expect(src).toContain("allowUnattributed: false");
  });
});

describe("payment success never hardcodes partnerUserId null", () => {
  it("completeSuccessfulPaymentInTx resolves partners", () => {
    const src = read("lib/payments/completeSuccessfulPaymentTx.ts");
    expect(src).toContain("MissingPartnerError");
    expect(src).toContain("createPartnerEarningIfMissing");
    expect(src).not.toMatch(/partnerUserId:\s*null/);
  });

  it("Payme performTransaction dual-writes PartnerEarning + ledger", () => {
    const src = read("app/api/payme/methods/performTransaction.ts");
    expect(src).toContain("createPartnerEarningIfMissing");
    expect(src).toContain("ledgerService.record");
    expect(src).not.toMatch(/partnerUserId:\s*null/);
  });
});
