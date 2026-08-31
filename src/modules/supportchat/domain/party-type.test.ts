import { describe, expect, it } from "vitest";
import {
  isSupportAgentRole,
  partyTypeFromRole,
  partyTypeLabel,
} from "./party-type";

describe("partyTypeFromRole", () => {
  it("maps partner and customer roles", () => {
    expect(partyTypeFromRole("hotel_manager")).toBe("hotel");
    expect(partyTypeFromRole("home_stay_partner")).toBe("homestay");
    expect(partyTypeFromRole("taxi")).toBe("taxi");
    expect(partyTypeFromRole("taxi_partner")).toBe("taxi");
    expect(partyTypeFromRole("guide")).toBe("guide");
    expect(partyTypeFromRole("guide_partner")).toBe("guide");
    expect(partyTypeFromRole("user")).toBe("customer");
    expect(partyTypeFromRole("cleaner")).toBe("customer");
  });
});

describe("partyTypeLabel / isSupportAgentRole", () => {
  it("labels and detects agents", () => {
    expect(partyTypeLabel("hotel")).toBe("Mehmonxona");
    expect(isSupportAgentRole("support")).toBe(true);
    expect(isSupportAgentRole("user")).toBe(false);
  });
});
