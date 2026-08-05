import type { Prisma } from "@prisma/client";
import { Money } from "@/src/shared/money";
import { LedgerTxType } from "@/src/modules/ledger";

// TODO(taxi): DriverEarning ↔ ledger needs the same reconcile treatment later.

/** Legacy rows without a stamped payoutOwnerType (should be rare after migration default). */
export const LEGACY_UNCLASSIFIED_PAYOUT_NOTE =
  "LEGACY_UNCLASSIFIED_PAYOUT_OWNER: booking has no payoutOwnerType; " +
  "cannot distinguish platform-owned from missing PartnerEarning — set PLATFORM or PARTNER.";

export type ReconcileCheck =
  | "MISSING_PARTNER_EARNING"
  | "DUPLICATE_PARTNER_EARNING"
  | "SUM_MISMATCH"
  | "REVERSAL_INCOMPLETE"
  | "ORPHAN_ENTRY"
  | "POLICY";

export type ReconcileFinding = {
  check: ReconcileCheck;
  bookingId: string;
  bookingType?: string;
  expected?: string;
  actual?: string;
  deltaTiyin?: string;
  detail?: string;
};

export type ReconcileReport = {
  since: string | null;
  generatedAt: string;
  policyNotes: string[];
  findings: ReconcileFinding[];
  counts: Record<ReconcileCheck, number>;
  clean: boolean;
};

export type ReconcilePayoutOwnerType = "PLATFORM" | "PARTNER";

export type ReconcileBookingRow = {
  id: string;
  bookingType: "HOTEL" | "HOMESTAY" | "GUIDE";
  status: string;
  /** Gross in tiyin (from booking total). */
  grossTiyin: bigint;
  createdAt: Date;
  /**
   * Stamped payout routing. null = unclassified legacy (POLICY only).
   * PLATFORM = PE not expected; PARTNER = PE required after successful payment.
   */
  payoutOwnerType: ReconcilePayoutOwnerType | null;
};

export type ReconcilePartnerEarningRow = {
  id: string;
  bookingType: "HOTEL" | "HOMESTAY" | "GUIDE" | "TAXI";
  bookingId: string;
  status: string;
  grossTiyin: bigint;
  commissionFeeTiyin: bigint;
  netTiyin: bigint;
  createdAt: Date;
};

export type ReconcileLedgerEntryRow = {
  amount: bigint;
  direction: "DEBIT" | "CREDIT";
  accountType: string;
  ownerType: string;
};

export type ReconcileLedgerTxRow = {
  id: string;
  bookingId: string | null;
  type: string;
  createdAt: Date;
  entries: ReconcileLedgerEntryRow[];
};

export type ReconcileInput = {
  since: Date | null;
  bookings: ReconcileBookingRow[];
  partnerEarnings: ReconcilePartnerEarningRow[];
  ledgerTxs: ReconcileLedgerTxRow[];
  /** All known booking ids across hotel/homestay/guide (+ optional legacy). */
  knownBookingIds: Set<string>;
};

const PAID_LIKE = new Set([
  "PAID",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "COMPLETED",
]);

const PAYMENT_TX = new Set<string>([LedgerTxType.BOOKING_PAYMENT]);
const REVERSAL_TX = new Set<string>([
  LedgerTxType.REFUND,
  LedgerTxType.PARTIAL_REFUND,
  LedgerTxType.CLAWBACK,
]);

function emptyCounts(): Record<ReconcileCheck, number> {
  return {
    MISSING_PARTNER_EARNING: 0,
    DUPLICATE_PARTNER_EARNING: 0,
    SUM_MISMATCH: 0,
    REVERSAL_INCOMPLETE: 0,
    ORPHAN_ENTRY: 0,
    POLICY: 0,
  };
}

function somDecimalToTiyin(value: { toString(): string }): bigint {
  return Money.fromSomNumber(value.toString()).toTiyin();
}

/**
 * Pure reconcile: Ledger ↔ PartnerEarning drift detection.
 * No I/O. Taxi/DriverEarning intentionally excluded.
 */
