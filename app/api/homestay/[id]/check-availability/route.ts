import { prisma } from "@/lib/prisma";
import { checkHomeStayAvailability } from "@/lib/homestay/checkAvailability";
import { HOMESTAY_ERRORS } from "@/lib/homestay/errors";
import { fail, handleApiError, ok } from "../../host/_utils";

type CheckInput = {
  checkIn?: string;
  checkOut?: string;
  guestCount?: number;
};

function calcNights(checkIn: Date, checkOut: Date) {
  const diff = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as CheckInput;

    if (!body.checkIn || !body.checkOut || !body.guestCount) {
      return fail("checkIn, checkOut, guestCount are required", 400);
    }

    const checkIn = new Date(body.checkIn);
    const checkOut = new Date(body.checkOut);
    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      return fail("Invalid check-in/check-out date", 400);
    }
    if (checkIn >= checkOut) {
      return fail("checkOut must be after checkIn", 400);
    }

    const listing = await prisma.homeStayListing.findFirst({
      where: { id, status: "ACTIVE" },
      select: {
        id: true,
        maxGuests: true,
        pricePerNight: true,
      },
    });
    if (!listing) return fail(HOMESTAY_ERRORS.LISTING_NOT_ACTIVE, 404);
    if (body.guestCount > listing.maxGuests) {
      return fail(HOMESTAY_ERRORS.GUEST_LIMIT, 400);
    }

    const nights = calcNights(checkIn, checkOut);
    const totalPrice = Number(listing.pricePerNight) * nights;
    const availability = await checkHomeStayAvailability(id, checkIn, checkOut);
    const unavailableDates = availability.conflicts.flatMap((conflict) => {
      const days: string[] = [];
      const cursor = new Date(conflict.startDate);
      while (cursor < conflict.endDate) {
        days.push(cursor.toISOString().slice(0, 10));
        cursor.setDate(cursor.getDate() + 1);
      }
      return days;
    });

    return ok({
      available: availability.available,
      unavailableDates: Array.from(new Set(unavailableDates)).sort(),
      conflicts: availability.conflicts,
      totalPrice,
      nights,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
