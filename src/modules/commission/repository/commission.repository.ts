import { db, type DbClient } from "@/src/shared/db/client";

/** SystemSetting key holding the configurable per-vertical rates. */
export const COMMISSION_RATES_SETTING_KEY = "commission_rates";

export class CommissionRepository {
  /**
   * Accepts a transaction client so a payment confirmation can read the rates
   * inside the same transaction that posts the ledger entries.
   */
  async findRatesSetting(client: DbClient = db): Promise<unknown> {
    const setting = await client.systemSetting.findUnique({
      where: { key: COMMISSION_RATES_SETTING_KEY },
    });
    return setting?.value ?? null;
  }

  async saveRatesSetting(value: unknown, client: DbClient = db): Promise<void> {
    await client.systemSetting.upsert({
      where: { key: COMMISSION_RATES_SETTING_KEY },
      create: { key: COMMISSION_RATES_SETTING_KEY, value: value as never },
      update: { value: value as never },
    });
  }
}

export const commissionRepository = new CommissionRepository();