export function reconcileLedgerPartnerEarnings(
  input: ReconcileInput,
): ReconcileReport {
  const findings: ReconcileFinding[] = [];
  const policyNotes: string[] = [];

  const peByBookingId = new Map<string, ReconcilePartnerEarningRow[]>();
  for (const pe of input.partnerEarnings) {
    if (pe.bookingType === "TAXI") continue;
    const list = peByBookingId.get(pe.bookingId) ?? [];
    list.push(pe);
    peByBookingId.set(pe.bookingId, list);
  }

  const paymentTxByBooking = new Map<string, ReconcileLedgerTxRow[]>();
  const reversalTxByBooking = new Map<string, ReconcileLedgerTxRow[]>();
  for (const tx of input.ledgerTxs) {
    if (!tx.bookingId) continue;
    if (PAYMENT_TX.has(tx.type)) {
      const list = paymentTxByBooking.get(tx.bookingId) ?? [];
      list.push(tx);
      paymentTxByBooking.set(tx.bookingId, list);
    }
    if (REVERSAL_TX.has(tx.type)) {
      const list = reversalTxByBooking.get(tx.bookingId) ?? [];
      list.push(tx);
      reversalTxByBooking.set(tx.bookingId, list);
    }
  }

  const bookingById = new Map(input.bookings.map((b) => [b.id, b]));

  // --- 1. Missing PartnerEarning after successful payment ---
  for (const booking of input.bookings) {
    const hasPaymentTx = (paymentTxByBooking.get(booking.id) ?? []).length > 0;
    const paidLike = PAID_LIKE.has(booking.status);
    if (!hasPaymentTx && !paidLike) continue;

    if (booking.payoutOwnerType === "PLATFORM") {
      continue;
    }

    if (booking.payoutOwnerType == null) {
      findings.push({
        check: "POLICY",
        bookingId: booking.id,
        bookingType: booking.bookingType,
        detail: LEGACY_UNCLASSIFIED_PAYOUT_NOTE,
      });
      if (!policyNotes.includes(LEGACY_UNCLASSIFIED_PAYOUT_NOTE)) {
        policyNotes.push(LEGACY_UNCLASSIFIED_PAYOUT_NOTE);
      }
      // Still flag missing PE — unclassified must not silent-pass.
    }

    const pes = peByBookingId.get(booking.id) ?? [];
    const typed = pes.filter((p) => p.bookingType === booking.bookingType);
    if (typed.length === 0) {
      findings.push({
        check: "MISSING_PARTNER_EARNING",
        bookingId: booking.id,
        bookingType: booking.bookingType,
        expected: "PartnerEarning row",
        actual: "none",
        detail: hasPaymentTx
          ? "BOOKING_PAYMENT ledger exists without PartnerEarning"
          : `status=${booking.status} without PartnerEarning`,
      });
    }
  }

  // Also: ledger BOOKING_PAYMENT for unknown booking types still needs PE
  for (const [bookingId, txs] of paymentTxByBooking) {
    if (bookingById.has(bookingId)) continue;
    const pes = (peByBookingId.get(bookingId) ?? []).filter(
      (p) => p.bookingType !== "TAXI",
    );
    if (pes.length === 0) {
      findings.push({
        check: "MISSING_PARTNER_EARNING",
        bookingId,
        expected: "PartnerEarning row",
        actual: "none",
        detail: `BOOKING_PAYMENT tx ${txs[0]?.id} with no PE (booking row may be missing)`,
      });
    }
  }

  // --- 2. Duplicate PartnerEarning for same bookingId ---
  for (const [bookingId, rows] of peByBookingId) {
    if (rows.length <= 1) continue;
    findings.push({
      check: "DUPLICATE_PARTNER_EARNING",
      bookingId,
      expected: "1 PartnerEarning",
      actual: `${rows.length} rows (${rows.map((r) => `${r.bookingType}:${r.id}`).join(", ")})`,
      detail:
        "Multiple PartnerEarning rows share bookingId (retry/idempotency failure shape)",
    });
  }

  // --- 3. Sum mismatch (non-reversed) ---
  for (const booking of input.bookings) {
    if (booking.payoutOwnerType === "PLATFORM") continue;

    const reversals = reversalTxByBooking.get(booking.id) ?? [];
    const pes = (peByBookingId.get(booking.id) ?? []).filter(
      (p) => p.bookingType === booking.bookingType,
    );
    if (pes.length !== 1) continue;
    const pe = pes[0];
    if (!pe || pe.status === "CANCELLED") continue;
    if (reversals.length > 0) continue;

    const payments = paymentTxByBooking.get(booking.id) ?? [];
    if (payments.length === 0) continue;

    let platformCredit = 0n;
    let partnerCredit = 0n;
    let clearingDebit = 0n;
    for (const tx of payments) {
      for (const e of tx.entries) {
        if (e.direction === "CREDIT" && e.accountType === "REVENUE") {
          platformCredit += e.amount;
        }
        if (
          e.direction === "CREDIT" &&
          e.accountType === "LIABILITY" &&
          (e.ownerType === "PARTNER" || e.ownerType === "UNATTRIBUTED")
        ) {
          partnerCredit += e.amount;
        }
        if (e.direction === "DEBIT" && e.accountType === "ASSET") {
          clearingDebit += e.amount;
        }
      }
    }

    const peParts = pe.commissionFeeTiyin + pe.netTiyin;
    if (peParts !== pe.grossTiyin) {
      findings.push({
        check: "SUM_MISMATCH",
        bookingId: booking.id,
        bookingType: booking.bookingType,
        expected: `fee+net=${pe.grossTiyin.toString()}`,
        actual: peParts.toString(),
        deltaTiyin: (peParts - pe.grossTiyin).toString(),
        detail: "PartnerEarning fee+net != gross",
      });
    }

    const ledgerSum = platformCredit + partnerCredit;
    if (clearingDebit > 0n && ledgerSum !== clearingDebit) {
      findings.push({
        check: "SUM_MISMATCH",
        bookingId: booking.id,
        bookingType: booking.bookingType,
        expected: `platform+partner=${clearingDebit.toString()}`,
        actual: ledgerSum.toString(),
        deltaTiyin: (ledgerSum - clearingDebit).toString(),
        detail: "Ledger platform+partner credits != clearing debit (gross)",
      });
    }

    if (clearingDebit > 0n && pe.grossTiyin !== clearingDebit) {
      findings.push({
        check: "SUM_MISMATCH",
        bookingId: booking.id,
        bookingType: booking.bookingType,
        expected: `PE.gross=${clearingDebit.toString()}`,
        actual: pe.grossTiyin.toString(),
        deltaTiyin: (pe.grossTiyin - clearingDebit).toString(),
        detail: "PartnerEarning.gross != ledger BOOKING_PAYMENT gross",
      });
    }

    if (platformCredit > 0n && pe.commissionFeeTiyin !== platformCredit) {
      findings.push({
        check: "SUM_MISMATCH",
        bookingId: booking.id,
        bookingType: booking.bookingType,
        expected: `platform=${platformCredit.toString()}`,
        actual: pe.commissionFeeTiyin.toString(),
        deltaTiyin: (pe.commissionFeeTiyin - platformCredit).toString(),
        detail: "PartnerEarning.commissionFee != ledger platform revenue credit",
      });
    }

    if (partnerCredit > 0n && pe.netTiyin !== partnerCredit) {
      findings.push({
        check: "SUM_MISMATCH",
        bookingId: booking.id,
        bookingType: booking.bookingType,
        expected: `partner=${partnerCredit.toString()}`,
        actual: pe.netTiyin.toString(),
        deltaTiyin: (pe.netTiyin - partnerCredit).toString(),
        detail: "PartnerEarning.net != ledger partner payable credit",
      });
    }
  }

  // --- 4. Reversal completeness ---
  for (const [bookingId, reversals] of reversalTxByBooking) {
    if (reversals.length === 0) continue;
    const booking = bookingById.get(bookingId);
    if (booking?.payoutOwnerType === "PLATFORM") continue;

    const pes = peByBookingId.get(bookingId) ?? [];
    if (pes.length === 0) {
      findings.push({
        check: "REVERSAL_INCOMPLETE",
        bookingId,
        expected: "PartnerEarning CANCELLED or reduced",
        actual: "no PartnerEarning",
        detail: `Ledger reversal(s) ${reversals.map((r) => r.type).join(",")} without PE`,
      });
      continue;
    }
    const active = pes.filter((p) => p.status !== "CANCELLED");
    // Full reverse → PE CANCELLED. Partial → amounts shrink but stay PENDING/PAID.
    const hasFullRefund = reversals.some((r) => r.type === LedgerTxType.REFUND);
    if (hasFullRefund && active.length > 0) {
      findings.push({
        check: "REVERSAL_INCOMPLETE",
        bookingId,
        bookingType: active[0]?.bookingType,
        expected: "PartnerEarning status=CANCELLED",
        actual: active.map((p) => p.status).join(","),
        detail: "Ledger REFUND exists but PartnerEarning not CANCELLED",
      });
    }
  }

  for (const [bookingId, pes] of peByBookingId) {
    const cancelled = pes.filter((p) => p.status === "CANCELLED");
    if (cancelled.length === 0) continue;
    const reversals = reversalTxByBooking.get(bookingId) ?? [];
    if (reversals.length === 0) {
      findings.push({
        check: "REVERSAL_INCOMPLETE",
        bookingId,
        bookingType: cancelled[0]?.bookingType,
        expected: "Ledger REFUND/PARTIAL_REFUND/CLAWBACK",
        actual: "none",
        detail: "PartnerEarning CANCELLED without ledger reversal",
      });
    }
  }

  // --- 5. Orphans ---
  for (const pe of input.partnerEarnings) {
    if (pe.bookingType === "TAXI") continue;
    if (!input.knownBookingIds.has(pe.bookingId)) {
      findings.push({
        check: "ORPHAN_ENTRY",
        bookingId: pe.bookingId,
        bookingType: pe.bookingType,
        expected: "booking row",
        actual: `PartnerEarning ${pe.id} only`,
        detail: "PartnerEarning references missing booking",
      });
    }
  }
  for (const tx of input.ledgerTxs) {
    if (!tx.bookingId) continue;
    if (!input.knownBookingIds.has(tx.bookingId)) {
      findings.push({
        check: "ORPHAN_ENTRY",
        bookingId: tx.bookingId,
        expected: "booking row",
        actual: `LedgerTransaction ${tx.id} (${tx.type})`,
        detail: "Ledger transaction references missing booking",
      });
    }
  }

  const counts = emptyCounts();
  for (const f of findings) {
    counts[f.check] += 1;
  }

  // POLICY (legacy unclassified) alone does not fail the run
  const driftFindings = findings.filter((f) => f.check !== "POLICY");

  return {
    since: input.since ? input.since.toISOString().slice(0, 10) : null,
    generatedAt: new Date().toISOString(),
    policyNotes,
    findings,
    counts,
    clean: driftFindings.length === 0,
  };
}

