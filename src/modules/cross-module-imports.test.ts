/**
 * Modules talk to each other through `index.ts` only.
 *
 * A deep import (`@/src/modules/inventory/domain/nights`) reaches past the
 * public surface, so the owning module can no longer move or rename an internal
 * file without breaking a consumer that never announced itself.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const modulesDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(modulesDir, "../..");

const DEEP_IMPORT =
  /from\s+["']@\/src\/modules\/([a-z-]+)\/(domain|service|repository|adapters)\/[^"']+["']/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

/** Which module a file belongs to — a module may reach into its own internals. */
function owningModule(file: string): string | null {
  const rel = path.relative(modulesDir, file);
  const [first] = rel.split(path.sep);
  return first && !first.endsWith(".ts") ? first : null;
}

describe("cross-module imports", () => {
  it("uses each module's index.ts, never a deep path", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(modulesDir)) {
      const owner = owningModule(file);
      const source = readFileSync(file, "utf8");

      for (const match of source.matchAll(DEEP_IMPORT)) {
        const target = match[1];
        if (target === owner) continue; // own internals are fine
        offenders.push(
          `${path.relative(repoRoot, file)} → @/src/modules/${target}/${match[2]}/…`,
        );
      }
    }

    expect(
      offenders,
      "import from @/src/modules/<name> instead; export the symbol from that module's index.ts if it is missing",
    ).toEqual([]);
  });
});

describe("page components go through modules", () => {

  it("the pages fixed in this batch no longer import prisma", () => {
    const fixed = [
      "app/admin/page.tsx",
      "app/bookings/[bookingId]/page.tsx",
      "app/admin/payments/[id]/page.tsx",
    ];

    for (const rel of fixed) {
      const source = readFileSync(path.join(repoRoot, rel), "utf8");
      expect(source, rel).not.toMatch(/from\s+["']@\/lib\/prisma["']/);
      expect(source, rel).toMatch(/from\s+["']@\/src\/modules\//);
    }
  });
});
