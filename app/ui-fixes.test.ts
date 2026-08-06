/**
 * Two small fixes that only show up on a real device or a signed-out session,
 * so they are asserted at the source rather than left to manual testing.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appDir, "..");

function read(relative: string): string {
  return readFileSync(path.join(repoRoot, relative), "utf8");
}

describe("pb-safe", () => {
  const css = read("app/globals.css");

  it("is actually defined, not just used", () => {
    expect(css).toMatch(/@utility pb-safe\s*\{/);
  });

  it("reads the bottom safe-area inset", () => {
    const utility = css.slice(css.indexOf("@utility pb-safe"));
    expect(utility.slice(0, 200)).toContain("env(safe-area-inset-bottom");
  });

  it("never renders less padding than the py-* it sits beside", () => {
    // max() with a floor at py-3, so a device with no inset keeps its padding.
    const utility = css.slice(css.indexOf("@utility pb-safe"));
    expect(utility.slice(0, 200)).toMatch(/max\(\s*0\.75rem/);
  });

  it("every user of the class is a fixed bottom bar", () => {
    const users = [
      "app/hotel/layout.tsx",
      "app/support/layout.tsx",
      "app/guide-partner/layout.tsx",
      "components/hotel/rooms/PhysicalRoomsList.tsx",
    ];
    for (const file of users) {
      const source = read(file);
      expect(source, file).toContain("pb-safe");
      for (const line of source.split("\n").filter((l) => l.includes("pb-safe"))) {
        expect(line, `${file}: ${line.trim()}`).toMatch(/fixed[\s\S]*bottom-/);
      }
    }
  });
});

describe("/bookings sign-in redirect", () => {
  const source = read("app/bookings/page.tsx");

  it("returns to /bookings, not the unrelated /user/bookings", () => {
    const code = source
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    expect(code).not.toContain("/user/bookings");
    expect(code).toContain('loginWithNext(pathname || "/bookings")');
  });

  it("builds the link with the shared helper so encoding stays consistent", () => {
    expect(source).toContain('from "@/lib/authLinks"');
  });
});
