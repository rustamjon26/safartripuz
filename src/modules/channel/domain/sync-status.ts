import type { ChannelSyncJobStatus } from "./types";

const TRANSITIONS: Record<ChannelSyncJobStatus, ChannelSyncJobStatus[]> = {
  QUEUED: ["RUNNING", "CANCELLED"],
  RUNNING: ["SUCCEEDED", "FAILED"],
  SUCCEEDED: [],
  FAILED: ["QUEUED"],
  CANCELLED: [],
};

export function canSyncTransition(
  from: ChannelSyncJobStatus,
  to: ChannelSyncJobStatus,
): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export function assertSyncTransition(
  from: ChannelSyncJobStatus,
  to: ChannelSyncJobStatus,
): void {
  if (!canSyncTransition(from, to)) {
    throw new ChannelSyncStatusError(
      `Illegal sync job transition: ${from} → ${to}`,
    );
  }
}

export class ChannelSyncStatusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChannelSyncStatusError";
  }
}
