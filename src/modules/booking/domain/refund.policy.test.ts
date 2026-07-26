import { describe, expect, it } from "vitest";
import { computeRefund, type CancellationRuleSnapshot } from "./refund";

const MS_H = 3_600_000;
const MS_MIN = 60_000;

const flexible: CancellationRuleSnapshot[] = [
  { id: "f24", hoursBeforeCheckIn: 24, refundPercent: 100 },
  { id: "f0", hoursBeforeCheckIn: 0, refundPercent: 0 },
];
const moderate: CancellationRuleSnapshot[] = [
  { id: "m120", hoursBeforeCheckIn: 120, refundPercent: 100 },
  { id: "m0", hoursBeforeCheckIn: 0, refundPercent: 0 },
];
const strict: CancellationRuleSnapshot[] = [
  {
    id: "s100",
    hoursBeforeCheckIn: 0,
    refundPercent: 100,
    conditions: { maxHoursSinceBooking: 48, minHoursBeforeCheckIn: 336 },
  },
  { id: "s0", hoursBeforeCheckIn: 0, refundPercent: 0 },
];
const nr: CancellationRuleSnapshot[] = [
  { id: "nr0", hoursBeforeCheckIn: 0, refundPercent: 0 },
];

describe("refund.policy boundaries", () => {
  const bookedAt = new Date("2026-01-01T00:00:00.000Z");
  const gross = 100_000n;

  it("Flexible exactly 24h / −1 min / +1 min", () => {
    const checkInAt = new Date("2026-01-10T12:00:00.000Z");
    expect(
      computeRefund({
        checkInAt,
        bookedAt,
        cancelledAt: new Date(checkInAt.getTime() - 24 * MS_H),
        grossPaidTiyin: gross,
        policy: { rules: flexible },
      }).refundPercent,
    ).toBe(100);
    expect(
      computeRefund({
        checkInAt,
        bookedAt,
        cancelledAt: new Date(checkInAt.getTime() - 24 * MS_H + MS_MIN),
        grossPaidTiyin: gross,
        policy: { rules: flexible },
      }).refundPercent,
    ).toBe(0);
    expect(
      computeRefund({
        checkInAt,
        bookedAt,
        cancelledAt: new Date(checkInAt.getTime() - 24 * MS_H - MS_MIN),
        grossPaidTiyin: gross,
        policy: { rules: flexible },
      }).refundPercent,
    ).toBe(100);
  });

  it("Moderate 120h boundary", () => {
    const checkInAt = new Date("2026-02-01T00:00:00.000Z");
    expect(
      computeRefund({
        checkInAt,
        bookedAt,
        cancelledAt: new Date(checkInAt.getTime() - 120 * MS_H),
        grossPaidTiyin: gross,
        policy: { rules: moderate },
      }).refundPercent,
    ).toBe(100);
    expect(
      computeRefund({
        checkInAt,
        bookedAt,
        cancelledAt: new Date(checkInAt.getTime() - 120 * MS_H + MS_MIN),
        grossPaidTiyin: gross,
        policy: { rules: moderate },
      }).refundPercent,
    ).toBe(0);
  });

  it("Strict conditions and NR / after check-in", () => {
    const booked = new Date("2026-03-01T00:00:00.000Z");
    const cancelledAt = new Date(booked.getTime() + 24 * MS_H);
    const checkInAt = new Date(cancelledAt.getTime() + 336 * MS_H);
    expect(
      computeRefund({
        checkInAt,
        bookedAt: booked,
        cancelledAt,
        grossPaidTiyin: gross,
        policy: { rules: strict },
      }).refundPercent,
    ).toBe(100);

    expect(
      computeRefund({
        checkInAt: new Date("2026-06-01T00:00:00.000Z"),
        bookedAt,
        cancelledAt: new Date("2026-01-01T00:00:00.000Z"),
        grossPaidTiyin: gross,
        policy: { rules: nr },
      }).refundPercent,
    ).toBe(0);

    expect(
      computeRefund({
        checkInAt: new Date("2026-01-05T12:00:00.000Z"),
        bookedAt,
        cancelledAt: new Date("2026-01-05T13:00:00.000Z"),
        grossPaidTiyin: gross,
        policy: { rules: flexible },
      }).refundPercent,
    ).toBe(0);
  });
});
