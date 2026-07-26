/**
 * Upsert Flexible / Moderate / Strict / Non-refundable cancellation policies + rules.
 * Backfill Flexible onto RoomTypes with null cancellationPolicyId.
 *
 * Usage: npx tsx scripts/seed-cancellation-policies.ts
 * Do not run against production without approval.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type RuleSeed = {
  hoursBeforeCheckIn: number;
  refundPercent: number;
  conditions?: Record<string, number>;
};

const POLICIES: Array<{
  slug: string;
  name: string;
  rules: RuleSeed[];
}> = [
  {
    slug: "flexible",
    name: "Flexible",
    rules: [
      { hoursBeforeCheckIn: 24, refundPercent: 100 },
      { hoursBeforeCheckIn: 0, refundPercent: 0 },
    ],
  },
  {
    slug: "moderate",
    name: "Moderate",
    rules: [
      { hoursBeforeCheckIn: 120, refundPercent: 100 },
      { hoursBeforeCheckIn: 0, refundPercent: 0 },
    ],
  },
  {
    slug: "strict",
    name: "Strict",
    rules: [
      {
        hoursBeforeCheckIn: 0,
        refundPercent: 100,
        conditions: { maxHoursSinceBooking: 48, minHoursBeforeCheckIn: 336 },
      },
      { hoursBeforeCheckIn: 0, refundPercent: 0 },
    ],
  },
  {
    slug: "non-refundable",
    name: "Non-refundable",
    rules: [{ hoursBeforeCheckIn: 0, refundPercent: 0 }],
  },
];

async function upsertPolicy(seed: (typeof POLICIES)[number]) {
  const existing = await prisma.cancellationPolicy.findUnique({
    where: { slug: seed.slug },
    include: { rules: true },
  });

  if (existing) {
    await prisma.cancellationRule.deleteMany({ where: { policyId: existing.id } });
    await prisma.cancellationPolicy.update({
      where: { id: existing.id },
      data: {
        name: seed.name,
        rules: {
          create: seed.rules.map((r) => ({
            hoursBeforeCheckIn: r.hoursBeforeCheckIn,
            refundPercent: r.refundPercent,
            conditions: r.conditions ?? undefined,
          })),
        },
      },
    });
    return existing.id;
  }

  const created = await prisma.cancellationPolicy.create({
    data: {
      slug: seed.slug,
      name: seed.name,
      rules: {
        create: seed.rules.map((r) => ({
          hoursBeforeCheckIn: r.hoursBeforeCheckIn,
          refundPercent: r.refundPercent,
          conditions: r.conditions ?? undefined,
        })),
      },
    },
  });
  return created.id;
}

async function main() {
  const ids: Record<string, string> = {};
  for (const p of POLICIES) {
    ids[p.slug] = await upsertPolicy(p);
    console.log(`policy ${p.slug} → ${ids[p.slug]}`);
  }

  const flexibleId = ids.flexible;
  const result = await prisma.roomType.updateMany({
    where: { cancellationPolicyId: null },
    data: { cancellationPolicyId: flexibleId },
  });
  console.log(`attached Flexible to ${result.count} room type(s)`);

  // Align legacy name used by rate-plan backfill
  await prisma.cancellationPolicy.updateMany({
    where: { slug: "flexible" },
    data: { name: "Flexible" },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
