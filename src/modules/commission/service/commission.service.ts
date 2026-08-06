import type { DbClient } from "@/src/shared/db/client";
import {
  type CommissionRates,
  DEFAULT_COMMISSION_RATES,
  mergeCommissionRates,
} from "../domain/rates";
import { commissionRepository } from "../repository/commission.repository";

export class CommissionService {
  /**
   * Configured rates, or the defaults.
   *
   * Swallows read failures on purpose: commission is read on the payment
   * success path, and a momentarily unreadable setting must not fail a payment
   * that has already been taken. The defaults are the documented rates.
   */
  async getRates(client?: DbClient): Promise<CommissionRates> {
    try {
      const raw = await commissionRepository.findRatesSetting(client);
      if (raw == null) return DEFAULT_COMMISSION_RATES;
      return mergeCommissionRates(raw);
    } catch {
      return DEFAULT_COMMISSION_RATES;
    }
  }

  async saveRates(rates: CommissionRates, client?: DbClient): Promise<void> {
    await commissionRepository.saveRatesSetting(
      mergeCommissionRates(rates),
      client,
    );
  }
}

export const commissionService = new CommissionService();
