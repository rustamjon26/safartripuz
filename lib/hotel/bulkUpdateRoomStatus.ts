import type { RoomOperationalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type BulkUpdateRoomStatusInput = {
  hotelId: string;
  roomIds: string[];
  status: RoomOperationalStatus;
  note?: string;
};

export type BulkUpdateRoomStatusResult = {
  updatedCount: number;
  status: RoomOperationalStatus;
  rooms: Array<{
    id: string;
    room_number: string;
    status: RoomOperationalStatus;
  }>;
};

export class BulkUpdateRoomStatusError extends Error {
  constructor(
    message: string,
    public status: number,
    public invalid_ids?: string[],
    public blocked_rooms?: string[],
  ) {
    super(message);
    this.name = "BulkUpdateRoomStatusError";
  }
}

export async function bulkUpdateRoomStatus(
  input: BulkUpdateRoomStatusInput,
): Promise<BulkUpdateRoomStatusResult> {
  const uniqueIds = [...new Set(input.roomIds)];

  const rooms = await prisma.physicalRoom.findMany({
    where: { id: { in: uniqueIds }, hotelId: input.hotelId },
    select: { id: true, roomNumber: true, status: true },
  });

  const foundIds = new Set(rooms.map((r) => r.id));
  const invalidIds = uniqueIds.filter((id) => !foundIds.has(id));

  if (invalidIds.length > 0) {
    throw new BulkUpdateRoomStatusError(
      "Ba'zi xonalar bu mehmonxonaga tegishli emas",
      403,
      invalidIds,
    );
  }

  if (input.status === "AVAILABLE") {
    const activeAssignments = await prisma.bookingRoomAssignment.findMany({
      where: {
        physicalRoomId: { in: uniqueIds },
        status: "ACTIVE",
        booking: { status: "CHECKED_IN" },
      },
      select: {
        physicalRoom: { select: { roomNumber: true, status: true } },
      },
    });

    const blockedRooms = [
      ...new Set(
        activeAssignments
          .filter((a) => a.physicalRoom.status === "OCCUPIED")
          .map((a) => a.physicalRoom.roomNumber),
      ),
    ];

    if (blockedRooms.length > 0) {
      throw new BulkUpdateRoomStatusError(
        `${blockedRooms.length} ta xona faol bron bilan band`,
        409,
        undefined,
        blockedRooms,
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.physicalRoom.updateMany({
      where: { id: { in: uniqueIds }, hotelId: input.hotelId },
      data: { status: input.status },
    });

    // RoomStatusLog jadvali schema da yo'q — note faqat audit log orqali saqlanadi.

    return tx.physicalRoom.findMany({
      where: { id: { in: uniqueIds }, hotelId: input.hotelId },
      select: { id: true, roomNumber: true, status: true },
      orderBy: { roomNumber: "asc" },
    });
  });

  return {
    updatedCount: updated.length,
    status: input.status,
    rooms: updated.map((room) => ({
      id: room.id,
      room_number: room.roomNumber,
      status: room.status,
    })),
  };
}
