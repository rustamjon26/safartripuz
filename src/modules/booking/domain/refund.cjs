"use strict";

const MS_PER_HOUR = 3_600_000;

function floorHours(ms) {
  return Math.floor(ms / MS_PER_HOUR);
}

function conditionsHold(rule, hoursRemaining, hoursSinceBooking) {
  const c = rule.conditions;
  if (!c) return true;
  if (
    typeof c.maxHoursSinceBooking === "number" &&
    hoursSinceBooking > c.maxHoursSinceBooking
  ) {
    return false;
  }
  if (
    typeof c.minHoursBeforeCheckIn === "number" &&
    hoursRemaining < c.minHoursBeforeCheckIn
  ) {
    return false;
  }
  return true;
}

function ruleMatches(rule, hoursRemaining, hoursSinceBooking) {
  if (hoursRemaining < rule.hoursBeforeCheckIn) return false;
  return conditionsHold(rule, hoursRemaining, hoursSinceBooking);
}

function pickBest(rules) {
  if (!rules.length) return null;
  return [...rules].sort((a, b) => {
    if (b.hoursBeforeCheckIn !== a.hoursBeforeCheckIn) {
      return b.hoursBeforeCheckIn - a.hoursBeforeCheckIn;
    }
    if (b.refundPercent !== a.refundPercent) {
      return b.refundPercent - a.refundPercent;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  })[0];
}

function computeRefund(input) {
  const hoursBeforeCheckIn = floorHours(
    input.checkInAt.getTime() - input.cancelledAt.getTime(),
  );
  const hoursSinceBooking = floorHours(
    input.cancelledAt.getTime() - input.bookedAt.getTime(),
  );

  const gross = input.grossPaidTiyin < 0n ? 0n : input.grossPaidTiyin;
  const rules = input.policy.rules ?? [];

  if (hoursBeforeCheckIn < 0) {
    const negativeOk = rules.filter(
      (r) =>
        r.hoursBeforeCheckIn < 0 &&
        ruleMatches(r, hoursBeforeCheckIn, hoursSinceBooking),
    );
    const matched = pickBest(negativeOk);
    if (!matched) {
      return {
        refundPercent: 0,
        refundTiyin: 0n,
        retainedTiyin: gross,
        matchedRuleId: null,
        hoursBeforeCheckIn,
        hoursSinceBooking,
      };
    }
    const refundTiyin = (gross * BigInt(matched.refundPercent)) / 100n;
    return {
      refundPercent: matched.refundPercent,
      refundTiyin,
      retainedTiyin: gross - refundTiyin,
      matchedRuleId: matched.id,
      hoursBeforeCheckIn,
      hoursSinceBooking,
    };
  }

  const matching = rules.filter((r) =>
    ruleMatches(r, hoursBeforeCheckIn, hoursSinceBooking),
  );
  let matched = pickBest(matching);

  if (!matched) {
    const zeroHour = rules.filter((r) => r.hoursBeforeCheckIn === 0);
    matched = pickBest(zeroHour);
  }

  if (!matched) {
    return {
      refundPercent: 0,
      refundTiyin: 0n,
      retainedTiyin: gross,
      matchedRuleId: null,
      hoursBeforeCheckIn,
      hoursSinceBooking,
    };
  }

  const pct = Math.max(0, Math.min(100, matched.refundPercent));
  const refundTiyin = (gross * BigInt(pct)) / 100n;
  return {
    refundPercent: pct,
    refundTiyin,
    retainedTiyin: gross - refundTiyin,
    matchedRuleId: matched.id,
    hoursBeforeCheckIn,
    hoursSinceBooking,
  };
}

const DEFAULT_FLEXIBLE_RULES = [
  { id: "default-flexible-24", hoursBeforeCheckIn: 24, refundPercent: 100 },
  { id: "default-flexible-0", hoursBeforeCheckIn: 0, refundPercent: 0 },
];

module.exports = {
  computeRefund,
  DEFAULT_FLEXIBLE_RULES,
};
