/**
 * The single home for commission math and rates.
 *
 * Consolidated from three places: `src/modules/ledger/domain/commission.ts`
 * (pure math), `lib/getCommissionRates.ts` (rate loading, plus a delegating
 * `calcCommissionTiyin` alias and an unused half-up variant), and this module,
 * which previously held nothing but a test file.
 */
export {
  calcPlatformCommissionTiyin,
  splitBookingCommission,
} from "./domain/commission";
export {
  asRatePercent,
  DEFAULT_COMMISSION_RATES,
  mergeCommissionRates,
} from "./domain/rates";
export type { CommissionBookingType, CommissionRates } from "./domain/rates";
export { commissionService, CommissionService } from "./service/commission.service";
export {
  commissionRepository,
  CommissionRepository,
  COMMISSION_RATES_SETTING_KEY,
} from "./repository/commission.repository";
