import { describe, expect, it } from "vitest";
import { accountHomeForRole, isStaffPlatformRole } from "./accountHome";

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
  });
});

describe("isStaffPlatformRole", () => {
  it("detects elevated roles", () => {
    expect(isStaffPlatformRole("super_admin")).toBe(true);
    expect(isStaffPlatformRole("user")).toBe(false);
  });
});
