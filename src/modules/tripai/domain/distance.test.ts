import { describe, expect, it } from "vitest";
import { haversine, haversineKm } from "./distance";

describe("haversine", () => {
  it("returns ~0 for identical coordinates", () => {
    expect(haversine(41.3111, 69.2797, 41.3111, 69.2797)).toBeLessThan(0.01);
  });

  it("matches known Tashkent–nearby distance within tolerance", () => {
    // Approx 3.5 km between two central Tashkent points (same fixture as lib/taxi).
    const km = haversine(41.3111, 69.2797, 41.2995, 69.2401);
    expect(km).toBeGreaterThan(3.0);
    expect(km).toBeLessThan(4.2);
  });

  it("Registon → Imom al-Buxoriy is a long leg (~18 km+)", () => {
    // tourism_data.json coordinates
    const km = haversine(39.6546466, 66.9757669, 39.8151972, 66.9445556);
    expect(km).toBeGreaterThan(15);
    expect(km).toBeLessThan(35);
  });

  it("haversineKm is the same function", () => {
    expect(haversineKm).toBe(haversine);
  });
});
