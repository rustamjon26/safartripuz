import { describe, expect, it } from "vitest";
import { buildHotelFinanceAnalytics } from "./getHotelFinanceAnalytics";

describe("buildHotelFinanceAnalytics", () => {
  it("computes KPIs and payment history from real bookings (no demo constants)", () => {
    const now = new Date(2026, 7, 4, 15, 0, 0); // Aug 4 2026
    const result = buildHotelFinanceAnalytics({
      now,
      sellableRooms: 10,
      bookings: [
        {
          id: "b1",
          guestName: "Ali Valiyev",
          checkInDate: new Date(2026, 6, 20),
          checkOutDate: new Date(2026, 6, 22),
          roomCount: 1,
          totalAmount: 2_000_000,
          paidAmount: 2_000_000,
          status: "COMPLETED",
          roomType: { name: "Deluxe" },
          payments: [
            {
              id: "p1",
              amount: 2_000_000,
              method: "CASH",
              status: "COMPLETED",
              createdAt: new Date(2026, 7, 4, 14, 20, 0),
            },
          ],
        },
        {
          id: "b2",
          guestName: "Cancelled Guest",
          checkInDate: new Date(2026, 6, 21),
          checkOutDate: new Date(2026, 6, 23),
          roomCount: 1,
          totalAmount: 9_999_999,
          paidAmount: 0,
          status: "CANCELLED",
          roomType: { name: "Suite" },
          payments: [],
        },
      ],
    });

    expect(result.kpis[0]?.value).toBe(2_000_000);
    expect(result.kpis.some((k) => String(k.value).includes("452"))).toBe(false);
    expect(result.topRooms[0]?.name).toBe("Deluxe");
    expect(result.paymentHistory).toHaveLength(1);
    expect(result.paymentHistory[0]?.guest).toBe("Ali Valiyev");
    expect(result.paymentHistory[0]?.method).toBe("Naqd");
    expect(result.revenueSeries).toHaveLength(5);
  });

  it("returns zeros when there are no qualifying bookings", () => {
    const result = buildHotelFinanceAnalytics({
      sellableRooms: 5,
      bookings: [],
    });
    expect(result.kpis.every((k) => k.value === 0)).toBe(true);
    expect(result.topRooms).toEqual([]);
    expect(result.paymentHistory).toEqual([]);
  });
});
