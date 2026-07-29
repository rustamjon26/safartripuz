import { describe, expect, it } from "vitest";
import { normalizeRegion } from "./normalize";

describe("normalizeRegion", () => {
  it("maps samarkand alias to samarqand regionCode", () => {
    expect(normalizeRegion("Samarkand")).toEqual({
      regionCode: "samarqand",
      display: "Samarqand",
    });
  });

  it("maps zomin aliases", () => {
    expect(normalizeRegion("zaamin").regionCode).toBe("zomin");
  });
});
