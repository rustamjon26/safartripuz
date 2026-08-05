/**
 * Dependency direction: `lib/` is legacy code being strangled by `src/modules`,
 * so imports must point lib → modules, never modules → lib. A module reaching
 * back into lib/ pins the legacy file in place and makes the module untestable
 * without it.
 *
 * Everything still allowed is listed below with a reason, so the exceptions are
 * reviewed rather than assumed.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const modulesDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(modulesDir, "../..");

/**
 * External transports that no single module owns. Each sends to a third party
 * (Expo push, Didox EDO) and is consumed by outbox workers on behalf of other
 * modules, so neither has an obvious owning module yet.
 *
 * Both are candidates for promotion to `src/shared/` or an adapter module; that
 * is tracked separately from this guard.
 */
const ALLOWED_LIB_IMPORTS = [
  "@/lib/pushNotification",
  "@/lib/didox/emitDidoxInvoiceForPayment",
] as const;

const LIB_IMPORT = /from\s+["'](@\/lib\/[^"']+)["']/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    if (!/\.tsx?$/.test(entry)) return [];
    // Tests may reach for fixtures and mocks; production code may not.
    if (/\.(test|spec)\.tsx?$/.test(entry)) return [];
    return [full];
  });
}

function libImportsIn(file: string): string[] {
  const source = readFileSync(file, "utf8");
  return [...source.matchAll(LIB_IMPORT)].map((m) => m[1]);
}

describe("src/modules must not depend on lib/", () => {
  const offenders = sourceFiles(modulesDir).flatMap((file) =>
    libImportsIn(file)
      .filter((target) => !(ALLOWED_LIB_IMPORTS as readonly string[]).includes(target))
      .map((target) => `${path.relative(repoRoot, file)} → ${target}`),
  );

  it("has no unapproved module → lib import", () => {
    expect(
      offenders,
      "move the logic into the module that needs it, or promote it to src/shared and add it to ALLOWED_LIB_IMPORTS with a reason",
    ).toEqual([]);
  });

  it("keeps the allowed list short and every entry still used", () => {
    const used = new Set(sourceFiles(modulesDir).flatMap(libImportsIn));
    const unused = ALLOWED_LIB_IMPORTS.filter((target) => !used.has(target));
    expect(unused, "no module imports this any more — drop it from the list").toEqual(
      [],
    );
    expect(ALLOWED_LIB_IMPORTS.length).toBeLessThanOrEqual(2);
  });
});

describe("shared utilities are genuinely shared", () => {
  it("src/shared holds no I/O-bound helpers by accident", () => {
    // A shared util must be usable from any layer, which means no Prisma.
    const prismaInShared = sourceFiles(path.join(repoRoot, "src/shared"))
      .filter((file) => !file.endsWith(path.join("db", "prisma.ts")))
      .filter((file) => !file.endsWith(path.join("db", "client.ts")))
      .filter((file) => /from\s+["']@?\/?.*prisma["']/.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(repoRoot, file));

    expect(prismaInShared).toEqual([]);
  });
});