type DbClient = Pick<
  Prisma.TransactionClient,
  | "hotelBooking"
  | "homeStayBooking"
  | "guideBooking"
  | "booking"
  | "partnerEarning"
  | "ledgerTransaction"
>;

/**
 * Load read-only snapshot for reconcile.
 * Uses findMany only — never create/update/delete.
 */
export async function loadReconcileInput(
  client: DbClient,
  since: Date | null,
): Promise<ReconcileInput> {
  const createdFilter = since ? { gte: since } : undefined;

  const [hotels, homestays, guides, legacy, earnings, ledgerTxs] =
    await Promise.all([
      client.hotelBooking.findMany({
        where: createdFilter ? { createdAt: createdFilter } : undefined,
        select: {
          id: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          payoutOwnerType: true,
        },
      }),
      client.homeStayBooking.findMany({
        where: createdFilter ? { createdAt: createdFilter } : undefined,
        select: {
          id: true,
          status: true,
          totalPrice: true,
          createdAt: true,
          payoutOwnerType: true,
        },
      }),
      client.guideBooking.findMany({
        where: createdFilter ? { createdAt: createdFilter } : undefined,
        select: {
          id: true,
          status: true,
          totalPrice: true,
          createdAt: true,
          payoutOwnerType: true,
        },
      }),
      client.booking.findMany({
        where: createdFilter ? { createdAt: createdFilter } : undefined,
        select: { id: true },
      }),
      client.partnerEarning.findMany({
        where: {
          bookingType: { not: "TAXI" },
          ...(createdFilter ? { createdAt: createdFilter } : {}),
        },
        select: {
          id: true,
          bookingType: true,
          bookingId: true,
          status: true,
          grossTiyin: true,
          commissionFeeTiyin: true,
          netTiyin: true,
          createdAt: true,
        },
      }),
      client.ledgerTransaction.findMany({
        where: createdFilter ? { createdAt: createdFilter } : undefined,
        select: {
          id: true,
          bookingId: true,
          type: true,
          createdAt: true,
          entries: {
            select: {
              amount: true,
              direction: true,
              account: {
                select: { type: true, ownerType: true },
              },
            },
          },
        },
      }),
    ]);

  const bookings: ReconcileBookingRow[] = [
    ...hotels.map((b) => ({
      id: b.id,
      bookingType: "HOTEL" as const,
      status: b.status,
      grossTiyin: somDecimalToTiyin(b.totalAmount),
      createdAt: b.createdAt,
      payoutOwnerType: b.payoutOwnerType,
    })),
    ...homestays.map((b) => ({
      id: b.id,
      bookingType: "HOMESTAY" as const,
      status: b.status,
      grossTiyin: somDecimalToTiyin(b.totalPrice),
      createdAt: b.createdAt,
      payoutOwnerType: b.payoutOwnerType,
    })),
    ...guides.map((b) => ({
      id: b.id,
      bookingType: "GUIDE" as const,
      status: b.status,
      grossTiyin: somDecimalToTiyin(b.totalPrice),
      createdAt: b.createdAt,
      payoutOwnerType: b.payoutOwnerType,
    })),
  ];

  const knownBookingIds = new Set<string>([
    ...bookings.map((b) => b.id),
    ...legacy.map((b) => b.id),
  ]);

  // When --since filters creations, still resolve orphans against all booking ids
  if (since) {
    const [allH, allHs, allG, allL] = await Promise.all([
      client.hotelBooking.findMany({ select: { id: true } }),
      client.homeStayBooking.findMany({ select: { id: true } }),
      client.guideBooking.findMany({ select: { id: true } }),
      client.booking.findMany({ select: { id: true } }),
    ]);
    for (const row of [...allH, ...allHs, ...allG, ...allL]) {
      knownBookingIds.add(row.id);
    }
  }

  return {
    since,
    bookings,
    partnerEarnings: earnings.map((e) => ({
      id: e.id,
      bookingType: e.bookingType,
      bookingId: e.bookingId,
      status: e.status,
      grossTiyin: e.grossTiyin,
      commissionFeeTiyin: e.commissionFeeTiyin,
      netTiyin: e.netTiyin,
      createdAt: e.createdAt,
    })),
    ledgerTxs: ledgerTxs.map((tx) => ({
      id: tx.id,
      bookingId: tx.bookingId,
      type: tx.type,
      createdAt: tx.createdAt,
      entries: tx.entries.map((e) => ({
        amount: BigInt(e.amount),
        direction: e.direction as "DEBIT" | "CREDIT",
        accountType: e.account.type,
        ownerType: e.account.ownerType,
      })),
    })),
    knownBookingIds,
  };
}

