/**
 * End of the host confirm path: an unpaid booking must be refused before any
 * status write, and check-in / check-out must stay usable.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const state = vi.hoisted(() => ({
  bookingStatus: "PENDING" as string,
  paid: false,
}));

const update = vi.hoisted(() => vi.fn(async () => ({ id: "hs1", status: "CONFIRMED" })));
const assertPaid = vi.hoisted(() => vi.fn(async () => {}));
const logStatus = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    homeStayBooking: {
      findFirst: vi.fn(async () => ({
        id: "hs1",
        status: state.bookingStatus,
        hostNote: null,
        travelPlanId: "tp1",
      })),
      update,
    },
  },
}));

vi.mock("../../_utils", () => ({
  requireHomeStayHost: async () => ({ id: "host1", role: "home_stay_partner" }),
  hasActiveListing: async () => true,
  onboardingResponse: () => NextResponse.json({ success: false }, { status: 409 }),
  ok: (data: unknown, status = 200) =>
    NextResponse.json({ success: true, data }, { status }),
  fail: (error: string, status: number) =>
    NextResponse.json({ success: false, error }, { status }),
  handleApiError: () =>
    NextResponse.json({ success: false, error: "Server error" }, { status: 500 }),
}));

vi.mock("@/lib/homestay/logBookingStatus", () => ({
  logBookingStatus: logStatus,
}));

vi.mock("@/src/modules/booking", async () => {
  const { UnpaidConfirmationError } = await import(
    "@/src/modules/booking/domain/booking.state"
  );
  return {
    UnpaidConfirmationError,
    bookingService: { assertHomestayPaymentRecorded: assertPaid },
  };
});

import { UnpaidConfirmationError } from "@/src/modules/booking/domain/booking.state";
import { PATCH } from "./route";

const params = { params: Promise.resolve({ id: "hs1" }) };

async function act(action: string) {
  const res = await PATCH(
    new Request("https://safartrip.uz/api/homestay/host/bookings/hs1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    }),
    params,
  );
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  vi.clearAllMocks();
  state.bookingStatus = "PENDING";
  state.paid = false;
  assertPaid.mockResolvedValue(undefined);
  update.mockResolvedValue({ id: "hs1", status: "CONFIRMED" });
});

describe("host confirm on an unpaid booking", () => {
  it("is refused, and nothing is written", async () => {
    assertPaid.mockRejectedValue(new UnpaidConfirmationError("PENDING", "CONFIRMED"));

    const res = await act("confirm");

    expect(res.status).toBe(400);
    expect(String(res.body.error)).toMatch(/To'lov qayd etilmagan/);
    expect(update).not.toHaveBeenCalled();
    expect(logStatus).not.toHaveBeenCalled();
  });
});

describe("host confirm once the guest has paid", () => {
  it("goes through", async () => {
    const res = await act("confirm");

    expect(res.status).toBe(200);
    expect(assertPaid).toHaveBeenCalledWith("hs1");
    expect(update).toHaveBeenCalledTimes(1);
  });
});

describe("the rest of the host actions are untouched", () => {
  it("check-in does not consult the payment guard", async () => {
    state.bookingStatus = "CONFIRMED";
    update.mockResolvedValue({ id: "hs1", status: "CHECKED_IN" });

    const res = await act("checkin");

    expect(res.status).toBe(200);
    expect(assertPaid).not.toHaveBeenCalled();
  });

  it("check-out does not consult the payment guard", async () => {
    state.bookingStatus = "CHECKED_IN";
    update.mockResolvedValue({ id: "hs1", status: "CHECKED_OUT" });

    const res = await act("checkout");

    expect(res.status).toBe(200);
    expect(assertPaid).not.toHaveBeenCalled();
  });

  it("still rejects an action from the wrong status", async () => {
    state.bookingStatus = "CHECKED_IN";

    const res = await act("confirm");

    expect(res.status).toBe(400);
    expect(assertPaid).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
