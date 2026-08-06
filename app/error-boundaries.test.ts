/**
 * A render error used to produce a blank white page: the app had no error.tsx
 * anywhere, so React unmounted the tree with nothing to fall back to.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appDir = path.dirname(fileURLToPath(import.meta.url));

/** Every route segment that owns a layout should keep it when a page throws. */
const SEGMENTS_WITH_LAYOUT = [
  "hotel",
  "admin",
  "support",
  "staff",
  "guide-partner",
  "homestay-partner",
  "taxi-partner",
  "bookings",
  "profile",
  "trip-builder",
] as const;

function read(relative: string): string {
  return readFileSync(path.join(appDir, relative), "utf8");
}

describe("error boundaries", () => {
  it("has a root error.tsx", () => {
    expect(existsSync(path.join(appDir, "error.tsx"))).toBe(true);
  });

  it("has a global-error.tsx for root-layout failures", () => {
    const source = read("global-error.tsx");
    // It replaces the root layout, so it must ship its own document shell.
    expect(source).toContain("<html");
    expect(source).toContain("<body");
  });

  for (const file of ["error.tsx", "global-error.tsx"] as const) {
    it(`${file} is a Client Component, as error boundaries must be`, () => {
      expect(read(file).trimStart().startsWith('"use client"')).toBe(true);
    });
  }

  it("the root boundary forwards its recovery props to the shared fallback", () => {
    const source = read("error.tsx");
    expect(source).toContain("ErrorFallback");
    expect(source).toMatch(/<ErrorFallback \{\.\.\.props\}/);
  });

  it("global-error implements recovery itself, since it cannot import the shell", () => {
    const source = read("global-error.tsx");
    expect(source).toContain("unstable_retry");
    expect(source).toContain("reset");
    expect(source).toContain("Qayta urinish");
    expect(source).not.toContain("components/errors/ErrorFallback");
  });

  for (const segment of SEGMENTS_WITH_LAYOUT) {
    it(`${segment} has its own boundary so the panel shell survives`, () => {
      const dir = path.join(appDir, segment);
      expect(statSync(dir).isDirectory()).toBe(true);
      expect(readdirSync(dir)).toContain("error.tsx");
      expect(read(`${segment}/error.tsx`).trimStart().startsWith('"use client"')).toBe(
        true,
      );
    });
  }

  it("the shared fallback shows a retry, a way home and the error digest", () => {
    const source = readFileSync(
      path.join(appDir, "..", "components", "errors", "ErrorFallback.tsx"),
      "utf8",
    );
    expect(source).toContain("Qayta urinish");
    expect(source).toContain("Bosh sahifa");
    // The digest is the only link between a user's report and the server log.
    expect(source).toContain("error.digest");
    expect(source).toContain("unstable_retry ?? reset");
  });

  it("every layout-owning segment is covered by a boundary", () => {
    const uncovered: string[] = [];
    for (const entry of readdirSync(appDir)) {
      const dir = path.join(appDir, entry);
      if (!statSync(dir).isDirectory()) continue;
      // Route groups and private folders do not get their own boundary.
      if (entry.startsWith("(") || entry.startsWith("_") || entry === "api") continue;
      if (!existsSync(path.join(dir, "layout.tsx"))) continue;
      if (!existsSync(path.join(dir, "error.tsx"))) uncovered.push(entry);
    }
    expect(uncovered).toEqual([]);
  });
});
