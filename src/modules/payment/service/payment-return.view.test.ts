import { beforeEach, describe, expect, it, vi } from "vitest";

const findPaymentWithTravelPlanUser = vi.hoisted(() => vi.fn());

vi.mock("../repository/payment.repository", () => ({
  paymentRepository: {
    findPaymentWithTravelPlanUser,
  },
}));

import { paymentService } from "./payment.service";

function row(status: string, userId = "owner") {
  return {
    id: "pay_1",
    provider: "CLICK",
    status,
    travelPlanId: "plan_1",
    travelPlan: { id: "plan_1", userId },
  };
}

describe("paymentService.getReturnView", () => {
  beforeEach(() => {
    findPaymentWithTravelPlanUser.mockReset();
  });

  it("PENDING is pending, never captured", async () => {
    findPaymentWithTravelPlanUser.mockResolvedValue(row("PENDING"));
    await expect(paymentService.getReturnView("pay_1", "owner")).resolves.toEqual({
      outcome: "pending",
    });
  });

  it("SUCCESS is captured", async () => {
    findPaymentWithTravelPlanUser.mockResolvedValue(row("SUCCESS"));
    await expect(paymentService.getReturnView("pay_1", "owner")).resolves.toEqual({
      outcome: "captured",
    });
  });

  it("missing payment is not_found", async () => {
    findPaymentWithTravelPlanUser.mockResolvedValue(null);
    await expect(paymentService.getReturnView("nope", "owner")).resolves.toEqual({
      outcome: "not_found",
    });
  });

  it("another logged-in user does not see the payment", async () => {
    findPaymentWithTravelPlanUser.mockResolvedValue(row("SUCCESS", "owner"));
    await expect(paymentService.getReturnView("pay_1", "intruder")).resolves.toEqual({
      outcome: "not_found",
    });
  });

  it("anonymous caller may see coarse outcome without owner check", async () => {
    findPaymentWithTravelPlanUser.mockResolvedValue(row("SUCCESS", "owner"));
    await expect(paymentService.getReturnView("pay_1", null)).resolves.toEqual({
      outcome: "captured",
    });
  });
});
