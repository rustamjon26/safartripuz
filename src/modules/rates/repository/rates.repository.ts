import { Money } from "@/src/shared/money";
import { formatDateOnly } from "@/src/modules/inventory";
import { db, type DbClient } from "@/src/shared/db/client";
import type {
  LosRuleInput,
  PromotionRule,
  SeasonalOverrideRule,
  TaxFeeRuleInput,
} from "../domain/types";

export class RatesRepository {
  async findActiveBasePlan(roomTypeId: string, client: DbClient = db) {
    try {
      return await client.ratePlan.findFirst({
        where: { roomTypeId, type: "BASE", isActive: true },
        include: {
          overrides: true,
          cancellationPolicy: true,
        },
      });
    } catch {
      // Tables not migrated yet — fall back to RoomType.basePrice only
      return null;
    }
  }

  async findRoomType(roomTypeId: string, client: DbClient = db) {
    return client.roomType.findUnique({
      where: { id: roomTypeId },
      select: {
        id: true,
        name: true,
        basePrice: true,
        capacityAdults: true,
        capacityChildren: true,
        isActive: true,
      },
    });
  }

  async loadOverridesForRange(
    ratePlanId: string,
    checkIn: Date,
    checkOut: Date,
    client: DbClient = db,
  ): Promise<SeasonalOverrideRule[]> {
    try {
      const rows = await client.rateOverride.findMany({
        where: {
          ratePlanId,
          startDate: { lt: checkOut },
          endDate: { gte: checkIn },
        },
      });
      return rows.map(
        (r: {
          startDate: Date;
          endDate: Date;
          priceTiyin: bigint;
        }) => ({
          startDate: formatDateOnly(r.startDate),
          endDate: formatDateOnly(r.endDate),
          priceTiyin: BigInt(r.priceTiyin),
        }),
      );
    } catch {
      return [];
    }
  }

  async loadActivePromotions(
    codes: string[] | undefined,
    client: DbClient = db,
  ): Promise<PromotionRule[]> {
    try {
      const rows = await client.promotion.findMany({
        where: {
          isActive: true,
          ...(codes?.length
            ? { OR: [{ code: { in: codes } }, { code: null }] }
            : {}),
        },
        orderBy: { priority: "asc" },
      });

      return rows
        .filter((r: { code: string | null }) => {
          if (!codes?.length) return true;
          return r.code == null || codes.includes(r.code);
        })
        .map(
          (r: {
            id: string;
            code: string | null;
            discountType: string;
            discountValue: bigint;
            stackGroup: string;
            priority: number;
            combinableWith: unknown;
            maxDiscountTiyin: bigint | null;
          }) => ({
            id: r.id,
            code: r.code,
            discountType: r.discountType as PromotionRule["discountType"],
            discountValue: BigInt(r.discountValue),
            stackGroup: r.stackGroup,
            priority: r.priority,
            combinableWith: Array.isArray(r.combinableWith)
              ? (r.combinableWith as string[])
              : [],
            maxDiscountTiyin:
              r.maxDiscountTiyin != null ? BigInt(r.maxDiscountTiyin) : null,
          }),
        );
    } catch {
      return [];
    }
  }

  async loadTaxFeeRules(client: DbClient = db): Promise<TaxFeeRuleInput[]> {
    try {
      const rows = await client.taxFeeRule.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      });
      return rows.map(
        (r: {
          id: string;
          name: string;
          type: string;
          value: bigint;
          sortOrder: number;
        }) => ({
          id: r.id,
          name: r.name,
          type: r.type as TaxFeeRuleInput["type"],
          value: BigInt(r.value),
          sortOrder: r.sortOrder,
        }),
      );
    } catch {
      return [];
    }
  }

  async loadLosRules(ratePlanId: string | null, client: DbClient = db): Promise<LosRuleInput[]> {
    try {
      const rows = await client.losRule.findMany({
        where: {
          isActive: true,
          OR: [{ ratePlanId: null }, ...(ratePlanId ? [{ ratePlanId }] : [])],
        },
      });
      return rows.map((r: { minLos: number | null; maxLos: number | null; tiers: unknown }) => {
        const tiersRaw = Array.isArray(r.tiers) ? r.tiers : [];
        return {
          minLos: r.minLos,
          maxLos: r.maxLos,
          tiers: tiersRaw.map((t: { minNights: number; discountBps: number | string }) => ({
            minNights: Number(t.minNights),
            discountBps: BigInt(t.discountBps),
          })),
        };
      });
    } catch {
      return [];
    }
  }

  async upsertBasePlanFromRoomType(
    roomType: { id: string; name: string; basePrice: unknown },
    cancellationPolicyId: string | null,
    client: DbClient = db,
  ) {
    const basePriceTiyin = Money.fromSomNumber(Number(roomType.basePrice)).toTiyin();
    const existing = await client.ratePlan.findFirst({
      where: { roomTypeId: roomType.id, type: "BASE" },
    });
    if (existing) {
      return client.ratePlan.update({
        where: { id: existing.id },
        data: {
          basePriceTiyin,
          name: `${roomType.name} Base`,
          isActive: true,
          ...(cancellationPolicyId
            ? { cancellationPolicyId }
            : {}),
        },
      });
    }
    return client.ratePlan.create({
      data: {
        roomTypeId: roomType.id,
        name: `${roomType.name} Base`,
        type: "BASE",
        basePriceTiyin,
        isActive: true,
        cancellationPolicyId,
      },
    });
  }

  async ensureDefaultCancellationPolicies(client: DbClient = db) {
    try {
      const flexible = await client.cancellationPolicy.findFirst({
        where: { OR: [{ slug: "flexible" }, { name: "Flexible" }, { name: "Flexible 24h" }] },
        include: { rules: true },
      });
      if (flexible) return flexible;

      return await client.cancellationPolicy.create({
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
    } catch {
      return { id: null as unknown as string };
    }
  }

  /** Resolve nightly base tiyin: BASE plan or fallback RoomType.basePrice. */
  resolveBaseTiyin(plan: { basePriceTiyin: bigint | null } | null, roomTypeBaseSom: unknown): bigint {
    if (plan?.basePriceTiyin != null) return BigInt(plan.basePriceTiyin);
    return Money.fromSomNumber(Number(roomTypeBaseSom)).toTiyin();
  }
}

export const ratesRepository = new RatesRepository();
