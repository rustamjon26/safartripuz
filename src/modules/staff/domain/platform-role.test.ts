import { describe, expect, it } from "vitest";
import {
  isHotelStaffPlatformRole,
  isProtectedPlatformRole,
  jobRoleToPlatformRole,
  platformRoleToJobRole,
} from "./platform-role";

describe("jobRoleToPlatformRole", () => {
  it("maps HotelStaff jobs to /staff gate roles", () => {
    expect(jobRoleToPlatformRole("CLEANER")).toBe("cleaner");
    expect(jobRoleToPlatformRole("RECEPTION")).toBe("receptionist");
    expect(jobRoleToPlatformRole("WAITER")).toBe("waiter");
    expect(jobRoleToPlatformRole("MANAGER")).toBe("hotel_staff");
  });
});

describe("platformRoleToJobRole", () => {
  it("maps staff platform roles back to HotelStaff jobs", () => {
    expect(platformRoleToJobRole("cleaner")).toBe("CLEANER");
    expect(platformRoleToJobRole("receptionist")).toBe("RECEPTION");
    expect(platformRoleToJobRole("waiter")).toBe("WAITER");
    expect(platformRoleToJobRole("hotel_staff")).toBe("MANAGER");
  });
});

describe("isHotelStaffPlatformRole", () => {
  it("detects frontline staff roles that need a hotel link", () => {
    expect(isHotelStaffPlatformRole("cleaner")).toBe(true);
    expect(isHotelStaffPlatformRole("hotel_manager")).toBe(false);
    expect(isHotelStaffPlatformRole("user")).toBe(false);
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
