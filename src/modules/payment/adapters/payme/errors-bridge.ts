/**
 * Bridge: keep app/api/payme/utils/errors.ts API while aligning codes to harden plan.
 * Existing method files import from ../utils/errors — we update that file to re-export here.
 */
export {
  PAYME_ERRORS,
  paymeRpcError,
  paymeRpcSuccess,
  type PaymeErrorDefinition,
  type PaymeLocalizedMessage,
} from "../../domain/errors";
