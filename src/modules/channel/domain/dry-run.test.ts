import { describe, expect, it } from "vitest";
import { createStubAdapter } from "./adapters/stub-adapter";
import { isDryRunResult } from "./dry-run";

describe("channel dry-run", () => {
  it("treats stub adapters as dry-run", () => {
    expect(createStubAdapter("booking").mode).toBe("dry_run");
  });

  it("reads the dryRun flag from a job result", () => {
    expect(isDryRunResult({ dryRun: true, live: false })).toBe(true);
    expect(isDryRunResult({ dryRun: false })).toBe(false);
    expect(isDryRunResult(null)).toBe(false);
    expect(isDryRunResult("SUCCEEDED")).toBe(false);
  });
});
