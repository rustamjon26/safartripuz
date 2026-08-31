import { describe, expect, it } from "vitest";
import {
  assertInboxTransition,
  canInboxTransition,
  ChannelInboxStatusError,
} from "./inbox-status";

describe("channel reservation inbox status", () => {
  it("received → mapped → booking_created", () => {
    expect(canInboxTransition("RECEIVED", "MAPPED")).toBe(true);
    expect(canInboxTransition("MAPPED", "BOOKING_CREATED")).toBe(true);
  });

  it("blocks booking_created → received", () => {
    expect(() =>
      assertInboxTransition("BOOKING_CREATED", "RECEIVED"),
    ).toThrow(ChannelInboxStatusError);
  });
});
