import { describe, expect, it } from "vitest";
import { haversineKm } from "./distance";

describe("haversineKm", () => {
  it("returns ~0 for identical coordinates", () => {
    expect(haversineKm(41.3111, 69.2797, 41.3111, 69.2797)).toBeLessThan(0.01);
  });

  it("matches known Tashkent–nearby distance within tolerance", () => {
    // Approx 3.5 km between two central Tashkent points (same fixture as lib/taxi).
    const km = haversineKm(41.3111, 69.2797, 41.2995, 69.2401);
    expect(km).toBeGreaterThan(3.0);
    expect(km).toBeLessThan(4.2);
  });
});
