import { Prisma, type BookingStatus, type HotelGuest } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CreateGuestBody, UpdateGuestBody } from "@/lib/hotel/hotelGuestSchema";
import { parseBirthDate } from "@/lib/hotel/hotelGuestSchema";

export class HotelGuestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "HotelGuestError";
  }
}

export type ListGuestsInput = {
  hotelId: string;
  search?: string;
  isVip?: boolean;
  isBlacklist?: boolean;
  page: number;
  perPage: number;
  sort: "name" | "visit_count" | "total_spent" | "last_visit";
};

export type GuestListItem = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  nationality: string | null;
  is_vip: boolean;
  is_blacklist: boolean;
  visit_count: number;
  total_spent: number;
  last_visit: string | null;
};

export type GuestBookingHistoryItem = {
  id: string;
  check_in: string;
  check_out: string;
  status: BookingStatus;
  total_amount: number;
  room_number: string | null;
  room_type: string | null;
};

export type GuestDetail = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  passport_id: string | null;
  nationality: string | null;
  birth_date: string | null;
  gender: string | null;
  address: string | null;
  notes: string | null;
  is_vip: boolean;
  is_blacklist: boolean;
  visit_count: number;
  total_spent: number;
  first_visit: string | null;
  last_visit: string | null;
  created_at: string;
  updated_at: string;
  bookings: GuestBookingHistoryItem[];
};

