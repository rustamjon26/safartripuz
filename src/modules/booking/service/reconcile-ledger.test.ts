import { describe, expect, it } from "vitest";
import {
  LEGACY_UNCLASSIFIED_PAYOUT_NOTE,
  reconcileLedgerPartnerEarnings,
  type ReconcileInput,
  type ReconcileLedgerTxRow,
  type ReconcilePartnerEarningRow,
} from "./reconcile-ledger";
import { LedgerTxType } from "@/src/modules/ledger";

function pe(
  partial: Partial<ReconcilePartnerEarningRow> &
    Pick<ReconcilePartnerEarningRow, "id" | "bookingId">,
): ReconcilePartnerEarningRow {
  return {
    bookingType: "HOTEL",
    status: "PENDING",
    grossTiyin: 1_000_000n,
    commissionFeeTiyin: 100_000n,
    netTiyin: 900_000n,
    createdAt: new Date("2026-08-01"),
    ...partial,
  };
}

function paymentTx(
  bookingId: string,
  opts?: { platform?: bigint; partner?: bigint; gross?: bigint },
): ReconcileLedgerTxRow {
  const gross = opts?.gross ?? 1_000_000n;
  const platform = opts?.platform ?? 100_000n;
  const partner = opts?.partner ?? 900_000n;
  return {
    id: `ltx_pay_${bookingId}`,
    bookingId,
    type: LedgerTxType.BOOKING_PAYMENT,
    createdAt: new Date("2026-08-01"),
    entries: [
      {
        amount: gross,
        direction: "DEBIT",
        accountType: "ASSET",
        ownerType: "PLATFORM",
      },
      {
        amount: partner,
        direction: "CREDIT",
        accountType: "LIABILITY",
        ownerType: "PARTNER",
      },
      {
        amount: platform,
        direction: "CREDIT",
        accountType: "REVENUE",
        ownerType: "PLATFORM",
      },
    ],
  };
}

function platformPaymentTx(bookingId: string, gross = 1_000_000n): ReconcileLedgerTxRow {
  return {
    id: `ltx_pay_${bookingId}`,
    bookingId,
    type: LedgerTxType.BOOKING_PAYMENT,
    createdAt: new Date("2026-08-01"),
    entries: [
      {
        amount: gross,
        direction: "DEBIT",
        accountType: "ASSET",
        ownerType: "PLATFORM",
      },
      {
        amount: gross,
        direction: "CREDIT",
        accountType: "REVENUE",
        ownerType: "PLATFORM",
      },
    ],
  };
}

function refundTx(bookingId: string): ReconcileLedgerTxRow {
  return {
    id: `ltx_ref_${bookingId}`,
    bookingId,
    type: LedgerTxType.REFUND,
    createdAt: new Date("2026-08-02"),
    entries: [
      {
        amount: 1_000_000n,
        direction: "CREDIT",
        accountType: "ASSET",
        ownerType: "PLATFORM",
      },
      {
        amount: 900_000n,
        direction: "DEBIT",
        accountType: "LIABILITY",
        ownerType: "PARTNER",
      },
      {
        amount: 100_000n,
        direction: "DEBIT",
        accountType: "REVENUE",
        ownerType: "PLATFORM",
      },
    ],
  };
}

function baseInput(over: Partial<ReconcileInput> = {}): ReconcileInput {
  const cleanId = "bk_clean";
  const bookings = over.bookings ?? [
    {
      id: cleanId,
      bookingType: "HOTEL" as const,
      status: "CONFIRMED",
      grossTiyin: 1_000_000n,
      createdAt: new Date("2026-08-01"),
      payoutOwnerType: "PARTNER" as const,
    },
  ];
  const partnerEarnings = over.partnerEarnings ?? [
    pe({ id: "pe_clean", bookingId: cleanId }),
  ];
  const ledgerTxs = over.ledgerTxs ?? [paymentTx(cleanId)];
  const known = new Set<string>([
    ...bookings.map((b) => b.id),
    ...(over.knownBookingIds ? [...over.knownBookingIds] : []),
  ]);
  return {
    since: null,
    bookings,
    partnerEarnings,
    ledgerTxs,
    ...over,
    knownBookingIds: over.knownBookingIds ?? known,
  };
}

