import type { BookingEventActor, BookingStatus, HotelBooking, Prisma } from "@prisma/client";
import { prisma } from "@/src/shared/db/prisma";

export type Tx = Prisma.TransactionClient;

export class BookingRepository {
  async findById(id: string, client: Tx | typeof prisma = prisma): Promise<HotelBooking | null> {
    return client.hotelBooking.findUnique({ where: { id } });
  }

  async findByIdAndHotelId(
    id: string,
    hotelId: string,
    client: Tx | typeof prisma = prisma,
  ): Promise<HotelBooking | null> {
    return client.hotelBooking.findFirst({ where: { id, hotelId } });
  }

  async createAuditLog(
    input: {
      actorId: string;
      action: string;
      entity: string;
      entityId: string;
      oldData?: Prisma.InputJsonValue;
      newData?: Prisma.InputJsonValue;
    },
    client: Tx | typeof prisma = prisma,
  ): Promise<void> {
    await client.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        oldData: input.oldData ?? undefined,
        newData: input.newData ?? undefined,
      },
    });
  }

  async lockByIdForUpdate(id: string, client: Tx): Promise<HotelBooking | null> {
    const rows = await client.$queryRawUnsafe<HotelBooking[]>(
      `SELECT * FROM HotelBooking WHERE id = ? FOR UPDATE`,
      id,
    );
    return rows[0] ?? null;
  }

  async create(
    data: Prisma.HotelBookingCreateInput,
    client: Tx,
  ): Promise<HotelBooking> {
    return client.hotelBooking.create({ data });
  }

  async updateStatus(
    id: string,
    status: BookingStatus,
    extra: Prisma.HotelBookingUpdateInput = {},
    client: Tx,
  ): Promise<HotelBooking> {
    return client.hotelBooking.update({
      where: { id },
      data: { status, ...extra },
    });
  }

  /**
   * Conditional expire: only if still HELD and hold expired.
   * Returns number of rows updated (0 or 1).
   */
  async expireHeldIfDue(id: string, client: Tx): Promise<number> {
    const result = await client.$executeRawUnsafe(
      `UPDATE HotelBooking
       SET status = 'EXPIRED', holdExpiresAt = NULL, updatedAt = NOW(3)
       WHERE id = ? AND status = 'HELD' AND holdExpiresAt IS NOT NULL AND holdExpiresAt < NOW(3)`,
      id,
    );
    return Number(result);
  }

  /** @deprecated Prefer bookingEventRepository.create */
  async createEvent(
    input: {
      bookingId: string;
      fromStatus: BookingStatus;
      toStatus: BookingStatus;
      reason?: string;
      actor: BookingEventActor;
      metadata?: Prisma.InputJsonValue;
    },
    client: Tx,
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

  async findExpiredHolds(limit: number, client: Tx | typeof prisma = prisma) {
    return client.hotelBooking.findMany({
      where: {
        status: "HELD",
        holdExpiresAt: { lt: new Date() },
      },
      take: limit,
      orderBy: { holdExpiresAt: "asc" },
      select: {
        id: true,
        roomTypeId: true,
        checkInDate: true,
        checkOutDate: true,
        roomCount: true,
        status: true,
      },
    });
  }

  async findExpiredHomestayHolds(limit: number, client: Tx | typeof prisma = prisma) {
    return client.homeStayBooking.findMany({
      where: {
        status: "PENDING",
        holdExpiresAt: { lt: new Date() },
      },
      take: limit,
      orderBy: { holdExpiresAt: "asc" },
      select: {
        id: true,
        listingId: true,
        checkIn: true,
        checkOut: true,
        status: true,
      },
    });
  }

  async findExpiredGuideHolds(limit: number, client: Tx | typeof prisma = prisma) {
    return client.guideBooking.findMany({
      where: {
        status: "PENDING",
        holdExpiresAt: { lt: new Date() },
      },
      take: limit,
      orderBy: { holdExpiresAt: "asc" },
      select: {
        id: true,
        listingId: true,
        guideId: true,
        date: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });
  }
}

export const bookingRepository = new BookingRepository();
