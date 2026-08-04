import { describe, expect, it } from "vitest";
import { resolveDestinationCenter, UZ_FALLBACK } from "./destinationCenters";

describe("resolveDestinationCenter", () => {
  it("resolves common Uzbek destinations", () => {
    const [lat, lng] = resolveDestinationCenter("Samarqand");
    expect(lat).toBeCloseTo(39.65, 1);
    expect(lng).toBeCloseTo(66.96, 1);

    expect(resolveDestinationCenter("buxoro")[0]).toBeCloseTo(39.77, 1);
    expect(resolveDestinationCenter("Zomin")[0]).toBeCloseTo(39.96, 1);
  });

  it("falls back for unknown / empty", () => {
    expect(resolveDestinationCenter("")).toEqual(UZ_FALLBACK);
    expect(resolveDestinationCenter("Mars")).toEqual(UZ_FALLBACK);
  });
});
