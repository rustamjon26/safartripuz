import { prisma } from "@/lib/prisma";
import { checkHomeStayAvailability } from "@/lib/homestay/checkAvailability";
import { HOMESTAY_ERRORS } from "@/lib/homestay/errors";
import { fail, handleApiError, ok } from "../../host/_utils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const listing = await prisma.homeStayListing.findFirst({
      where: { id, status: "ACTIVE" },
      select: { id: true },
    });
    if (!listing) return fail(HOMESTAY_ERRORS.LISTING_NOT_ACTIVE, 404);

    const from = new Date();
    const to = new Date(from);
    to.setMonth(to.getMonth() + 6);
    const availability = await checkHomeStayAvailability(id, from, to);

    const unavailableDates = availability.conflicts.flatMap((conflict) => {
      const days: string[] = [];
      const cursor = new Date(conflict.startDate);
      while (cursor < conflict.endDate) {
        days.push(cursor.toISOString().slice(0, 10));
        cursor.setDate(cursor.getDate() + 1);
      }
      return days;
    });

    const uniqueUnavailableDates = Array.from(new Set(unavailableDates)).sort();

    return ok({
      available: availability.available,
      conflicts: availability.conflicts,
      unavailableDates: uniqueUnavailableDates,
      period: { from, to },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
