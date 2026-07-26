import type { BookingEventActor, BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/src/shared/db/prisma";
import type { Tx } from "./booking.repository";

export class BookingEventRepository {
  async create(
    input: {
      bookingId: string;
      fromStatus: BookingStatus;
      toStatus: BookingStatus;
      reason?: string;
      actor: BookingEventActor;
      metadata?: Prisma.InputJsonValue;
    },
    client: Tx | typeof prisma = prisma,
  ): Promise<void> {
    await client.bookingEvent.create({
      data: {
        bookingId: input.bookingId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        reason: input.reason ?? null,
        actor: input.actor,
        metadata: input.metadata ?? undefined,
      },
    });
  }
}

export const bookingEventRepository = new BookingEventRepository();
