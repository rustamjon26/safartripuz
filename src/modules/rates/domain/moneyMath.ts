/** BigInt helpers for rates pipeline. Rounding mode: FLOOR on divide. */

export function mulDivFloor(amount: bigint, numer: bigint, denom: bigint): bigint {
  if (denom === 0n) throw new Error("division by zero");
  return (amount * numer) / denom;
}

/** Apply basis points: 1000 bps = 10%. FLOOR. */
export function applyBpsFloor(amount: bigint, bps: bigint): bigint {
  return mulDivFloor(amount, bps, 10_000n);
}

export function clampNonNegative(n: bigint): bigint {
  return n < 0n ? 0n : n;
}

export function sumBigint(values: bigint[]): bigint {
  return values.reduce((a, b) => a + b, 0n);
}
