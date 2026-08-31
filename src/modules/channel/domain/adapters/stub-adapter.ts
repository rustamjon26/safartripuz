import type {
  AdapterResult,
  AriDelta,
  ChannelAdapter,
  RawOtaReservation,
} from "../adapter";
import type { OtaProviderKey } from "../types";

/**
 * Dry-run adapter until OpenTravel / partner certification is live.
 * Keeps the sync job pipeline exercisable end-to-end.
 */
export function createStubAdapter(providerKey: OtaProviderKey): ChannelAdapter {
  return {
    providerKey,
    async ping(ctx): Promise<AdapterResult> {
      if (!ctx.externalHotelId) {
        return {
          ok: false,
          dryRun: true,
          message: "externalHotelId (HotelCode) talab qilinadi",
        };
      }
      return {
        ok: true,
        dryRun: true,
        message: `${providerKey} ping OK (stub — OpenTravel hali ulanmagan)`,
        details: { externalHotelId: ctx.externalHotelId },
      };
    },
    async pushAri(ctx: {
      externalHotelId: string | null;
      deltas: AriDelta[];
    }): Promise<AdapterResult> {
      return {
        ok: true,
        dryRun: true,
        message: `ARI push stub: ${ctx.deltas.length} delta(s) qabul qilindi`,
        details: {
          providerKey,
          externalHotelId: ctx.externalHotelId,
          deltaCount: ctx.deltas.length,
        },
      };
    },
    async pullReservations(ctx: {
      externalHotelId: string | null;
    }): Promise<{ result: AdapterResult; reservations: RawOtaReservation[] }> {
      return {
        result: {
          ok: true,
          dryRun: true,
          message: "Reservation pull stub — bo‘sh natija",
          details: { externalHotelId: ctx.externalHotelId },
        },
        reservations: [],
      };
    },
  };
}
