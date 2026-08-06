/**
 * Guard for the "no fabricated data" rule in the support panel.
 *
 * Every page here used to render demo KPIs, charts and reviews — either because
 * no API was wired up, or because the catch block silently substituted mock
 * constants when the API failed. A reader cannot tell invented numbers from real
 * ones, so the source itself is asserted rather than the rendered output.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const supportDir = path.dirname(fileURLToPath(import.meta.url));

function pageFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return pageFiles(full);
    return entry === "page.tsx" ? [full] : [];
  });
}

function read(relative: string): string {
  return readFileSync(path.join(supportDir, relative), "utf8");
}

describe("support panel data sources", () => {
  it("keeps only real UI copy in mock-data.ts", () => {
    const source = read("mock-data.ts");
    const exported = [...source.matchAll(/export const (\w+)/g)].map((m) => m[1]);
    expect(exported).toEqual(["QUICK_REPLIES"]);
  });

  it("no page imports fabricated datasets", () => {
    const offenders: string[] = [];
    for (const file of pageFiles(supportDir)) {
      const source = readFileSync(file, "utf8");
      const importsMock = /from\s+["'][^"']*mock-data["']/.test(source);
      if (!importsMock) continue;
      // The feed's canned reply chips are UI copy, not data.
      const onlyQuickReplies = /import\s*\{\s*QUICK_REPLIES\s*\}/.test(source);
      if (!onlyQuickReplies) offenders.push(path.relative(supportDir, file));
    }
    expect(offenders).toEqual([]);
  });

  for (const route of ["sentiment", "categories"] as const) {
    describe(`/support/${route}`, () => {
      const source = read(`${route}/page.tsx`);

      it("loads from an API rather than a constant", () => {
        expect(source).toMatch(/fetch\("\/api\/support\/feedback\//);
      });

      it("clears state on failure instead of falling back to numbers", () => {
        const catchBlock = source.slice(source.indexOf("} catch ("));
        expect(catchBlock).toMatch(/set\w+\(null\)/);
      });

      it("offers an explicit error state with a retry", () => {
        expect(source).toContain("Qayta urinish");
        expect(source).toMatch(/if \(error \|\| !\w+\)/);
      });

      it("distinguishes an empty inbox from a failure", () => {
        expect(source).toMatch(/Hali sharh/);
      });
    });
  }
});
