import { prisma } from "@/lib/prisma";
import { GUIDE_ERRORS } from "@/lib/guide/errors";
import { fail, handleApiError, hasActiveListing, ok, onboardingResponse, requireGuidePartner } from "../../_utils";

type BlockedInput = {
  date?: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
};

function isValidTime(v: string) {
  return /^\d{2}:\d{2}$/.test(v);
}

export async function GET() {
  try {
    const actor = await requireGuidePartner();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    const now = new Date();
    const after3Months = new Date(now);
    after3Months.setMonth(after3Months.getMonth() + 3);

    const data = await prisma.guideBlockedSlot.findMany({
      where: {
        guideId: actor.id,
        date: { gte: now, lte: after3Months },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return ok({
      data,
      pagination: {
        page: 1,
        limit: data.length || 10,
        total: data.length,
        totalPages: data.length === 0 ? 0 : 1,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireGuidePartner();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    const body = (await req.json()) as BlockedInput;
    if (!body.date || !body.reason) {
      return fail("date va reason majburiy", 400);
    }

    const date = new Date(body.date);
    if (Number.isNaN(date.getTime())) return fail("date noto'g'ri", 400);
    if (body.startTime && !isValidTime(body.startTime)) return fail("startTime noto'g'ri", 400);
    if (body.endTime && !isValidTime(body.endTime)) return fail("endTime noto'g'ri", 400);
    if (body.startTime && body.endTime && body.startTime >= body.endTime) {
      return fail(GUIDE_ERRORS.INVALID_TIME_RANGE, 400);
    }

    const listing = await prisma.guideListing.findFirst({
      where: { hostId: actor.id, partnerId: actor.partnerId },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (!listing) return fail(GUIDE_ERRORS.LISTING_NOT_FOUND, 404);

    const blocked = await prisma.guideBlockedSlot.create({
      data: {
        guideId: actor.id,
        listingId: listing.id,
        date,
        startTime: body.startTime ?? null,
        endTime: body.endTime ?? null,
        note: body.reason,
      },
    });

    return ok(blocked, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
