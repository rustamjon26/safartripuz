import { Money } from "@/src/shared/money";

export type ComputedLine = {
  name: string;
  description?: string;
  quantity: number;
  unitPriceTiyin: bigint;
  lineTotalTiyin: bigint;
};

export type InvoiceTotals = {
  lines: ComputedLine[];
  subtotalTiyin: bigint;
  vatTiyin: bigint;
  totalTiyin: bigint;
};

/** Pure: som lines + vat bps → tiyin totals. */
export function computeInvoiceTotals(
  lines: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPriceSom: number;
  }>,
  vatRateBps: number,
): InvoiceTotals {
  if (vatRateBps < 0 || vatRateBps > 100_00) {
    throw new Error(`Invalid vatRateBps: ${vatRateBps}`);
  }
  const computed: ComputedLine[] = lines.map((l) => {
    if (!Number.isInteger(l.quantity) || l.quantity < 1) {
      throw new Error("quantity must be integer >= 1");
    }
    const unit = Money.fromSomNumber(l.unitPriceSom).toTiyin();
    const lineTotal = unit * BigInt(l.quantity);
    return {
      name: l.name,
      description: l.description,
      quantity: l.quantity,
      unitPriceTiyin: unit,
      lineTotalTiyin: lineTotal,
    };
  });
  const subtotalTiyin = computed.reduce((a, l) => a + l.lineTotalTiyin, 0n);
  const vatTiyin = (subtotalTiyin * BigInt(vatRateBps)) / 10_000n;
  return {
    lines: computed,
    subtotalTiyin,
    vatTiyin,
    totalTiyin: subtotalTiyin + vatTiyin,
  };
}

export function tiyinToSomNumber(t: bigint): number {
  return Money.fromTiyin(t).toSomNumber();
}
