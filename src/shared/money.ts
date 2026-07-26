/**
 * Money value object — amounts as BigInt tiyin (1 som = 100 tiyin).
 * Prefer branded `Tiyin` in ledger/payment/pricing paths.
 * Som conversion helpers are intended for payment adapters (+ rates quote bridge).
 */

export type Tiyin = bigint & { readonly __brand: "tiyin" };

export function tiyin(n: bigint): Tiyin {
  if (n < 0n) throw new MoneyError("Tiyin amount must be >= 0");
  return n as Tiyin;
}

export function asTiyin(n: bigint): Tiyin {
  return tiyin(n);
}

/** Adapter / quote-boundary: major units (som) → tiyin. */
export function somToTiyin(som: number | string): Tiyin {
  return tiyin(Money.fromSomNumber(som).toTiyin());
}

/** Adapter / quote-boundary: tiyin → som number (2dp). */
export function tiyinToSom(t: Tiyin | bigint): number {
  return Money.fromTiyin(t).toSomNumber();
}

export class MoneyError extends Error {
  readonly code = "MONEY_ERROR" as const;
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

export class Money {
  private constructor(private readonly amount: Tiyin) {}

  static fromTiyin(value: bigint | number | string | Tiyin): Money {
    const v = typeof value === "bigint" ? value : BigInt(value);
    return new Money(tiyin(v));
  }

  /**
   * Convert som (UZS major units) to tiyin.
   * Accepts number or string with up to 2 decimal places; rejects unsafe float noise.
   */
  static fromSomNumber(som: number | string): Money {
    if (typeof som === "number") {
      if (!Number.isFinite(som) || som < 0) {
        throw new MoneyError(`Invalid som amount: ${som}`);
      }
      const raw = Math.round(som * 100);
      if (!Number.isSafeInteger(raw)) {
        throw new MoneyError(`Som amount out of safe integer range: ${som}`);
      }
      return new Money(tiyin(BigInt(raw)));
    }
    const s = som.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(s)) {
      throw new MoneyError(`Invalid som string: ${som}`);
    }
    const [whole, frac = ""] = s.split(".");
    const padded = (frac + "00").slice(0, 2);
    return new Money(tiyin(BigInt(whole) * 100n + BigInt(padded)));
  }

  toTiyin(): Tiyin {
    return this.amount;
  }

  /** Click / Decimal boundary — exact 2-decimal som as number. */
  toSomNumber(): number {
    const whole = this.amount / 100n;
    const frac = this.amount % 100n;
    return Number(whole) + Number(frac) / 100;
  }

  toSomString(): string {
    const whole = this.amount / 100n;
    const frac = this.amount % 100n;
    return `${whole}.${frac.toString().padStart(2, "0")}`;
  }

  equals(other: Money): boolean {
    return this.amount === other.amount;
  }

  add(other: Money): Money {
    return new Money(tiyin(this.amount + other.amount));
  }

  isZero(): boolean {
    return this.amount === 0n;
  }
}
