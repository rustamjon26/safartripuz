import type { ChannelReservationInboxStatus } from "./types";

const TRANSITIONS: Record<
  ChannelReservationInboxStatus,
  ChannelReservationInboxStatus[]
> = {
  RECEIVED: ["MAPPED", "IGNORED", "FAILED"],
  MAPPED: ["BOOKING_CREATED", "FAILED", "IGNORED"],
  BOOKING_CREATED: [],
  IGNORED: [],
  FAILED: ["RECEIVED"],
};

export function canInboxTransition(
  from: ChannelReservationInboxStatus,
  to: ChannelReservationInboxStatus,
): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export function assertInboxTransition(
  from: ChannelReservationInboxStatus,
  to: ChannelReservationInboxStatus,
): void {
  if (!canInboxTransition(from, to)) {
    throw new ChannelInboxStatusError(
      `Illegal inbox transition: ${from} → ${to}`,
    );
  }
}

export class ChannelInboxStatusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChannelInboxStatusError";
  }
}
