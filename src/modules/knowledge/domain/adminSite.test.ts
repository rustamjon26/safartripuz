import { describe, expect, it } from "vitest";
import { adminSiteCreateSchema, adminSiteUpdateSchema } from "./adminSite";

describe("adminSiteCreateSchema", () => {
  it("accepts a landmark without dining", () => {
    const r = adminSiteCreateSchema.safeParse({
      name: "Registon",
      regionCode: "samarqand",
      category: "OBIDA",
      lat: 39.65,
      lng: 66.97,
      open_hours: "08:00 - 20:00",
      sourceUrl: "https://example.org/registon",
      prominence: "PRIMARY",
    });
    expect(r.success).toBe(true);
  });

  it("requires dining for RESTORAN", () => {
    const r = adminSiteCreateSchema.safeParse({
      name: "Test osh",
      regionCode: "samarqand",
      category: "RESTORAN",
    });
    expect(r.success).toBe(false);
  });

  it("rejects dining on BOSHQA", () => {
    const r = adminSiteCreateSchema.safeParse({
      name: "Misc",
      regionCode: "samarqand",
      category: "BOSHQA",
      dining: { priceBand: "orta", mealTypes: ["tushlik"] },
    });
    expect(r.success).toBe(false);
  });
});

describe("adminSiteUpdateSchema", () => {
  it("allows partial open_hours update", () => {
    const r = adminSiteUpdateSchema.safeParse({
      open_hours: "11:00 - 23:00",
      prominence: "SECONDARY",
    });
    expect(r.success).toBe(true);
  });
});
