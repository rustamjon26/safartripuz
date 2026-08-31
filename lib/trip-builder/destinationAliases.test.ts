import { describe, expect, it } from "vitest";
import {
  cityContainsAny,
  cityOrRegionContainsAny,
  destinationSearchTerms,
} from "./destinationAliases";

describe("destinationSearchTerms", () => {
  it("expands Zomin spellings", () => {
    const terms = destinationSearchTerms("Zomin");
    expect(terms).toEqual(expect.arrayContaining(["zomin", "zaamin", "зомин"]));
    expect(destinationSearchTerms("Zaamin")).toEqual(
      expect.arrayContaining(["zomin", "zaamin"]),
    );
  });

  it("returns empty for blank", () => {
    expect(destinationSearchTerms("")).toEqual([]);
    expect(destinationSearchTerms(null)).toEqual([]);
  });

  it("falls back to normalized raw token", () => {
    expect(destinationSearchTerms("Nukus")).toEqual(["nukus"]);
  });
});

describe("city/region match builders", () => {
  it("builds city OR clauses", () => {
    expect(cityContainsAny(["zomin", "zaamin"])).toEqual([
      { city: { contains: "zomin" } },
      { city: { contains: "zaamin" } },
    ]);
  });

  it("builds city+region OR clauses", () => {
    const clauses = cityOrRegionContainsAny(["zomin"]);
    expect(clauses).toEqual([
      { city: { contains: "zomin" } },
      { region: { contains: "zomin" } },
    ]);
  });
});
