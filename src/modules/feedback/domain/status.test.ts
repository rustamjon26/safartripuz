import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canTransition,
  FeedbackStatusError,
  statusAfterReply,
} from "./status";

describe("feedback status machine", () => {
  it("allows open → answered", () => {
    expect(canTransition("OPEN", "ANSWERED")).toBe(true);
    expect(() => assertTransition("OPEN", "ANSWERED")).not.toThrow();
  });

  it("blocks closed → answered", () => {
    expect(canTransition("CLOSED", "ANSWERED")).toBe(false);
    expect(() => assertTransition("CLOSED", "ANSWERED")).toThrow(
      FeedbackStatusError,
    );
  });

  it("statusAfterReply", () => {
    expect(statusAfterReply("OPEN")).toBe("ANSWERED");
    expect(statusAfterReply("ESCALATED")).toBe("ANSWERED");
    expect(() => statusAfterReply("CLOSED")).toThrow(FeedbackStatusError);
  });
});