function formatDateOnly(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildWhere(input: ListGuestsInput): Prisma.HotelGuestWhereInput {
  const where: Prisma.HotelGuestWhereInput = { hotelId: input.hotelId };

  if (input.isVip !== undefined) where.isVip = input.isVip;
  if (input.isBlacklist !== undefined) where.isBlacklist = input.isBlacklist;

  if (input.search) {
    where.OR = [
      { fullName: { contains: input.search } },
      { phone: { contains: input.search } },
      { passportId: { contains: input.search } },
    ];
  }

  return where;
}

function buildOrderBy(
  sort: ListGuestsInput["sort"],
): Prisma.HotelGuestOrderByWithRelationInput | null {
  switch (sort) {
    case "name":
      return { fullName: "asc" };
    case "visit_count":
      return { visitCount: "desc" };
    case "total_spent":
      return { totalSpent: "desc" };
    case "last_visit":
    default:
      return null;
  }
}

async function findGuestsByLastVisit(
  where: Prisma.HotelGuestWhereInput,
  skip: number,
  take: number,
): Promise<string[]> {
  const candidates = await prisma.hotelGuest.findMany({
    where,
    select: {
      id: true,
      createdAt: true,
      bookings: {
        select: { checkInDate: true },
        orderBy: { checkInDate: "desc" },
        take: 1,
      },
    },
  });

  candidates.sort((a, b) => {
    const aTime = a.bookings[0]?.checkInDate?.getTime() ?? 0;
    const bTime = b.bookings[0]?.checkInDate?.getTime() ?? 0;
    if (bTime !== aTime) return bTime - aTime;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return candidates.slice(skip, skip + take).map((row) => row.id);
}

function serializeListItem(
  guest: HotelGuest & { bookings: Array<{ checkInDate: Date }> },
): GuestListItem {
  const lastBooking = guest.bookings[0];
  return {
    id: guest.id,
    full_name: guest.fullName,
    phone: guest.phone,
    email: guest.email,
    nationality: guest.nationality,
    is_vip: guest.isVip,
    is_blacklist: guest.isBlacklist,
    visit_count: guest.visitCount,
    total_spent: Number(guest.totalSpent),
    last_visit: lastBooking ? formatDateOnly(lastBooking.checkInDate) : null,
  };
}

function serializeGuestDetail(
  guest: HotelGuest,
  bookings: GuestBookingHistoryItem[],
  visitBounds: { first: Date | null; last: Date | null },
): GuestDetail {
  return {
    id: guest.id,
    full_name: guest.fullName,
    phone: guest.phone,
    email: guest.email,
    passport_id: guest.passportId,
    nationality: guest.nationality,
    birth_date: guest.birthDate ? formatDateOnly(guest.birthDate) : null,
    gender: guest.gender,
    address: guest.address,
    notes: guest.notes,
    is_vip: guest.isVip,
    is_blacklist: guest.isBlacklist,
    visit_count: guest.visitCount,
    total_spent: Number(guest.totalSpent),
    first_visit: visitBounds.first ? formatDateOnly(visitBounds.first) : null,
    last_visit: visitBounds.last ? formatDateOnly(visitBounds.last) : null,
    created_at: guest.createdAt.toISOString(),
    updated_at: guest.updatedAt.toISOString(),
    bookings,
  };
}

function mapBookingHistory(
  booking: Prisma.HotelBookingGetPayload<{
    include: {
      roomType: { select: { name: true } };
      roomAssignments: {
        include: { physicalRoom: { select: { roomNumber: true } } };
      };
    };
  }>,
): GuestBookingHistoryItem {
  const assignment = booking.roomAssignments.find((a) => a.status === "ACTIVE") ??
    booking.roomAssignments[0];

  return {
    id: booking.id,
    check_in: formatDateOnly(booking.checkInDate),
    check_out: formatDateOnly(booking.checkOutDate),
    status: booking.status,
    total_amount: Number(booking.totalAmount),
    room_number: assignment?.physicalRoom?.roomNumber ?? null,
    room_type: booking.roomType?.name ?? null,
  };
}

export async function listHotelGuests(input: ListGuestsInput) {
  const where = buildWhere(input);
  const skip = (input.page - 1) * input.perPage;
  const orderBy = buildOrderBy(input.sort);

  const total = await prisma.hotelGuest.count({ where });

  let rows: Array<
    HotelGuest & { bookings: Array<{ checkInDate: Date }> }
  >;

  if (orderBy) {
    rows = await prisma.hotelGuest.findMany({
      where,
      orderBy,
      skip,
      take: input.perPage,
      include: {
        bookings: {
          select: { checkInDate: true },
          orderBy: { checkInDate: "desc" },
          take: 1,
        },
      },
    });
  } else {
    const ids = await findGuestsByLastVisit(where, skip, input.perPage);
    if (ids.length === 0) {
      rows = [];
    } else {
      const unsorted = await prisma.hotelGuest.findMany({
        where: { id: { in: ids } },
        include: {
          bookings: {
            select: { checkInDate: true },
            orderBy: { checkInDate: "desc" },
            take: 1,
          },
        },
      });
      const byId = new Map(unsorted.map((row) => [row.id, row]));
      rows = ids.map((id) => byId.get(id)).filter((row): row is NonNullable<typeof row> => !!row);
    }
  }

  return {
    guests: rows.map(serializeListItem),
    pagination: {
      total,
      page: input.page,
      per_page: input.perPage,
      total_pages: total === 0 ? 0 : Math.ceil(total / input.perPage),
    },
  };
}

export async function createHotelGuest(hotelId: string, body: CreateGuestBody) {
  try {
    const guest = await prisma.hotelGuest.create({
      data: {
        hotelId,
        fullName: body.fullName,
        phone: body.phone,
        email: body.email ?? null,
        passportId: body.passportId ?? null,
        nationality: body.nationality ?? null,
        birthDate: parseBirthDate(body.birthDate) ?? null,
        gender: body.gender ?? null,
        address: body.address ?? null,
        notes: body.notes ?? null,
        isVip: body.isVip ?? false,
        isBlacklist: body.isBlacklist ?? false,
      },
      include: {
        bookings: {
          select: { checkInDate: true },
          orderBy: { checkInDate: "desc" },
          take: 1,
        },
      },
    });

    return serializeListItem(guest);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HotelGuestError("Bu telefon raqam allaqachon ro'yxatda", 409);
    }
    throw e;
  }
}

export async function getHotelGuestDetail(hotelId: string, guestId: string) {
  const guest = await prisma.hotelGuest.findFirst({
    where: { id: guestId, hotelId },
    include: {
      bookings: {
        orderBy: { checkInDate: "desc" },
        take: 10,
        include: {
          roomType: { select: { name: true } },
          roomAssignments: {
            include: { physicalRoom: { select: { roomNumber: true } } },
          },
        },
      },
    },
  });

  if (!guest) {
    throw new HotelGuestError("Mehmon topilmadi", 404);
  }

  const visitBounds = await prisma.hotelBooking.aggregate({
    where: { guestId: guest.id, hotelId },
    _min: { checkInDate: true },
    _max: { checkInDate: true },
  });

  return serializeGuestDetail(
    guest,
    guest.bookings.map(mapBookingHistory),
    {
      first: visitBounds._min.checkInDate,
      last: visitBounds._max.checkInDate,
    },
  );
}

export async function updateHotelGuest(
  hotelId: string,
  guestId: string,
  body: UpdateGuestBody,
  actorRole: string,
) {
  const existing = await prisma.hotelGuest.findFirst({
    where: { id: guestId, hotelId },
  });

  if (!existing) {
    throw new HotelGuestError("Mehmon topilmadi", 404);
  }

  if (
    body.isBlacklist === false &&
    existing.isBlacklist === true &&
    actorRole !== "admin" &&
    actorRole !== "super_admin"
  ) {
    throw new HotelGuestError("Qora ro'yxatdan olib tashlash uchun admin ruxsati kerak", 403);
  }

  const data: Prisma.HotelGuestUpdateInput = {};

  if (body.fullName !== undefined) data.fullName = body.fullName;
  if (body.phone !== undefined) data.phone = body.phone;
  if (body.email !== undefined) data.email = body.email;
  if (body.passportId !== undefined) data.passportId = body.passportId;
  if (body.nationality !== undefined) data.nationality = body.nationality;
  if (body.birthDate !== undefined) data.birthDate = parseBirthDate(body.birthDate);
  if (body.gender !== undefined) data.gender = body.gender;
  if (body.address !== undefined) data.address = body.address;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.isVip !== undefined) data.isVip = body.isVip;
  if (body.isBlacklist !== undefined) data.isBlacklist = body.isBlacklist;

  try {
    await prisma.hotelGuest.update({
      where: { id: guestId },
      data,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HotelGuestError("Bu telefon raqam allaqachon ro'yxatda", 409);
    }
    throw e;
  }

  return getHotelGuestDetail(hotelId, guestId);
}

export async function deleteHotelGuest(hotelId: string, guestId: string) {
  const guest = await prisma.hotelGuest.findFirst({
    where: { id: guestId, hotelId },
  });

  if (!guest) {
    throw new HotelGuestError("Mehmon topilmadi", 404);
  }

  const activeBooking = await prisma.hotelBooking.findFirst({
    where: {
      guestId,
      hotelId,
      status: { in: ["CONFIRMED", "CHECKED_IN"] },
    },
  });

  if (activeBooking) {
    throw new HotelGuestError("Faol bronlari bor mehmonni o'chirib bo'lmaydi", 409);
  }

  await prisma.hotelGuest.delete({ where: { id: guestId } });

  return { success: true };
}
