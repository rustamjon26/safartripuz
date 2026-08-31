import { describe, expect, it } from "vitest";
import {
  extractJsonObject,
  parseAiMatchIntent,
  resolveDestination,
} from "./aiMatchParse";

const cities = ["Samarqand", "Buxoro", "Xiva", "Toshkent"];

describe("extractJsonObject", () => {
  it("parses a bare object", () => {
    expect(extractJsonObject('{"destination":"Xiva"}')).toBe(
      '{"destination":"Xiva"}',
    );
  });

  it("strips markdown fences", () => {
    const raw = '```json\n{"destination":"Buxoro","pax":2}\n```';
    expect(extractJsonObject(raw)).toBe('{"destination":"Buxoro","pax":2}');
  });

  it("pulls the object out of surrounding prose", () => {
    const raw = 'Albatta:\n{"destination":"Samarqand","days":3}\nRahmat.';
    expect(extractJsonObject(raw)).toContain('"destination":"Samarqand"');
  });
});

describe("resolveDestination", () => {
  it("matches ignoring case", () => {
    expect(resolveDestination("samarqand", cities, "")).toBe("Samarqand");
  });

  it("maps latin aliases like Samarkand to the catalog city", () => {
    expect(resolveDestination("Samarkand", cities, "")).toBe("Samarqand");
  });

  it("falls back to a city named in the user prompt", () => {
    expect(resolveDestination("", cities, "Xiva ga 2 kunlik safar")).toBe(
      "Xiva",
    );
  });
});

describe("parseAiMatchIntent", () => {
  it("reads a valid LLM JSON payload", () => {
    const intent = parseAiMatchIntent(
      '{"destination":"Buxoro","pax":4,"budget":"cheap","days":3,"mood":"family","message":"Ok"}',
      cities,
      "Buxoroga oilaviy safar",
    );
    expect(intent).toEqual({
      destination: "Buxoro",
      pax: 4,
      budget: "cheap",
      days: 3,
      mood: "family",
      message: "Ok",
    });
  });

  it("coerces string numbers and unknown budget/mood", () => {
    const intent = parseAiMatchIntent(
      '{"destination":"Xiva","pax":"3","days":"2","budget":"vip","mood":"fun"}',
      cities,
      "Xiva",
    );
    expect(intent.pax).toBe(3);
    expect(intent.days).toBe(2);
    expect(intent.budget).toBe("any");
    expect(intent.mood).toBe("any");
    expect(intent.destination).toBe("Xiva");
  });

  it("still finds the city from the prompt when JSON is garbage", () => {
    const intent = parseAiMatchIntent(
      "tushunmadim",
      cities,
      "Samarqandga 3 kunlik arzon safar",
    );
    expect(intent.destination).toBe("Samarqand");
  });

  it("does not surface API xato as the guest-facing message", () => {
    const intent = parseAiMatchIntent(
      '{"destination":"","message":"API xato"}',
      cities,
      "Tarixiy shaharlar",
    );
    expect(intent.destination).toBe("");
    expect(intent.message.toLowerCase()).not.toContain("api xato");
    expect(intent.message).toMatch(/Samarqand/);
  });
});
