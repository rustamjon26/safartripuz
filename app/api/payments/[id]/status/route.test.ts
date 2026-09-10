import { beforeEach, describe, expect, it, vi } from "vitest";

const getReturnView = vi.hoisted(() => vi.fn());
const getOptionalUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  getOptionalUser,
}));

vi.mock("@/src/modules/payment", () => ({
  paymentService: { getReturnView },
}));

import { GET } from "./route";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/payments/[id]/status", () => {
  beforeEach(() => {
    getReturnView.mockReset();
    getOptionalUser.mockReset();
    getOptionalUser.mockResolvedValue(null);
    getReturnView.mockResolvedValue({ outcome: "pending" });
  });

  it("returns pending for a PENDING payment", async () => {
    getReturnView.mockResolvedValue({ outcome: "pending" });
    const res = await GET(
      new Request("https://safartrip.uz/api/payments/pay_1/status"),
      ctx("pay_1"),
    );
    await expect(res.json()).resolves.toEqual({ outcome: "pending" });
  });

  it("returns captured for SUCCESS", async () => {
    getReturnView.mockResolvedValue({ outcome: "captured" });
    const res = await GET(new Request("https://safartrip.uz/api/payments/pay_1/status"), ctx("pay_1"));
    await expect(res.json()).resolves.toEqual({ outcome: "captured" });
  });

  it("returns not_found for a bogus id", async () => {
    getReturnView.mockResolvedValue({ outcome: "not_found" });
    const res = await GET(new Request("https://safartrip.uz/api/payments/nope/status"), ctx("nope"));
    await expect(res.json()).resolves.toEqual({ outcome: "not_found" });
  });

  it("passes the logged-in user into getReturnView so foreign payments stay not_found", async () => {
    getOptionalUser.mockResolvedValue({ id: "intruder", role: "user" });
    getReturnView.mockResolvedValue({ outcome: "not_found" });
    const res = await GET(new Request("https://safartrip.uz/api/payments/pay_1/status"), ctx("pay_1"));
    await expect(res.json()).resolves.toEqual({ outcome: "not_found" });
    expect(getReturnView).toHaveBeenCalledWith("pay_1", "intruder");
  });

  it("does not return amount or booking fields", async () => {
    getReturnView.mockResolvedValue({ outcome: "captured" });
    const body = await (
      await GET(new Request("https://safartrip.uz/api/payments/pay_1/status"), ctx("pay_1"))
    ).json();
    expect(body).toEqual({ outcome: "captured" });
    expect(body).not.toHaveProperty("amount");
    expect(body).not.toHaveProperty("travelPlan");
  });
});
