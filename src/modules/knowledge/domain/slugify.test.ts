import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("is deterministic for the same input", () => {
    const a = slugify("Go'ri Amir");
    const b = slugify("Go'ri Amir");
    expect(a).toBe(b);
    expect(a).toBe("gori-amir");
  });

  it("normalizes multiple Uzbek apostrophe code points on o'/g'", () => {
    expect(slugify("o'zbek")).toBe("ozbek");
    expect(slugify("o‘zbek")).toBe("ozbek"); // U+2018
    expect(slugify("o’zbek")).toBe("ozbek"); // U+2019
    expect(slugify("oʻzbek")).toBe("ozbek"); // U+02BB
    expect(slugify("g'isht")).toBe("gisht");
    expect(slugify("g‘isht")).toBe("gisht");
    expect(slugify("gʻisht")).toBe("gisht");
  });

  it("transliterates Cyrillic", () => {
    expect(slugify("Регистон")).toBe("registon");
    expect(slugify("Самарканд")).toBe("samarkand");
  });

  it("collapses whitespace and punctuation to single hyphens", () => {
    expect(slugify("  Registon   maydoni!! ")).toBe("registon-maydoni");
  });
});
