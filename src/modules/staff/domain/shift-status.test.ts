import { describe, expect, it } from "vitest";
import {
  assertShiftTransition,
  canShiftTransition,
  StaffShiftStatusError,
} from "./shift-status";

describe("staff shift status", () => {
  it("allows clock-in and complete", () => {
    expect(canShiftTransition("SCHEDULED", "ACTIVE")).toBe(true);
    expect(canShiftTransition("ACTIVE", "COMPLETED")).toBe(true);
  });

  it("blocks completed → active", () => {
    expect(canShiftTransition("COMPLETED", "ACTIVE")).toBe(false);
    expect(() => assertShiftTransition("COMPLETED", "ACTIVE")).toThrow(
      StaffShiftStatusError,
    );
  });
});
