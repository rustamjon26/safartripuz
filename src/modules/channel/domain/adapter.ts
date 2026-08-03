import type { OtaProviderKey } from "./types";

/**
 * Channel adapter contract (SiteMinder / Cloudbeds style):
 * - PUSH ARI (availability, rates, restrictions) from PMS → OTA
 * - PULL/PUSH reservations from OTA → PMS inbox
 *
 * Real OpenTravel XML / partner APIs live ONLY inside adapters.
 * Services never call OTA HTTP directly.
 */
export type AdapterResult = {
  ok: boolean;
  dryRun: boolean;
  message: string;
  details?: Record<string, unknown>;
};

export type AriDelta = {
  roomTypeId: string;
  externalRoomCode: string;
  externalRateCode: string | null;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;
  allotment: number;
  rateTiyin?: string;
};

export type RawOtaReservation = {
  externalReservationId: string;
  payload: Record<string, unknown>;
};

export interface ChannelAdapter {
  readonly providerKey: OtaProviderKey;
  /** Validate credentials / hotel code without mutating inventory. */
  ping(ctx: {
    externalHotelId: string | null;
    hasCredentials: boolean;
  }): Promise<AdapterResult>;
  pushAri(ctx: {
    externalHotelId: string | null;
    deltas: AriDelta[];
  }): Promise<AdapterResult>;
  pullReservations(ctx: {
    externalHotelId: string | null;
  }): Promise<{ result: AdapterResult; reservations: RawOtaReservation[] }>;
}

export class AdapterNotReadyError extends Error {
  constructor(providerKey: string, reason: string) {
    super(`[${providerKey}] ${reason}`);
    this.name = "AdapterNotReadyError";
  }
}
