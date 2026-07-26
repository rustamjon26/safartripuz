/**
 * Backfill BASE RatePlan from RoomType.basePrice (tiyin).
 * Safe to re-run (upsert). Does not overwrite RateOverride rows.
 *
 * Usage: npx tsx scripts/backfill-rate-plans.ts
 */
import { PrismaClient } from "@prisma/client";
import { Money, MoneyError } from "../src/shared/money";

const prisma = new PrismaClient();

async function ensurePolicies() {
  let flexible = await prisma.cancellationPolicy.findFirst({
    where: { OR: [{ slug: "flexible" }, { name: "Flexible" }, { name: "Flexible 24h" }] },
  });
  if (!flexible) {
    flexible = await prisma.cancellationPolicy.create({
      data: {
        name: "Flexible",
        slug: "flexible",
        rules: {
          create: [
            { hoursBeforeCheckIn: 24, refundPercent: 100 },
            { hoursBeforeCheckIn: 0, refundPercent: 0 },
          ],
        },
      },
    });
  }

  let nr = await prisma.cancellationPolicy.findFirst({
    where: { OR: [{ slug: "non-refundable" }, { name: "Non-refundable" }] },
  });
  if (!nr) {
    nr = await prisma.cancellationPolicy.create({
      data: {
        name: "Non-refundable",
        slug: "non-refundable",
        rules: {
          create: [{ hoursBeforeCheckIn: 0, refundPercent: 0 }],
        },
      },
    });
  }

  return { flexible, nr };
}

async function main() {
  const { flexible } = await ensurePolicies();
  const roomTypes = await prisma.roomType.findMany({
    select: {
      id: true,
      name: true,
      basePrice: true,
      isActive: true,
      cancellationPolicyId: true,
    },
  });

  let created = 0;
  let updated = 0;
  let policyAttached = 0;

  for (const rt of roomTypes) {
    if (!rt.cancellationPolicyId) {
      await prisma.roomType.update({
        where: { id: rt.id },
        data: { cancellationPolicyId: flexible.id },
      });
      policyAttached += 1;
    }

    let baseTiyin: bigint;
    try {
      baseTiyin = Money.fromSomNumber(Number(rt.basePrice)).toTiyin();
    } catch (e) {
      if (e instanceof MoneyError) {
        console.warn(`skip roomType ${rt.id}: ${e.message}`);
        continue;
      }
      throw e;
    }

    const existing = await prisma.ratePlan.findFirst({
      where: { roomTypeId: rt.id, type: "BASE" },
    });

    if (!existing) {
      await prisma.ratePlan.create({
        data: {
          roomTypeId: rt.id,
          name: `${rt.name} Base`,
          type: "BASE",
          basePriceTiyin: baseTiyin,
          isActive: rt.isActive,
          cancellationPolicyId: flexible.id,
        },
      });
      created += 1;
    } else {
      await prisma.ratePlan.update({
        where: { id: existing.id },
        data: {
          basePriceTiyin: baseTiyin,
          ...(existing.cancellationPolicyId
            ? {}
            : { cancellationPolicyId: flexible.id }),
        },
      });
      updated += 1;
    }
  }

  console.log(
    `rate plans: created=${created} updated=${updated}; roomType policies attached=${policyAttached}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
