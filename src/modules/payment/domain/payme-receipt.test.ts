import { afterEach, describe, expect, it } from "vitest";
import {
  buildPaymeReceiptDetail,
  getPaymeMxikCode,
  getPaymePackageCode,
  getPaymeVatPercent,
} from "./payme-receipt";

const ENV_KEYS = ["PAYME_MXIK_CODE", "PAYME_PACKAGE_CODE", "PAYME_VAT_PERCENT"] as const;

afterEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
});

describe("buildPaymeReceiptDetail", () => {
  it("returns the fiscal fields Shohjahon listed for CheckPerformTransaction", () => {
    process.env.PAYME_MXIK_CODE = "10405001001000000";
    process.env.PAYME_PACKAGE_CODE = "1505098";
    process.env.PAYME_VAT_PERCENT = "12";

    const detail = buildPaymeReceiptDetail({
      title: "SafarTrip sayohat to'lovi",
      priceTiyin: 1_500_000,
    });

    expect(detail).toEqual({
      receipt_type: 0,
      items: [
        {
          title: "SafarTrip sayohat to'lovi",
          price: 1_500_000,
          count: 1,
          code: "10405001001000000",
          package_code: "1505098",
          vat_percent: 12,
        },
      ],
    });
  });

  it("rejects non-integer / non-positive tiyin prices", () => {
    expect(() =>
      buildPaymeReceiptDetail({ title: "x", priceTiyin: 12.5 }),
    ).toThrow(/tiyin/i);
    expect(() =>
      buildPaymeReceiptDetail({ title: "x", priceTiyin: 0 }),
    ).toThrow(/tiyin/i);
  });
});

describe("Payme fiscal env defaults", () => {
  it("exposes defaults so a misconfigured deploy still returns a detail object", () => {
    expect(getPaymeMxikCode()).toMatch(/^\d+$/);
    expect(getPaymePackageCode().length).toBeGreaterThan(0);
    expect(getPaymeVatPercent()).toBe(12);
  });
});
