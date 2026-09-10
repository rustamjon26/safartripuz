import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const src = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "cleanup-retired-payme-test-ledger.ts"),
  "utf8",
);

describe("cleanup-retired-payme-test-ledger.ts", () => {
  it("defaults to dry-run and never deletes LedgerEntry", () => {
    expect(src).toContain("--apply");
    expect(src).toContain("DRY-RUN");
    expect(src).not.toMatch(/ledgerEntry\.delete/);
    expect(src).not.toMatch(/ledgerTransaction\.delete/);
    expect(src).toContain("postRefundCompensation");
    expect(src).toContain("reversePartnerEarningInTx");
  });
});
