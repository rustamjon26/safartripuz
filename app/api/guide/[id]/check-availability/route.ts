import { GUIDE_ERRORS } from "@/lib/guide/errors";
import { checkGuideSlot } from "@/lib/guide/checkAvailability";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { fail, handleApiError, ok } from "../../_utils";

type CheckInput = {
  date?: string;
  startTime?: string;
  endTime?: string;
  groupSize?: number;
};

function isValidTime(v: string) {
  return /^\d{2}:\d{2}$/.test(v);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await params;
    const body = (await req.json()) as CheckInput;
    if (!body.date || !body.startTime || !body.endTime || !body.groupSize) {
      return fail("date, startTime, endTime, groupSize are required", 400);
    }
    if (!isValidTime(body.startTime) || !isValidTime(body.endTime) || body.startTime >= body.endTime) {
      return fail(GUIDE_ERRORS.INVALID_TIME_RANGE, 400);
    }

    const date = new Date(body.date);
    if (Number.isNaN(date.getTime())) return fail("Invalid date", 400);

    const listing = await prisma.guideListing.findFirst({
      where: { id, status: "ACTIVE" },
      select: { hostId: true },
    });
    if (!listing) return fail(GUIDE_ERRORS.LISTING_NOT_FOUND, 404);

    const result = await checkGuideSlot({
      guideId: listing.hostId,
      listingId: id,
      date,
      startTime: body.startTime,
      endTime: body.endTime,
      groupSize: body.groupSize,
    });

    if (!result.listing) return fail(GUIDE_ERRORS.LISTING_NOT_FOUND, 404);
    return ok({
      available: result.available,
      totalPrice: result.totalPrice,
      hours: result.hours,
      conflicts: result.available || !result.reason ? [] : [{ message: result.reason }],
    });
  } catch (error) {
    return handleApiError(error);
  }
}
