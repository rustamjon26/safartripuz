import { describe, expect, it } from "vitest";
import { normalizeHotelNavRole } from "./nav-role";

describe("normalizeHotelNavRole", () => {
  it("maps HotelStaff uppercase jobs onto nav keys", () => {
    expect(normalizeHotelNavRole("CLEANER", "hotel_manager")).toBe("cleaner");
    expect(normalizeHotelNavRole("RECEPTION", "receptionist")).toBe(
      "receptionist",
    );
    expect(normalizeHotelNavRole("WAITER", null)).toBe("waiter");
    expect(normalizeHotelNavRole("MANAGER", "user")).toBe("hotel_manager");
  });

  it("falls back to platform User.role when no staff row", () => {
    expect(normalizeHotelNavRole(undefined, "hotel_manager")).toBe(
      "hotel_manager",
    );
    expect(normalizeHotelNavRole(null, "receptionist")).toBe("receptionist");
  });

  it("normalizes role-sim uppercase values on user.role", () => {
    expect(normalizeHotelNavRole(undefined, "CLEANER")).toBe("cleaner");
    expect(normalizeHotelNavRole(undefined, "RECEPTION")).toBe("receptionist");
    expect(normalizeHotelNavRole(undefined, "WAITER")).toBe("waiter");
  });
});
