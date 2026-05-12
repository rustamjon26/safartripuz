import { prisma } from "../lib/prisma";

/**
 * One-shot backfill: promote every PENDING HomeStayListing to ACTIVE.
 *
 * Listings are auto-approved on creation now (see
 * app/api/homestay/host/listings/route.ts), so any historical PENDING rows
 * that were created before this change should be promoted to ACTIVE too.
 *
 * REJECTED and BLOCKED listings are intentionally left alone.
 *
 * Usage:
 *   npx tsx scripts/approve-pending-homestays.ts
 *   or
 *   npm run db:approve-pending-homestays
 */
async function main() {
  const pending = await prisma.homeStayListing.findMany({
    where: { status: "PENDING" },
    select: { id: true, title: true, hostId: true, city: true },
  });

  if (pending.length === 0) {
    console.log("No PENDING listings found. Nothing to do.");
    return;
  }

  console.log(`Found ${pending.length} PENDING listing(s). Promoting to ACTIVE...`);
  for (const l of pending) {
    console.log(`  → ${l.id}  ${l.title}  (${l.city})  host=${l.hostId}`);
  }

  const result = await prisma.homeStayListing.updateMany({
    where: { status: "PENDING" },
    data: { status: "ACTIVE" },
  });

  console.log(`Done. ${result.count} listing(s) updated to ACTIVE.`);
}

main()
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
