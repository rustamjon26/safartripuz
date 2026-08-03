export type ChannelSyncKind =
  | "ARI_PUSH"
  | "RESERVATION_PULL"
  | "FULL_REFRESH"
  | "MAPPING_PULL";

export type ChannelSyncJobStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

export type ChannelReservationInboxStatus =
  | "RECEIVED"
  | "MAPPED"
  | "BOOKING_CREATED"
  | "IGNORED"
  | "FAILED";

export type OtaProviderKey = "booking" | "expedia" | "airbnb";

export type ChannelRoomMappingView = {
  id: string;
  hotelId: string;
  providerKey: string;
  roomTypeId: string;
  externalRoomCode: string;
  externalRateCode: string | null;
  active: boolean;
};

export type ChannelSyncJobView = {
  id: string;
  hotelId: string;
  providerKey: string;
  kind: ChannelSyncKind;
  status: ChannelSyncJobStatus;
  attempts: number;
  errorMessage: string | null;
  scheduledAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  resultJson: unknown;
};

export type ChannelReservationView = {
  id: string;
  hotelId: string;
  providerKey: string;
  externalReservationId: string;
  status: ChannelReservationInboxStatus;
  hotelBookingId: string | null;
  errorMessage: string | null;
  receivedAt: string;
  processedAt: string | null;
};

/** BookingSource values for OTA inbound (must match Prisma enum). */
export function bookingSourceForProvider(
  providerKey: OtaProviderKey,
): "BOOKING_COM" | "EXPEDIA" | "AIRBNB" {
  switch (providerKey) {
    case "booking":
      return "BOOKING_COM";
    case "expedia":
      return "EXPEDIA";
    case "airbnb":
      return "AIRBNB";
  }
}
