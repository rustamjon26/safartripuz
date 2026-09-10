import { describe, expect, it } from "vitest";
import { paymentReturnOutcome } from "./payment-status";

describe("paymentReturnOutcome", () => {
  it("treats SUCCESS and PENDING_REVIEW as captured", () => {
    expect(paymentReturnOutcome("SUCCESS")).toBe("captured");
    expect(paymentReturnOutcome("PENDING_REVIEW")).toBe("captured");
  });

  it("treats INITIATED and PENDING as pending, not success", () => {
    expect(paymentReturnOutcome("PENDING")).toBe("pending");
    expect(paymentReturnOutcome("INITIATED")).toBe("pending");
  });

  it("treats FAILED and CANCELLED as failed", () => {
    expect(paymentReturnOutcome("FAILED")).toBe("failed");
    expect(paymentReturnOutcome("CANCELLED")).toBe("failed");
  });
});
