/** LedgerTransaction.type values used by posters. */
export const LedgerTxType = {
  BOOKING_PAYMENT: "BOOKING_PAYMENT",
  COMMISSION: "COMMISSION",
  REFUND: "REFUND",
  PARTIAL_REFUND: "PARTIAL_REFUND",
  PAYOUT: "PAYOUT",
  CHARGEBACK: "CHARGEBACK",
  CLAWBACK: "CLAWBACK",
} as const;

export type LedgerTxTypeName = (typeof LedgerTxType)[keyof typeof LedgerTxType];

export const UNATTRIBUTED_OWNER = {
  ownerType: "UNATTRIBUTED",
  ownerId: "",
} as const;
