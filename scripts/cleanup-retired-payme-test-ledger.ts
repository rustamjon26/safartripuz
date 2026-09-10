/**
 * Dry-run (default) then optional --apply for orphaned PartnerEarning /
 * LedgerTransaction rows tied to deleted legacy Payme sandbox bookings.
 *
 *   npx tsx scripts/cleanup-retired-payme-test-ledger.ts
 *   npx tsx scripts/cleanup-retired-payme-test-ledger.ts --apply
 *
 * LedgerEntry rows are NEVER deleted. --apply posts a 100% REFUND compensation
 * and flags PartnerEarning CANCELLED (same as a booking cancel).
 *
 * Refuses: unknown ids, bookings that still exist, PartnerEarning.status=PAID.
 */
import "../src/shared/boot";

import { prisma } from "../lib/prisma";
import { reversePartnerEarningInTx } from "../src/modules/booking";
import {
  RETIRED_PAYME_TEST_BOOKING_IDS,
  ledgerRepository,
  ledgerService,
  retiredTestCleanupBlocker,
} from "../src/modules/ledger";

function parseApply(argv: string[]): boolean {
  if (argv.includes("--apply")) return true;
  if (argv.includes("--dry-run")) return false;
  return false;
}

async function main(): Promise<void> {
  const apply = parseApply(process.argv.slice(2));
  const ids = [...RETIRED_PAYME_TEST_BOOKING_IDS];

  console.log(
    apply
      ? "[retired-payme-test] APPLY — will post refunds and cancel PartnerEarning"
      : "[retired-payme-test] DRY-RUN — no writes (pass --apply to execute)",
  );
  console.log(`  allowlist: ${ids.join(", ")}`);
  console.log("");

  let blocked = 0;
  let applied = 0;

  for (const bookingId of ids) {
    const [
      legacy,
      hotel,
      homestay,
      guide,
      earnings,
      ledgerTxs,
      paymeTxs,
    ] = await Promise.all([
      prisma.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, status: true, userId: true },
      }),
      prisma.hotelBooking.findUnique({
        where: { id: bookingId },
        select: { id: true },
      }),
      prisma.homeStayBooking.findUnique({
        where: { id: bookingId },
        select: { id: true },
      }),
      prisma.guideBooking.findUnique({
        where: { id: bookingId },
        select: { id: true },
      }),
      prisma.partnerEarning.findMany({
        where: { bookingId },
        select: {
          id: true,
          bookingType: true,
          status: true,
          grossTiyin: true,
          commissionFeeTiyin: true,
          netTiyin: true,
          partnerId: true,
          partner: { select: { email: true, role: true } },
        },
      }),
      prisma.ledgerTransaction.findMany({
        where: { bookingId },
        select: {
          id: true,
          type: true,
          idempotencyKey: true,
          bookingType: true,
        },
      }),
      prisma.paymeTransaction.findMany({
        where: { bookingId },
        select: { id: true, state: true, paymeId: true },
      }),
    ]);

    const blocker = retiredTestCleanupBlocker({
      bookingId,
      legacyBookingExists: Boolean(legacy),
      hotelBookingExists: Boolean(hotel),
      homestayBookingExists: Boolean(homestay),
      guideBookingExists: Boolean(guide),
      partnerEarningStatuses: earnings.map((e) => e.status),
    });

    console.log(`bookingId=${bookingId}`);
    console.log(
      `  bookings: legacy=${legacy ? legacy.status : "missing"} hotel=${hotel ? "yes" : "missing"} homestay=${homestay ? "yes" : "missing"} guide=${guide ? "yes" : "missing"}`,
    );
    if (earnings.length === 0) {
      console.log("  PartnerEarning: none");
    }
    for (const e of earnings) {
      console.log(
        `  PartnerEarning ${e.id} type=${e.bookingType} status=${e.status} grossTiyin=${e.grossTiyin.toString()} partner=${e.partner.email} role=${e.partner.role}`,
      );
    }
    if (ledgerTxs.length === 0) {
      console.log("  LedgerTransaction: none");
    }
    for (const tx of ledgerTxs) {
      console.log(
        `  LedgerTransaction ${tx.id} type=${tx.type} bookingType=${tx.bookingType ?? "null"}`,
      );
    }
    for (const pt of paymeTxs) {
      console.log(
        `  PaymeTransaction ${pt.id} state=${pt.state} paymeId=${pt.paymeId}`,
      );
    }

    if (blocker) {
      blocked += 1;
      console.log(`  SKIP: ${blocker}`);
      console.log("");
      continue;
    }

    if (
      earnings.length === 0 &&
      ledgerTxs.length === 0 &&
      paymeTxs.length === 0
    ) {
      console.log("  nothing to clean");
      console.log("");
      continue;
    }

    if (!apply) {
      console.log("  would: REFUND 100% + PartnerEarning CANCELLED (no LedgerEntry delete)");
      console.log("");
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const nonTaxi = earnings.filter((e) => e.bookingType !== "TAXI");
      if (
        nonTaxi.length === 0 &&
        ledgerTxs.some((t) => t.type === "BOOKING_PAYMENT")
      ) {
        throw new Error(
          `${bookingId}: BOOKING_PAYMENT without PartnerEarning — inspect by hand, refusing to guess the partner.`,
        );
      }
      for (const earning of nonTaxi) {
        if (earning.bookingType === "TAXI") continue;
        const posted = await ledgerRepository.findBookingPaymentCharge(
          bookingId,
          tx,
        );
        const refundTiyin = posted?.grossTiyin ?? earning.grossTiyin;
        const originalCommissionTiyin =
          posted?.commissionTiyin ?? earning.commissionFeeTiyin;

        await ledgerService.postRefundCompensation(
          {
            idempotencyKey: `refund:${earning.bookingType}:${bookingId}:100`,
            bookingId,
            bookingType: earning.bookingType,
            refundTiyin,
            refundPercent: 100,
            originalCommissionTiyin,
            partnerUserId: earning.partnerId,
            allowUnattributed: false,
          },
          tx,
        );
        await reversePartnerEarningInTx(
          tx,
          earning.bookingType,
          bookingId,
          100,
        );
      }
    });

    applied += 1;
    console.log("  applied: refund posted + PartnerEarning CANCELLED");
    console.log("");
  }

  console.log(
    apply
      ? `done: applied=${applied} skipped=${blocked}`
      : `dry-run done: skipped=${blocked}. Re-run with --apply to write.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
