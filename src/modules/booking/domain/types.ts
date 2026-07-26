import type { BookingEventActor } from "@prisma/client";
import type { BookingStatus } from "./booking.state";

export type BookingActor = BookingEventActor;

export type TransitionContext = {
  actor: BookingActor;
  reason?: string;
  metadata?: Record<string, unknown>;
};

export type { BookingStatus };
