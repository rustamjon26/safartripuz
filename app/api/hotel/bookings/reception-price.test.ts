/**
 * Reception bookings took their price straight from the request, so whatever
 * number reached the endpoint became the booking total — and from there the
 * ledger, the commission split and the partner payout.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const SERVER_TOTAL = 480_000;

const created = vi.hoisted(() =>
  vi.fn(async (_input: Record<string, unknown>) => ({ id: "bk1" })),
);
const quoteHotel = vi.hoisted(() =>
  vi.fn(async () => ({
    totalSom: SERVER_TOTAL,
    snapshot: { source: "rates-pipeline" },
  })),
);

vi.mock("@/lib/authz", () => ({
  requireRole: async () => ({ id: "recep1", role: "receptionist" }),
}));

vi.mock("@/lib/hotel", () => ({
  getApprovedHotelContextByUserId: async () => ({ hotel: { id: "h1" } }),
}));

vi.mock("@/lib/crypto", () => ({
  encrypt: (v: string) => v,
  decrypt: (v: string) => v,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    bookingRoomAssignment: { createMany: vi.fn(async () => ({})) },
    hotelBooking: {
      findUnique: vi.fn(async () => ({ id: "bk1", guests: [] })),
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
    },
  },
}));

vi.mock("@/src/modules/booking", () => ({
  bookingService: { createConfirmedHotelBooking: created },
}));

vi.mock("@/src/modules/inventory", () => ({
  InsufficientInventoryError: class extends Error {},
  InventoryLockError: class extends Error {},
}));

vi.mock("@/src/modules/rates", () => ({
  ratesService: { quoteHotel },
}));

import { POST } from "./route";

const BASE = {
  roomTypeId: "rt1",
  checkInDate: "2030-05-01T12:00:00.000Z",
  checkOutDate: "2030-05-03T12:00:00.000Z",
  roomCount: 1,
  source: "RECEPTION" as const,
};

async function post(body: Record<string, unknown>) {
  const res = await POST(
    new Request("https://safartrip.uz/api/hotel/bookings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...BASE, ...body }),
    }),
  );
  return {
    status: res.status,
    body: (await res.json()) as Record<string, unknown>,
  };
}

function bookedTotal(): number {
  const input = created.mock.calls[0]?.[0] as { totalAmount: number };
  return input.totalAmount;
}

beforeEach(() => {
  vi.clearAllMocks();
  quoteHotel.mockResolvedValue({
    totalSom: SERVER_TOTAL,
    snapshot: { source: "rates-pipeline" },
  });
  created.mockResolvedValue({ id: "bk1" });
});

describe("reception booking price", () => {
  it("rejects a submitted total that does not match the server quote", async () => {
    const res = await post({ totalAmount: 1 });

    expect(res.status).toBe(400);
    expect(res.body.submittedTotal).toBe(1);
    expect(res.body.serverTotal).toBe(SERVER_TOTAL);
    // Nothing is written with the client's number.
    expect(created).not.toHaveBeenCalled();
  });

  it("rejects an inflated total just the same", async () => {
    const res = await post({ totalAmount: SERVER_TOTAL * 10 });
    expect(res.status).toBe(400);
    expect(created).not.toHaveBeenCalled();
  });

  it("prices the booking itself when no total is submitted", async () => {
    const res = await post({});

    expect(res.status).toBe(200);
    expect(quoteHotel).toHaveBeenCalledWith(
      expect.objectContaining({ roomTypeId: "rt1", roomCount: 1 }),
    );
    expect(bookedTotal()).toBe(SERVER_TOTAL);
  });

  it("stores the server quote even when the client agreed with it", async () => {
    await post({ totalAmount: SERVER_TOTAL });

    expect(bookedTotal()).toBe(SERVER_TOTAL);
    const input = created.mock.calls[0]?.[0] as {
      pricingSnapshot?: Record<string, unknown>;
    };
    // The quote is kept for audit, so the price can be explained later.
    expect(input.pricingSnapshot).toEqual({ source: "rates-pipeline" });
  });

  it("tolerates sub-som rounding between client and server", async () => {
    const res = await post({ totalAmount: SERVER_TOTAL + 0.4 });
    expect(res.status).toBe(200);
    expect(bookedTotal()).toBe(SERVER_TOTAL);
  });

  it("refuses a paid amount larger than the real total", async () => {
    const res = await post({ paidAmount: SERVER_TOTAL * 2 });

    expect(res.status).toBe(400);
    expect(created).not.toHaveBeenCalled();
  });

  it("answers 400 when the room type cannot be priced", async () => {
    quoteHotel.mockRejectedValueOnce(new Error("RoomType not found: rt1"));

    const res = await post({});

    expect(res.status).toBe(400);
    expect(created).not.toHaveBeenCalled();
  });

  it("counts children separately when pricing occupancy", async () => {
    await post({
      guests: [
        { firstName: "Aziz", isChild: false },
        { firstName: "Ali", isChild: false },
        { firstName: "Laylo", isChild: true },
      ],
    });

    expect(quoteHotel).toHaveBeenCalledWith(
      expect.objectContaining({ adults: 2, children: 1 }),
    );
  });
});
