import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function read(relative: string): string {
  return readFileSync(path.join(repoRoot, relative), "utf8");
}

describe("payments/success page does not trust the URL", () => {
  const src = read("app/payments/success/page.tsx");

  it("loads Payment.status via getReturnView", () => {
    expect(src).toContain("paymentService.getReturnView");
    expect(src).toContain("getOptionalUser");
    expect(src).toContain('outcome === "captured"');
    expect(src).toContain('outcome === "pending"');
    expect(src).toContain('outcome === "failed"');
  });

  it("does not treat paymentId presence as success", () => {
    expect(src).toContain('if (!paymentId)');
    expect(src).toContain('outcome === "not_found"');
    expect(src).toContain("To'lov tasdiqlanmoqda");
    expect(src).toContain("To'lov topilmadi");
    expect(src).toContain("To'lov muvaffaqiyatli!");
    const capturedIdx = src.indexOf('outcome === "captured"');
    const successIdx = src.indexOf("To'lov muvaffaqiyatli!");
    expect(capturedIdx).toBeGreaterThan(0);
    expect(successIdx).toBeGreaterThan(capturedIdx);
  });
});

describe("Payme booking return page does not trust ?status=success", () => {
  const src = read("app/bookings/[bookingId]/page.tsx");

  it("uses the stored booking status only", () => {
    expect(src).toContain('booking.status === "PAID"');
    expect(src).not.toContain('status === "success"');
    expect(src).not.toContain('status === "failed"');
  });

  it("hides another user's booking", () => {
    expect(src).toContain("booking.userId !== actor.id");
    expect(src).toContain("notFound()");
  });
});
