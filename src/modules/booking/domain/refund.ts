/**
 * Pure cancellation refund computation (tiyin / bigint only).
 *
 * Tie-break (documented):
 * 1. hoursRemaining = floor((checkInAt - cancelledAt) / 3_600_000) — may be negative after check-in
 * 2. hoursSinceBooking = floor((cancelledAt - bookedAt) / 3_600_000)
 * 3. Match rules where hoursRemaining >= rule.hoursBeforeCheckIn AND all conditions hold
 * 4. Among matches: highest hoursBeforeCheckIn, then highest refundPercent, then id asc
 * 5. If none match: prefer rule with hoursBeforeCheckIn === 0, else 0% refund
 * 6. After check-in (hoursRemaining < 0): force 0% unless a rule allows negative hours (none in seed)
 */

export type CancellationRuleConditions = {
  maxHoursSinceBooking?: number;
  minHoursBeforeCheckIn?: number;
};

export type CancellationRuleSnapshot = {
  id: string;
  hoursBeforeCheckIn: number;
  refundPercent: number;
  conditions?: CancellationRuleConditions | null;
};

export type ComputeRefundInput = {
  checkInAt: Date;
  bookedAt: Date;
  cancelledAt: Date;
  grossPaidTiyin: bigint;
  policy: { rules: CancellationRuleSnapshot[] };
};

export type RefundBreakdown = {
  refundPercent: number;
  refundTiyin: bigint;
  retainedTiyin: bigint;
  matchedRuleId: string | null;
  hoursBeforeCheckIn: number;
  hoursSinceBooking: number;
};

const MS_PER_HOUR = 3_600_000;

function floorHours(ms: number): number {
  return Math.floor(ms / MS_PER_HOUR);
}

function conditionsHold(
  rule: CancellationRuleSnapshot,
  hoursRemaining: number,
  hoursSinceBooking: number,
): boolean {
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

function ruleMatches(
  rule: CancellationRuleSnapshot,
  hoursRemaining: number,
  hoursSinceBooking: number,
): boolean {
  if (hoursRemaining < rule.hoursBeforeCheckIn) return false;
  return conditionsHold(rule, hoursRemaining, hoursSinceBooking);
}

function pickBest(rules: CancellationRuleSnapshot[]): CancellationRuleSnapshot | null {
  if (!rules.length) return null;
  return [...rules].sort((a, b) => {
    if (b.hoursBeforeCheckIn !== a.hoursBeforeCheckIn) {
      return b.hoursBeforeCheckIn - a.hoursBeforeCheckIn;
    }
    if (b.refundPercent !== a.refundPercent) {
      return b.refundPercent - a.refundPercent;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  })[0]!;
}

export function computeRefund(input: ComputeRefundInput): RefundBreakdown {
  const hoursBeforeCheckIn = floorHours(
    input.checkInAt.getTime() - input.cancelledAt.getTime(),
  );
  const hoursSinceBooking = floorHours(
    input.cancelledAt.getTime() - input.bookedAt.getTime(),
  );

  const gross = input.grossPaidTiyin < 0n ? 0n : input.grossPaidTiyin;
  const rules = input.policy.rules ?? [];

  // After check-in: force 0% unless a rule explicitly allows negative hoursRemaining.
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

/** Default Flexible rules when no policy snapshot is attached. */
export const DEFAULT_FLEXIBLE_RULES: CancellationRuleSnapshot[] = [
  { id: "default-flexible-24", hoursBeforeCheckIn: 24, refundPercent: 100 },
  { id: "default-flexible-0", hoursBeforeCheckIn: 0, refundPercent: 0 },
];
