/**
 * Partner routes used to cast request bodies with `as`, so a malformed body
 * either reached Prisma as undefined or crashed into the 500 handler. Each of
 * these must answer 400 and write nothing.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const db = vi.hoisted(() => ({
  taxiOrderFindFirst: vi.fn(async () => ({ id: "o1", status: "PENDING" })),
  guideBookingFindFirst: vi.fn(async () => ({
    id: "gb1",
    status: "PENDING",
    listingId: "gl1",
    listing: { id: "gl1", meetingPoint: "Registon" },
  })),
  homestayListingCreate: vi.fn(async () => ({ id: "hl1" })),
  guestFeedbackCreate: vi.fn(async () => ({
    id: "fb1",
    guestName: "X",
    rating: 5,
    comment: null,
    createdAt: new Date(),
  })),
  transaction: vi.fn(async () => ({})),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    taxiOrder: { findFirst: db.taxiOrderFindFirst, update: vi.fn() },
    taxiOrderLog: { create: vi.fn() },
    guideBooking: { findFirst: db.guideBookingFindFirst, update: vi.fn() },
    homeStayListing: { create: db.homestayListingCreate },
    guestFeedback: { create: db.guestFeedbackCreate, findMany: vi.fn(async () => []) },
    hotelBooking: { findMany: vi.fn(async () => []) },
    $transaction: db.transaction,
  },
}));

vi.mock("@/lib/authz", () => ({
  requireUser: async () => ({ id: "u1", role: "user" }),
  requireRole: async () => ({ id: "hm1", role: "hotel_manager" }),
}));

vi.mock("@/lib/socket", () => ({ emitToOrder: vi.fn() }));

vi.mock("@/src/modules/outbox", () => ({
  outboxService: { enqueueInTx: vi.fn() },
  OutboxEventType: { PUSH_DRIVER_ORDER_CANCELLED: "PUSH_DRIVER_ORDER_CANCELLED" },
}));

vi.mock("@/lib/hotel", () => ({
  getApprovedHotelContextByUserId: async () => ({
    hotel: { id: "h1", name: "Test Hotel" },
  }),
}));

vi.mock("@/src/modules/feedback", () => ({
  feedbackService: { ingestSafe: vi.fn() },
}));

vi.mock("@/src/modules/booking", () => ({
  bookingService: { cancelGuideWithPolicy: vi.fn() },
}));

function partnerUtils() {
  return {
    requireGuidePartner: async () => ({ id: "g1", role: "guide" }),
    requireHomeStayHost: async () => ({ id: "h1", role: "home_stay_partner" }),
    hasActiveListing: async () => true,
    onboardingResponse: () =>
      NextResponse.json({ success: false }, { status: 409 }),
    ok: (data: unknown, status = 200) =>
      NextResponse.json({ success: true, data }, { status }),
    fail: (error: string, status: number) =>
      NextResponse.json({ success: false, error }, { status }),
    handleApiError: () =>
      NextResponse.json({ success: false, error: "Server error" }, { status: 500 }),
    writeAuditLog: vi.fn(),
    writeGuideBookingLog: vi.fn(),
  };
}

vi.mock("@/app/api/guide/partner/_utils", () => partnerUtils());
vi.mock("@/app/api/homestay/host/_utils", () => partnerUtils());
vi.mock("@/app/api/_utils", () => partnerUtils());
vi.mock("../_utils", () => partnerUtils());

import { PATCH as taxiOrderPatch } from "./taxi/orders/[id]/route";
import { PATCH as guideBookingPatch } from "./guide/partner/bookings/[id]/route";
import { POST as homestayListingPost } from "./homestay/host/listings/route";
import { POST as hotelMarketingPost } from "./hotel/marketing/route";

function jsonRequest(body: unknown, raw?: string) {
  return new Request("https://safartrip.uz/api/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ id: "x1" }) };

const VALID_LISTING = {
  title: "Uy",
  description: "Yaxshi uy",
  address: "Ko'cha 1",
  city: "Samarqand",
  region: "Samarqand",
  latitude: 39.6,
  longitude: 66.9,
  pricePerNight: 300000,
  maxGuests: 4,
  rooms: 2,
  beds: 3,
  bathrooms: 1,
  amenities: ["wifi"],
  images: ["https://x/1.jpg"],
};

beforeEach(() => {
  vi.clearAllMocks();
  db.taxiOrderFindFirst.mockResolvedValue({ id: "o1", status: "PENDING" });
  db.guideBookingFindFirst.mockResolvedValue({
    id: "gb1",
    status: "PENDING",
    listingId: "gl1",
    listing: { id: "gl1", meetingPoint: "Registon" },
  });
});

describe("PATCH /api/taxi/orders/[id]", () => {
  it("rejects a wrong-typed cancellationReason", async () => {
    const res = await taxiOrderPatch(
      jsonRequest({ cancellationReason: 12345 }),
      params,
    );
    expect(res.status).toBe(400);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("rejects an unparseable body instead of throwing a 500", async () => {
    const res = await taxiOrderPatch(jsonRequest(null, "{not json"), params);
    expect(res.status).toBe(400);
  });

  it("accepts a valid body", async () => {
    const res = await taxiOrderPatch(
      jsonRequest({ cancellationReason: "Fikrimdan qaytdim" }),
      params,
    );
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/guide/partner/bookings/[id]", () => {
  it("rejects an unknown status instead of crashing on the transition table", async () => {
    const res = await guideBookingPatch(
      jsonRequest({ status: "NOT_A_STATUS" }),
      params,
    );
    expect(res.status).toBe(400);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("rejects a wrong-typed meetingPoint", async () => {
    const res = await guideBookingPatch(
      jsonRequest({ status: "CONFIRMED", meetingPoint: { a: 1 } }),
      params,
    );
    expect(res.status).toBe(400);
  });

  it("rejects an unparseable body", async () => {
    const res = await guideBookingPatch(jsonRequest(null, "]["), params);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/homestay/host/listings", () => {
  it("rejects a missing required field", async () => {
    const { title: _omitted, ...withoutTitle } = VALID_LISTING;
    const res = await homestayListingPost(jsonRequest(withoutTitle));
    expect(res.status).toBe(400);
    expect(db.homestayListingCreate).not.toHaveBeenCalled();
  });

  it("rejects a wrong-typed number field", async () => {
    const res = await homestayListingPost(
      jsonRequest({ ...VALID_LISTING, pricePerNight: "300000" }),
    );
    expect(res.status).toBe(400);
    expect(db.homestayListingCreate).not.toHaveBeenCalled();
  });

  it("still explains that the location is required", async () => {
    const { latitude: _lat, ...withoutLat } = VALID_LISTING;
    const res = await homestayListingPost(jsonRequest(withoutLat));
    const body = (await res.json()) as { error?: string };
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Lokatsiya majburiy/);
  });

  it("rejects amenities that are not an array", async () => {
    const res = await homestayListingPost(
      jsonRequest({ ...VALID_LISTING, amenities: "wifi" }),
    );
    expect(res.status).toBe(400);
  });

  it("accepts a valid listing", async () => {
    const res = await homestayListingPost(jsonRequest(VALID_LISTING));
    expect(res.status).toBe(201);
    expect(db.homestayListingCreate).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/hotel/marketing", () => {
  it("rejects a missing rating", async () => {
    const res = await hotelMarketingPost(jsonRequest({ guestName: "A" }));
    expect(res.status).toBe(400);
    expect(db.guestFeedbackCreate).not.toHaveBeenCalled();
  });

  it("rejects an out-of-range rating", async () => {
    const res = await hotelMarketingPost(jsonRequest({ rating: 9 }));
    expect(res.status).toBe(400);
  });

  it("rejects a wrong-typed comment", async () => {
    const res = await hotelMarketingPost(
      jsonRequest({ rating: 5, comment: ["nope"] }),
    );
    expect(res.status).toBe(400);
    expect(db.guestFeedbackCreate).not.toHaveBeenCalled();
  });

  it("rejects an unparseable body", async () => {
    const res = await hotelMarketingPost(jsonRequest(null, "oops"));
    expect(res.status).toBe(400);
  });

  it("accepts a rating sent as a string, as the form does", async () => {
    const res = await hotelMarketingPost(
      jsonRequest({ rating: "5", guestName: "Aziz" }),
    );
    expect(res.status).toBe(201);
    expect(db.guestFeedbackCreate).toHaveBeenCalledTimes(1);
  });
});
