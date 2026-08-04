import { describe, expect, it } from "vitest";
import {
  isProtectedPlatformRole,
  jobRoleToPlatformRole,
} from "./staffPlatformRole";

describe("jobRoleToPlatformRole", () => {
  it("maps HotelStaff jobs to /staff gate roles", () => {
    expect(jobRoleToPlatformRole("CLEANER")).toBe("cleaner");
    expect(jobRoleToPlatformRole("RECEPTION")).toBe("receptionist");
    expect(jobRoleToPlatformRole("WAITER")).toBe("waiter");
    expect(jobRoleToPlatformRole("MANAGER")).toBe("hotel_staff");
  });
});

describe("isProtectedPlatformRole", () => {
  it("protects owner/admin/support from HR remaps", () => {
    expect(isProtectedPlatformRole("hotel_manager")).toBe(true);
    expect(isProtectedPlatformRole("admin")).toBe(true);
    expect(isProtectedPlatformRole("support")).toBe(true);
    expect(isProtectedPlatformRole("cleaner")).toBe(false);
    expect(isProtectedPlatformRole("receptionist")).toBe(false);
  });
});
