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

  it("maps tuman aliases like Urgut onto the catalog city", () => {
    expect(resolveDestination("", cities, "Urgutga 2 kun")).toBe("Samarqand");
  });

  it("maps Xorazm / Urganch onto Xiva", () => {
    expect(resolveDestination("", cities, "Xorazm viloyati")).toBe("Xiva");
    expect(resolveDestination("", cities, "Urganchdan")).toBe("Xiva");
  });

  it("maps Chirchiq onto Toshkent", () => {
    expect(resolveDestination("", cities, "Chirchiqda dam olamiz")).toBe(
      "Toshkent",
    );
  });

  it("maps Chimyon and Chorvoq onto Toshkent", () => {
    expect(resolveDestination("", cities, "Chimyonga 2 kun")).toBe("Toshkent");
    expect(resolveDestination("", cities, "Chorvoqda dam")).toBe("Toshkent");
  });

  it("does not auto-pick a Silk Road city for a broad theme", () => {
    expect(
      resolveDestination("Samarqand", cities, "Tarixiy shaharlar"),
    ).toBe("");
  });

  it("keeps an explicit city when the theme is combined with a place", () => {
    expect(
      resolveDestination("", cities, "Samarqand tarixiy shaharlar"),
    ).toBe("Samarqand");
  });

  it("does not invent a catalog city for Farg'ona when it is not listed", () => {
    expect(resolveDestination("", cities, "Farg'ona vodiysi")).toBe("");
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

  it("maps Urgut even when the LLM returns no JSON", () => {
    const intent = parseAiMatchIntent("", cities, "Urgutga 2 kun");
    expect(intent.destination).toBe("Samarqand");
  });

  it("recognizes Farg'ona and asks instead of inventing hotels", () => {
    const intent = parseAiMatchIntent("", cities, "Farg'ona vodiysi");
    expect(intent.destination).toBe("");
    expect(intent.message).toMatch(/Farg/i);
  });
});
