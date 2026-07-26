export type LedgerLine = {
  amount: bigint; // tiyin > 0
  direction: "DEBIT" | "CREDIT";
};

export class UnbalancedLedgerError extends Error {
  readonly code = "UNBALANCED_LEDGER" as const;
  constructor(
    public readonly debitTotal: bigint,
    public readonly creditTotal: bigint,
  ) {
    super(`Ledger unbalanced: debit=${debitTotal} credit=${creditTotal}`);
    this.name = "UnbalancedLedgerError";
  }
}

export function assertBalanced(entries: LedgerLine[]): void {
  let debit = 0n;
  let credit = 0n;
  for (const e of entries) {
    if (e.amount <= 0n) {
      throw new Error("Ledger entry amount must be > 0 tiyin");
    }
    if (e.direction === "DEBIT") debit += e.amount;
    else credit += e.amount;
  }
  if (debit !== credit) {
    throw new UnbalancedLedgerError(debit, credit);
  }
}
