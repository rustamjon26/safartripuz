/**
 * MOVED to the booking module: `src/modules/booking/service/payment-confirmation.service.ts`.
 *
 * This shim keeps existing importers working during the strangler migration.
 * New code should import from `@/src/modules/booking`. Delete this file once
 * all payment adapters / routes import from the module directly.
 */
export {
  completeSuccessfulPaymentInTx,
  completeSuccessfulPaymentTx,
  createPartnerEarningIfMissing,
} from "@/src/modules/booking";
