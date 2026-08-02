/**
 * Read-only Ledger ↔ PartnerEarning reconciliation (Step 3).
 *
 *   npx tsx scripts/reconcile-ledger.ts [--json] [--since=YYYY-MM-DD]
 *
 * Exit 0 if clean (no drift), 1 if any drift finding.
 * NEVER writes to the DB — detection only (no --fix).
 *
 * TODO(taxi): DriverEarning ↔ ledger needs the same treatment later.
 */
import { prisma } from "../lib/prisma";
import {
  formatReconcileReportHuman,
  loadReconcileInput,
  reconcileLedgerPartnerEarnings,
} from "../src/modules/booking/service/reconcile-ledger";

function parseArgs(argv: string[]): {
  json: boolean;
  since: Date | null;
} {
  let json = false;
  let since: Date | null = null;
  for (const arg of argv) {
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg.startsWith("--since=")) {
      const raw = arg.slice("--since=".length);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        console.error(`Invalid --since=${raw} (expected YYYY-MM-DD)`);
        process.exit(2);
      }
      const [y, m, d] = raw.split("-").map(Number);
      since = new Date(y!, m! - 1, d!, 0, 0, 0, 0);
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: npx tsx scripts/reconcile-ledger.ts [--json] [--since=YYYY-MM-DD]",
      );
      process.exit(0);
    }
  }
  return { json, since };
}

async function main(): Promise<void> {
  const { json, since } = parseArgs(process.argv.slice(2));

  // Plain reads only — no create/update/delete in this file or loadReconcileInput.
  const input = await loadReconcileInput(prisma, since);
  const report = reconcileLedgerPartnerEarnings(input);

  if (json) {
    console.log(
      JSON.stringify(
        {
          ...report,
          findings: report.findings.map((f) => ({
            ...f,
            // bigint-safe: already strings for deltas
          })),
        },
        null,
        2,
      ),
    );
  } else {
    console.log(formatReconcileReportHuman(report));
  }

  process.exitCode = report.clean ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
