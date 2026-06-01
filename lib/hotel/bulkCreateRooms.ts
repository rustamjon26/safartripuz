import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type BulkCreateRoomsInput = {
  hotelId: string;
  roomTypeId: string;
  floor: number;
  count?: number;
  startNumber?: number;
  numberPrefix?: string;
  customNumbers?: string[];
};

export type BulkCreateRoomsResult = {
  createdCount: number;
  rooms: Array<{
    id: string;
    room_number: string;
    floor: number;
    room_type_id: string;
    status: string;
    is_active: boolean;
  }>;
  skipped: string[];
};

export class BulkRoomsError extends Error {
  constructor(
    message: string,
    public status: number,
    public duplicates?: string[],
  ) {
    super(message);
    this.name = "BulkRoomsError";
  }
}

function generateRoomNumbers(input: BulkCreateRoomsInput): string[] {
  const custom = input.customNumbers?.map((n) => n.trim()).filter(Boolean);
  if (custom?.length) {
    return custom;
  }

  const count = input.count;
  const start = input.startNumber;
  if (count == null || start == null) {
    throw new BulkRoomsError(
      "count va start_number custom_numbers bo'lmasa majburiy",
      400,
    );
  }

  const numbers: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const base = String(start + i);
    numbers.push(input.numberPrefix ? `${input.numberPrefix}${base}` : base);
  }
  return numbers;
}

function findDuplicatesInBatch(numbers: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const n of numbers) {
    if (seen.has(n)) duplicates.add(n);
    seen.add(n);
  }
  return [...duplicates];
}

function toApiRoom(room: {
  id: string;
  roomTypeId: string;
  roomNumber: string;
  floor: string | null;
  status: string;
  isActive: boolean;
}) {
  const floorNum = room.floor != null && room.floor !== "" ? Number(room.floor) : null;
  return {
    id: room.id,
    room_number: room.roomNumber,
    floor: Number.isFinite(floorNum) ? floorNum! : 0,
    room_type_id: room.roomTypeId,
    status: room.status.toLowerCase(),
    is_active: room.isActive,
  };
}

export async function bulkCreatePhysicalRooms(
  input: BulkCreateRoomsInput,
): Promise<BulkCreateRoomsResult> {
  const hotel = await prisma.hotel.findUnique({
    where: { id: input.hotelId },
    select: { id: true },
  });
  if (!hotel) {
    throw new BulkRoomsError("Mehmonxona topilmadi", 404);
  }

  const roomType = await prisma.roomType.findFirst({
    where: { id: input.roomTypeId, hotelId: input.hotelId },
    select: { id: true },
  });
  if (!roomType) {
    throw new BulkRoomsError("Xona turi topilmadi", 404);
  }

  const roomNumbers = generateRoomNumbers(input);
  if (roomNumbers.length === 0) {
    throw new BulkRoomsError("Kamida bitta xona raqami kerak", 400);
  }
  if (roomNumbers.length > 200) {
    throw new BulkRoomsError("Bir martada ko'pi bilan 200 ta xona yaratish mumkin", 400);
  }

  const batchDuplicates = findDuplicatesInBatch(roomNumbers);
  if (batchDuplicates.length) {
    throw new BulkRoomsError(
      "So'rov ichida takroriy xona raqamlari bor",
      409,
      batchDuplicates,
    );
  }

  const existing = await prisma.physicalRoom.findMany({
    where: {
      hotelId: input.hotelId,
      roomNumber: { in: roomNumbers },
    },
    select: { roomNumber: true },
  });

  if (existing.length) {
    throw new BulkRoomsError(
      "Mehmonxonada allaqachon mavjud xona raqamlari bor",
      409,
      existing.map((r) => r.roomNumber),
    );
  }

  const floorStr = String(input.floor);
  const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.physicalRoom.createMany({
      data: roomNumbers.map((roomNumber) => ({
        hotelId: input.hotelId,
        roomTypeId: input.roomTypeId,
        roomNumber,
        floor: floorStr,
        status: "AVAILABLE" as const,
        isActive: true,
      })),
    });

    return tx.physicalRoom.findMany({
      where: {
        hotelId: input.hotelId,
        roomNumber: { in: roomNumbers },
      },
      orderBy: { roomNumber: "asc" },
    });
  });

  return {
    createdCount: created.length,
    rooms: created.map(toApiRoom),
    skipped: [],
  };
}
