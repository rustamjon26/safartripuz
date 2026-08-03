export {
  channelService,
  ChannelService,
  ChannelNotFoundError,
} from "./service/channel.service";
export { ChannelSyncStatusError } from "./domain/sync-status";
export { ChannelInboxStatusError } from "./domain/inbox-status";
export { getChannelAdapter, isOtaProviderKey } from "./domain/adapters/registry";
export {
  enqueueSyncSchema,
  upsertMappingSchema,
  ingestReservationSchema,
} from "./domain/validate";
export type {
  ChannelRoomMappingView,
  ChannelSyncJobView,
  ChannelReservationView,
  ChannelSyncKind,
  ChannelSyncJobStatus,
  OtaProviderKey,
} from "./domain/types";
export type { ChannelAdapter, AdapterResult, AriDelta } from "./domain/adapter";
