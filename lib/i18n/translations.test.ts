/**
 * The UI is Latin-script Uzbek with an English parallel tree. One entry had
 * drifted into Cyrillic Russian, which no reader of either locale expects.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { translations } from "./translations";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const CYRILLIC = /[\u0400-\u04FF]/;

type Tree = { [key: string]: string | Tree };

function walk(tree: Tree, prefix = ""): Array<[string, string]> {
  return Object.entries(tree).flatMap(([key, value]) => {
    const dotted = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string"
      ? [[dotted, value] as [string, string]]
      : walk(value, dotted);
  });
}

const uz = walk(translations.uz as Tree);
const en = walk(translations.en as Tree);

describe("translations", () => {
  it("supports exactly the uz and en locales", () => {
    expect(Object.keys(translations).sort()).toEqual(["en", "uz"]);
  });

  it("has no Cyrillic anywhere — Uzbek here is Latin script", () => {
    const offenders = [...uz, ...en].filter(([, value]) => CYRILLIC.test(value));
    expect(offenders).toEqual([]);
  });

  it("keeps the two locales structurally in step for the keys the shell uses", () => {
    const uzKeys = new Set(uz.map(([k]) => k));
    const enKeys = new Set(en.map(([k]) => k));
    for (const key of [
      "nav.invoices",
      "shell.brand",
      "shell.tagline",
      "shell.settings",
      "shell.check_in",
      "shell.manager_fallback",
    ]) {
      expect(uzKeys.has(key), `uz.${key}`).toBe(true);
      expect(enKeys.has(key), `en.${key}`).toBe(true);
    }
  });

  it("has no empty strings, which render as a blank label", () => {
    expect([...uz, ...en].filter(([, v]) => v.trim() === "")).toEqual([]);
  });
});

describe("shell strings go through t()", () => {
  it("hotel layout has no hardcoded English labels left", () => {
    const source = readFileSync(path.join(repoRoot, "app/hotel/layout.tsx"), "utf8");
    for (const literal of [
      '"Invoys"',
      "Property Management",
      "<span>Settings</span>",
      '"Manager"',
    ]) {
      expect(source, literal).not.toContain(literal);
    }
    expect(source).toContain('t("shell.settings")');
    expect(source).toContain('t("shell.check_in")');
  });

  it("support layout nav is in the panel's language, not English", () => {
    const source = readFileSync(path.join(repoRoot, "app/support/layout.tsx"), "utf8");
    const navBlock = source.slice(
      source.indexOf("const NAV_ITEMS"),
      source.indexOf("const ALLOWED_ROLES"),
    );
    for (const english of ["Overview", "Feedback Feed", "Categories", "Reports"]) {
      expect(navBlock, english).not.toContain(`"${english}"`);
    }
    expect(navBlock).toContain("Kategoriyalar");
    expect(navBlock).toContain("Hisobotlar");
  });
});