export function formatReconcileReportHuman(report: ReconcileReport): string {
  const lines: string[] = [];
  lines.push(`Ledger ↔ PartnerEarning reconcile`);
  lines.push(`generatedAt: ${report.generatedAt}`);
  lines.push(`since: ${report.since ?? "(all)"}`);
  lines.push(`clean: ${report.clean ? "YES" : "NO"}`);
  lines.push("");
  for (const note of report.policyNotes) {
    lines.push(`POLICY: ${note}`);
  }
  if (report.policyNotes.length > 0) {
    lines.push("");
  }
  lines.push("Counts:");
  for (const [k, v] of Object.entries(report.counts)) {
    if (k === "POLICY") continue;
    lines.push(`  ${k}: ${v}`);
  }
  lines.push("");

  const byCheck = new Map<ReconcileCheck, ReconcileFinding[]>();
  for (const f of report.findings) {
    if (f.check === "POLICY") continue;
    const list = byCheck.get(f.check) ?? [];
    list.push(f);
    byCheck.set(f.check, list);
  }

  if (byCheck.size === 0) {
    lines.push("No drift findings.");
    return lines.join("\n");
  }

  for (const [check, items] of byCheck) {
    lines.push(`=== ${check} (${items.length}) ===`);
    for (const f of items) {
      const bits = [
        f.bookingId,
        f.bookingType ?? "",
        f.expected ? `expected=${f.expected}` : "",
        f.actual ? `actual=${f.actual}` : "",
        f.deltaTiyin != null ? `deltaTiyin=${f.deltaTiyin}` : "",
        f.detail ?? "",
      ].filter(Boolean);
      lines.push(`  - ${bits.join(" | ")}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
