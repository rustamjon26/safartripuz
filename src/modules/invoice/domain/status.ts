import type { HotelInvoiceStatus } from "./types";

const TRANSITIONS: Record<HotelInvoiceStatus, HotelInvoiceStatus[]> = {
  DRAFT: ["ISSUED", "VOID"],
  ISSUED: ["SENT", "PAID", "VOID"],
  SENT: ["PAID", "VOID"],
  PAID: [],
  VOID: [],
};

export function canTransition(
  from: HotelInvoiceStatus,
  to: HotelInvoiceStatus,
): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export function assertInvoiceTransition(
  from: HotelInvoiceStatus,
  to: HotelInvoiceStatus,
): void {
  if (!canTransition(from, to)) {
    throw new InvoiceStatusError(
      `Illegal invoice status transition: ${from} → ${to}`,
    );
  }
}

export class InvoiceStatusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceStatusError";
  }
}
