import { describe, expect, it } from "vitest";
import {
  growthLabel,
  initialsFromName,
  staffRoleTitle,
} from "./staff-role-label";

describe("staffRoleTitle", () => {
  it("maps HotelStaff roles to Uzbek titles", () => {
    expect(staffRoleTitle("RECEPTION")).toBe("Retsepsionist");
    expect(staffRoleTitle("CLEANER")).toBe("Farrosh");
    expect(staffRoleTitle("MANAGER")).toBe("Menejer");
  });
});

describe("initialsFromName / growthLabel", () => {
  it("builds initials", () => {
    expect(initialsFromName("Jasur", "Alimov")).toBe("JA");
    expect(initialsFromName("Anvar", null)).toBe("A");
  });

  it("formats MoM growth", () => {
    expect(growthLabel(12, 10)).toBe("+20%");
    expect(growthLabel(8, 10)).toBe("-20%");
    expect(growthLabel(5, 0)).toBe("+100%");
  });
});
