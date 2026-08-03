import { describe, expect, it } from "vitest";
import { assertTaskTransition, canTaskTransition, StaffTaskStatusError } from "./task-status";

describe("staff task status", () => {
  it("allows pending → in progress → done", () => {
    expect(canTaskTransition("PENDING", "IN_PROGRESS")).toBe(true);
    expect(canTaskTransition("IN_PROGRESS", "DONE")).toBe(true);
  });

  it("blocks done → pending", () => {
    expect(canTaskTransition("DONE", "PENDING")).toBe(false);
    expect(() => assertTaskTransition("DONE", "PENDING")).toThrow(StaffTaskStatusError);
  });
});