function driftOf(
  report: ReturnType<typeof reconcileLedgerPartnerEarnings>,
  check: string,
) {
  return report.findings.filter((f) => f.check === check);
}

describe("reconcileLedgerPartnerEarnings", () => {
  it("clean case: no drift findings", () => {
    const report = reconcileLedgerPartnerEarnings(baseInput());
    expect(report.clean).toBe(true);
    expect(driftOf(report, "MISSING_PARTNER_EARNING")).toHaveLength(0);
    expect(driftOf(report, "DUPLICATE_PARTNER_EARNING")).toHaveLength(0);
    expect(driftOf(report, "SUM_MISMATCH")).toHaveLength(0);
    expect(driftOf(report, "REVERSAL_INCOMPLETE")).toHaveLength(0);
    expect(driftOf(report, "ORPHAN_ENTRY")).toHaveLength(0);
    expect(report.policyNotes).toHaveLength(0);
    expect(report.findings.some((f) => f.check === "POLICY")).toBe(false);
  });

  it("flags missing PartnerEarning", () => {
    const report = reconcileLedgerPartnerEarnings(
      baseInput({
        bookings: [
          {
            id: "bk_missing_pe",
            bookingType: "HOTEL",
            status: "CONFIRMED",
            grossTiyin: 1_000_000n,
            createdAt: new Date(),
            payoutOwnerType: "PARTNER",
          },
        ],
        partnerEarnings: [],
        ledgerTxs: [paymentTx("bk_missing_pe")],
        knownBookingIds: new Set(["bk_missing_pe"]),
      }),
    );
    expect(report.clean).toBe(false);
    const missing = driftOf(report, "MISSING_PARTNER_EARNING");
    expect(missing).toHaveLength(1);
    expect(missing[0]?.bookingId).toBe("bk_missing_pe");
    expect(driftOf(report, "DUPLICATE_PARTNER_EARNING")).toHaveLength(0);
    expect(driftOf(report, "SUM_MISMATCH")).toHaveLength(0);
  });

  it("does not flag PLATFORM-owned booking without PartnerEarning", () => {
    const report = reconcileLedgerPartnerEarnings(
      baseInput({
        bookings: [
          {
            id: "bk_platform",
            bookingType: "HOTEL",
            status: "CONFIRMED",
            grossTiyin: 1_000_000n,
            createdAt: new Date(),
            payoutOwnerType: "PLATFORM",
          },
        ],
        partnerEarnings: [],
        ledgerTxs: [platformPaymentTx("bk_platform")],
        knownBookingIds: new Set(["bk_platform"]),
      }),
    );
    expect(report.clean).toBe(true);
    expect(driftOf(report, "MISSING_PARTNER_EARNING")).toHaveLength(0);
    expect(driftOf(report, "POLICY")).toHaveLength(0);
  });

  it("still flags PARTNER booking without PartnerEarning", () => {
    const report = reconcileLedgerPartnerEarnings(
      baseInput({
        bookings: [
          {
            id: "bk_partner_missing",
            bookingType: "HOMESTAY",
            status: "CONFIRMED",
            grossTiyin: 500_000n,
            createdAt: new Date(),
            payoutOwnerType: "PARTNER",
          },
        ],
        partnerEarnings: [],
        ledgerTxs: [
          paymentTx("bk_partner_missing", {
            gross: 500_000n,
            platform: 50_000n,
            partner: 450_000n,
          }),
        ],
        knownBookingIds: new Set(["bk_partner_missing"]),
      }),
    );
    expect(report.clean).toBe(false);
    const missing = driftOf(report, "MISSING_PARTNER_EARNING");
    expect(missing).toHaveLength(1);
    expect(missing[0]?.bookingId).toBe("bk_partner_missing");
  });

  it("flags duplicate PartnerEarning for same bookingId", () => {
    const report = reconcileLedgerPartnerEarnings(
      baseInput({
        bookings: [
          {
            id: "bk_dup",
            bookingType: "HOTEL",
            status: "CONFIRMED",
            grossTiyin: 1_000_000n,
            createdAt: new Date(),
            payoutOwnerType: "PARTNER",
          },
        ],
        partnerEarnings: [
          pe({ id: "pe1", bookingId: "bk_dup", bookingType: "HOTEL" }),
          pe({ id: "pe2", bookingId: "bk_dup", bookingType: "HOMESTAY" }),
        ],
        ledgerTxs: [paymentTx("bk_dup")],
        knownBookingIds: new Set(["bk_dup"]),
      }),
    );
    expect(report.clean).toBe(false);
    const dups = driftOf(report, "DUPLICATE_PARTNER_EARNING");
    expect(dups).toHaveLength(1);
    expect(dups[0]?.bookingId).toBe("bk_dup");
    expect(dups[0]?.actual).toMatch(/2 rows/);
  });

  it("flags sum mismatch (platform share vs PE fee)", () => {
    const report = reconcileLedgerPartnerEarnings(
      baseInput({
        bookings: [
          {
            id: "bk_sum",
            bookingType: "HOTEL",
            status: "CONFIRMED",
            grossTiyin: 1_000_000n,
            createdAt: new Date(),
            payoutOwnerType: "PARTNER",
          },
        ],
        partnerEarnings: [
          pe({
            id: "pe_sum",
            bookingId: "bk_sum",
            // Wrong split vs ledger 10%
            commissionFeeTiyin: 50_000n,
            netTiyin: 950_000n,
          }),
        ],
        ledgerTxs: [paymentTx("bk_sum")],
        knownBookingIds: new Set(["bk_sum"]),
      }),
    );
    expect(report.clean).toBe(false);
    const mismatches = driftOf(report, "SUM_MISMATCH");
    expect(mismatches.length).toBeGreaterThanOrEqual(1);
    expect(
      mismatches.some((f) => f.detail?.includes("commissionFee")),
    ).toBe(true);
    expect(mismatches.every((f) => f.deltaTiyin != null)).toBe(true);
  });

  it("flags incomplete reversal both directions", () => {
    const ledgerOnly = reconcileLedgerPartnerEarnings(
      baseInput({
        bookings: [
          {
            id: "bk_rev_ledger",
            bookingType: "HOTEL",
            status: "REFUNDED",
            grossTiyin: 1_000_000n,
            createdAt: new Date(),
            payoutOwnerType: "PARTNER",
          },
        ],
        partnerEarnings: [
          pe({
            id: "pe_still_pending",
            bookingId: "bk_rev_ledger",
            status: "PENDING",
          }),
        ],
        ledgerTxs: [
          paymentTx("bk_rev_ledger"),
          refundTx("bk_rev_ledger"),
        ],
        knownBookingIds: new Set(["bk_rev_ledger"]),
      }),
    );
    expect(
      driftOf(ledgerOnly, "REVERSAL_INCOMPLETE").some((f) =>
        f.detail?.includes("not CANCELLED"),
      ),
    ).toBe(true);

    const peOnly = reconcileLedgerPartnerEarnings(
      baseInput({
        bookings: [
          {
            id: "bk_rev_pe",
            bookingType: "GUIDE",
            status: "CANCELLED",
            grossTiyin: 1_000_000n,
            createdAt: new Date(),
            payoutOwnerType: "PARTNER",
          },
        ],
        partnerEarnings: [
          pe({
            id: "pe_cancelled",
            bookingId: "bk_rev_pe",
            bookingType: "GUIDE",
            status: "CANCELLED",
          }),
        ],
        ledgerTxs: [paymentTx("bk_rev_pe")],
        knownBookingIds: new Set(["bk_rev_pe"]),
      }),
    );
    expect(
      driftOf(peOnly, "REVERSAL_INCOMPLETE").some((f) =>
        f.detail?.includes("without ledger reversal"),
      ),
    ).toBe(true);
  });

  it("flags orphan PartnerEarning and Ledger rows", () => {
    const report = reconcileLedgerPartnerEarnings(
      baseInput({
        bookings: [],
        partnerEarnings: [
          pe({ id: "pe_orphan", bookingId: "ghost_booking" }),
        ],
        ledgerTxs: [paymentTx("ghost_ledger_bk")],
        knownBookingIds: new Set(),
      }),
    );
    const orphans = driftOf(report, "ORPHAN_ENTRY");
    expect(orphans.map((o) => o.bookingId).sort()).toEqual([
      "ghost_booking",
      "ghost_ledger_bk",
    ]);
    // orphans also trigger missing PE for ledger-only ghost
    expect(report.clean).toBe(false);
  });

  it("flags only expected checks for a mixed fixture set", () => {
    const report = reconcileLedgerPartnerEarnings({
      since: null,
      bookings: [
        {
          id: "ok",
          bookingType: "HOTEL",
          status: "CONFIRMED",
          grossTiyin: 1_000_000n,
          createdAt: new Date(),
          payoutOwnerType: "PARTNER",
        },
        {
          id: "missing",
          bookingType: "HOMESTAY",
          status: "CONFIRMED",
          grossTiyin: 500_000n,
          createdAt: new Date(),
          payoutOwnerType: "PARTNER",
        },
      ],
      partnerEarnings: [
        pe({ id: "pe_ok", bookingId: "ok" }),
        pe({ id: "pe_d1", bookingId: "dup" }),
        pe({ id: "pe_d2", bookingId: "dup", bookingType: "GUIDE" }),
        pe({ id: "pe_orphan", bookingId: "no_row" }),
      ],
      ledgerTxs: [
        paymentTx("ok"),
        paymentTx("missing", {
          gross: 500_000n,
          platform: 50_000n,
          partner: 450_000n,
        }),
        paymentTx("orphan_ltx"),
      ],
      knownBookingIds: new Set(["ok", "missing", "dup"]),
    });

    expect(driftOf(report, "MISSING_PARTNER_EARNING").map((f) => f.bookingId).sort()).toEqual(
      ["missing", "orphan_ltx"],
    );
    expect(driftOf(report, "DUPLICATE_PARTNER_EARNING")).toHaveLength(1);
    expect(driftOf(report, "ORPHAN_ENTRY").map((f) => f.bookingId).sort()).toEqual(
      ["no_row", "orphan_ltx"],
    );
    expect(driftOf(report, "SUM_MISMATCH")).toHaveLength(0);
    expect(driftOf(report, "REVERSAL_INCOMPLETE")).toHaveLength(0);
  });

  it("POLICY only for unclassified legacy (null payoutOwnerType)", () => {
    const report = reconcileLedgerPartnerEarnings(
      baseInput({
        bookings: [
          {
            id: "bk_legacy",
            bookingType: "HOTEL",
            status: "CONFIRMED",
            grossTiyin: 1_000_000n,
            createdAt: new Date(),
            payoutOwnerType: null,
          },
        ],
        partnerEarnings: [pe({ id: "pe_legacy", bookingId: "bk_legacy" })],
        ledgerTxs: [paymentTx("bk_legacy")],
        knownBookingIds: new Set(["bk_legacy"]),
      }),
    );
    // has PE so MISSING not raised; POLICY note for unclassified
    expect(driftOf(report, "POLICY")).toHaveLength(1);
    expect(report.policyNotes[0]).toBe(LEGACY_UNCLASSIFIED_PAYOUT_NOTE);
    expect(report.clean).toBe(true);
  });
});
