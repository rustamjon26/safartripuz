import { describe, expect, it } from "vitest";
import {
  assertSyncTransition,
  canSyncTransition,
  ChannelSyncStatusError,
} from "./sync-status";

describe("channel sync job status", () => {
  it("queued → running → succeeded", () => {
    expect(canSyncTransition("QUEUED", "RUNNING")).toBe(true);
    expect(canSyncTransition("RUNNING", "SUCCEEDED")).toBe(true);
  });

  it("allows failed → queued retry", () => {
    expect(canSyncTransition("FAILED", "QUEUED")).toBe(true);
  });

  it("blocks succeeded → running", () => {
    expect(() => assertSyncTransition("SUCCEEDED", "RUNNING")).toThrow(
      ChannelSyncStatusError,
    );
  });
});
