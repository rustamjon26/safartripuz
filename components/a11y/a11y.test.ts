/**
 * Keyboard and screen-reader regressions are invisible in a browser check, so
 * the three fixed here are asserted at the source.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

function read(relative: string): string {
  return readFileSync(path.join(repoRoot, relative), "utf8");
}

const DRAWER_LAYOUTS = [
  "app/hotel/layout.tsx",
  "app/support/layout.tsx",
  "app/guide-partner/layout.tsx",
  "app/taxi-partner/layout.tsx",
  "app/homestay-partner/layout.tsx",
] as const;

describe("notification list", () => {
  const source = read("components/dashboard/NotificationPopover.tsx");

  it("marks a notification read from a button, not a div", () => {
    expect(source).not.toMatch(/<div\s+key=\{n\.id\}[\s\S]{0,80}onClick=/);
    expect(source).toMatch(/<button\s+key=\{n\.id\}/);
  });

  it("names the action for a screen reader", () => {
    expect(source).toContain("aria-label={");
    expect(source).toMatch(/o'qildi deb belgilash/);
  });

  it("disables the button once the notification is read", () => {
    expect(source).toContain("disabled={Boolean(n.readAt)}");
  });
});

describe("drawer layers", () => {
  for (const layout of DRAWER_LAYOUTS) {
    describe(layout, () => {
      const source = read(layout);

      it("closes on Escape and traps focus", () => {
        expect(source).toContain(
          'from "@/components/a11y/useDismissibleLayer"',
        );
        expect(source).toContain("useDismissibleLayer<HTMLElement>(drawerOpen");
        expect(source).toContain("ref={drawerRef}");
      });

      it("exposes the drawer as a dialog", () => {
        expect(source).toContain('role="dialog"');
        expect(source).toContain('aria-modal="true"');
        expect(source).toContain("tabIndex={-1}");
      });

      it("makes the backdrop a real button", () => {
        // A div backdrop is unreachable without a pointer.
        expect(source).not.toMatch(
          /<div\s+className="fixed inset-0 bg-[^"]*backdrop-blur[^"]*"\s+onClick=/,
        );
        expect(source).toMatch(/aria-label="Menyuni yopish"/);
      });
    });
  }
});

describe("useDismissibleLayer", () => {
  const source = read("components/a11y/useDismissibleLayer.ts");

  it("handles Escape, Tab and focus restoration", () => {
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain('event.key !== "Tab"');
    expect(source).toContain("restoreFocusTo.current?.focus");
  });

  it("cleans its listener up", () => {
    expect(source).toContain('document.removeEventListener("keydown", onKeyDown)');
  });
});

describe("image alternatives", () => {
  it("guide listing photos describe themselves", () => {
    const source = read("app/admin/guide/listings/[id]/page.tsx");
    expect(source).not.toMatch(/<img[\s\S]{0,120}alt=""/);
    expect(source).toContain("alt={`${listing.title} — rasm ${index + 1}");
  });

  it("the tour thumbnail stays decorative because its button is labelled", () => {
    const source = read("components/admin/tours/AdminTourDetailClient.tsx");
    expect(source).toContain('alt=""');
    expect(source).toMatch(/aria-label=\{`Rasm \$\{index \+ 1\}/);
  });
});
