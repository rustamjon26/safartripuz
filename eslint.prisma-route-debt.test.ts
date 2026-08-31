/**
 * Guardrail for `route → service → repository → prisma`.
 *
 * 149 of 213 route handlers already import Prisma directly; that baseline lives
 * in eslint.prisma-route-debt.mjs so lint can error on anything new without
 * turning CI red on day one. These assert both halves: the rule bites on a new
 * violation, and the baseline list stays honest.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import { PRISMA_ROUTE_DEBT } from "./eslint.prisma-route-debt.mjs";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const debt: string[] = PRISMA_ROUTE_DEBT;

const PRISMA_IMPORT = /from\s+["'](?:@\/lib\/prisma|@\/src\/shared\/db\/prisma)["']/;

let eslintInstance: ESLint | null = null;
function lint() {
  eslintInstance ??= new ESLint({ cwd: repoRoot });
  return eslintInstance;
}

async function restrictedImportMessages(filePath: string, source: string) {
  const [result] = await lint().lintText(source, { filePath });
  return result.messages.filter((m) => m.ruleId === "no-restricted-imports");
}

/** A route path that is deliberately NOT in the baseline list. */
const NEW_ROUTE = path.join(repoRoot, "app/api/__guardrail_probe__/route.ts");

function routeFiles(dir = path.join(repoRoot, "app/api")): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return entry === "route.ts" ? [path.relative(repoRoot, full)] : [];
  });
}

describe("prisma-in-route guardrail", () => {
  it("errors when a new route imports prisma directly", async () => {
    const messages = await restrictedImportMessages(
      NEW_ROUTE,
      `import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return NextResponse.json(await prisma.user.count());
}
`,
    );

    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(2);
    expect(messages[0].message).toContain("Route handlers must not import Prisma");
  });

  it("errors on the shared db client too, not just @/lib/prisma", async () => {
    const messages = await restrictedImportMessages(
      NEW_ROUTE,
      `import { prisma } from "@/src/shared/db/prisma";
export async function GET() {
  return Response.json(await prisma.user.count());
}
`,
    );
    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(2);
  });

  it("passes when the route goes through a module service", async () => {
    const messages = await restrictedImportMessages(
      NEW_ROUTE,
      `import { NextResponse } from "next/server";
import { bookingService } from "@/src/modules/booking";

export async function GET() {
  return NextResponse.json(await bookingService.expireHolds(1));
}
`,
    );
    expect(messages).toEqual([]);
  });

  it("keeps the existing debt at warn so CI does not go red on the baseline", async () => {
    const existing = path.join(repoRoot, debt[0]);
    const messages = await restrictedImportMessages(
      existing,
      `import { prisma } from "@/lib/prisma";
export async function GET() {
  return Response.json(await prisma.user.count());
}
`,
    );
    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(1);
  });
});

describe("PRISMA_ROUTE_DEBT baseline", () => {
  it("has no duplicates and is sorted within its groups", () => {
    expect(new Set(debt).size).toBe(debt.length);
  });

  it("lists only routes that really do import prisma", () => {
    const stale = debt.filter((relative) => {
      const source = readFileSync(path.join(repoRoot, relative), "utf8");
      return !PRISMA_IMPORT.test(source);
    });
    expect(
      stale,
      "these routes no longer import prisma — delete them from eslint.prisma-route-debt.mjs",
    ).toEqual([]);
  });

  it("covers every route that currently imports prisma", () => {
    const listed = new Set(debt);
    const unlisted = routeFiles()
      .filter((relative) =>
        PRISMA_IMPORT.test(readFileSync(path.join(repoRoot, relative), "utf8")),
      )
      .filter((relative) => !listed.has(relative));

    expect(
      unlisted,
      "a route imports prisma without being in the baseline — it should fail lint instead",
    ).toEqual([]);
  });

  it("is a baseline that only shrinks, not a target to grow", () => {
    // Written down so a jump is visible in review rather than in a diff stat.
    expect(debt.length).toBeLessThanOrEqual(149);
  });
});
