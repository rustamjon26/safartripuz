import { describe, expect, it } from "vitest";
import { isGooglePhonePlaceholder, normalizeUzPhone } from "./phone";

describe("normalizeUzPhone", () => {
  it("accepts +998 and local 9-digit forms", () => {
    expect(normalizeUzPhone("+998901234567")).toBe("+998901234567");
    expect(normalizeUzPhone("998901234567")).toBe("+998901234567");
    expect(normalizeUzPhone("90 123 45 67")).toBe("+998901234567");
    expect(normalizeUzPhone("+998 90 123-45-67")).toBe("+998901234567");
  });

  it("rejects google placeholders and junk", () => {
    expect(normalizeUzPhone("google_abc123")).toBeNull();
    expect(normalizeUzPhone("12345")).toBeNull();
    expect(normalizeUzPhone("")).toBeNull();
  });
});

describe("isGooglePhonePlaceholder", () => {
  it("detects oauth placeholders", () => {
    expect(isGooglePhonePlaceholder("google_deadbeef")).toBe(true);
    expect(isGooglePhonePlaceholder("+998901234567")).toBe(false);
  });
});
