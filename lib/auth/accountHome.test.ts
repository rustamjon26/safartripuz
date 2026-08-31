import { describe, expect, it } from "vitest";
import {
  accountHomeForRole,
  isStaffPlatformRole,
  profileHomeForRole,
} from "./accountHome";

describe("accountHomeForRole", () => {
  it("sends admins to /admin", () => {
    expect(accountHomeForRole("super_admin")).toBe("/admin");
    expect(accountHomeForRole("admin")).toBe("/admin");
  });

  it("sends travellers to /profile", () => {
    expect(accountHomeForRole("user")).toBe("/profile");
    expect(accountHomeForRole(null)).toBe("/profile");
  });

  it("maps partner roles", () => {
    expect(accountHomeForRole("hotel_manager")).toBe("/hotel");
    expect(accountHomeForRole("taxi")).toBe("/taxi-partner");
    expect(accountHomeForRole("taxi_partner")).toBe("/taxi-partner");
    expect(accountHomeForRole("guide")).toBe("/guide-partner/dashboard");
  });
});

describe("profileHomeForRole", () => {
  it("keeps partners inside their portal for personal settings", () => {
    expect(profileHomeForRole("guide")).toBe("/guide-partner/profile");
    expect(profileHomeForRole("taxi")).toBe("/taxi-partner/profile");
    expect(profileHomeForRole("hotel_manager")).toBe("/hotel/settings");
    expect(profileHomeForRole("user")).toBe("/profile");
  });
});

describe("isStaffPlatformRole", () => {
  it("detects elevated roles", () => {
    expect(isStaffPlatformRole("super_admin")).toBe(true);
    expect(isStaffPlatformRole("user")).toBe(false);
  });
});
