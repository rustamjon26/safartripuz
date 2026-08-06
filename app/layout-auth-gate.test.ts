/**
 * Every layout behind an authenticated area must block render until the session
 * check resolves — the pattern app/staff/layout.tsx established. Without it the
 * shell (and whatever the page fetched) paints first and the redirect follows,
 * which is visible as a flash of protected content.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appDir = path.dirname(fileURLToPath(import.meta.url));

/** Layouts that own an auth check and therefore must gate on it. */
const SELF_CHECKING_LAYOUTS = [
  "staff/layout.tsx",
  "admin/layout.tsx",
  "hotel/layout.tsx",
  "support/layout.tsx",
  "guide-partner/layout.tsx",
  "homestay-partner/layout.tsx",
  "taxi-partner/layout.tsx",
] as const;

/** Layouts that delegate to the shared AuthGate component. */
const GATED_LAYOUTS = [
  "bookings/layout.tsx",
  "profile/layout.tsx",
  "trip-builder/layout.tsx",
] as const;

function read(relative: string): string {
  return readFileSync(path.join(appDir, relative), "utf8");
}

describe("layout auth gates", () => {
  for (const layout of SELF_CHECKING_LAYOUTS) {
    describe(layout, () => {
      const source = read(layout);

      it("tracks whether the check has resolved", () => {
        expect(source).toMatch(/const \[ready,\s*setReady\]\s*=\s*useState\(false\)/);
        expect(source).toContain("setReady(true)");
      });

      it("returns early while it is still checking", () => {
        expect(source).toMatch(/if \(!ready\) \{/);
        const gateIndex = source.indexOf("if (!ready) {");
        const mainReturn = source.lastIndexOf("\n  return (");
        expect(gateIndex).toBeGreaterThan(-1);
        // The gate has to sit before the shell's own return, not after it.
        expect(gateIndex).toBeLessThan(mainReturn);
      });
    });
  }

  for (const layout of GATED_LAYOUTS) {
    it(`${layout} wraps its children in AuthGate`, () => {
      const source = read(layout);
      expect(source).toContain('from "@/components/auth/AuthGate"');
      expect(source).toMatch(/<AuthGate[^>]*>\{children\}<\/AuthGate>/);
    });
  }

  it("AuthGate renders children only once the check succeeds", () => {
    const source = readFileSync(
      path.join(appDir, "..", "components", "auth", "AuthGate.tsx"),
      "utf8",
    );
    // Children are the last branch; loading and offline return before it.
    const childrenIndex = source.indexOf("return <>{children}</>");
    expect(childrenIndex).toBeGreaterThan(source.indexOf('state === "offline"'));
    expect(childrenIndex).toBeGreaterThan(source.indexOf('state === "checking"'));
    expect(source).toContain("loginWithNext");
  });
});
