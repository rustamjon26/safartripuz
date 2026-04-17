import { prisma } from "@/lib/prisma";
import { GUIDE_ERRORS } from "@/lib/guide/errors";
import { fail, handleApiError, hasActiveListing, ok, onboardingResponse, requireGuidePartner } from "../../_utils";
import type { GuideCategory } from "@prisma/client";

type ListingUpdateInput = {
  title?: string;
  description?: string;
  meetingPoint?: string | null;
  category?: GuideCategory;
  languages?: string[];
  pricePerHour?: number;
  minHours?: number;
  maxHours?: number;
  maxGroupSize?: number;
  images?: string[];
  region?: string | null;
  duration?: string | null;
};

async function getOwnListing(actorId: string, partnerId: string, id: string) {
  return prisma.guideListing.findFirst({
    where: { id, hostId: actorId, partnerId },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireGuidePartner();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    const { id } = await params;
    const listing = await prisma.guideListing.findFirst({
      where: { id, hostId: actor.id, partnerId: actor.partnerId },
      include: {
        availabilities: { orderBy: { dayOfWeek: "asc" } },
        blockedSlots: { orderBy: [{ date: "asc" }, { startTime: "asc" }] },
        reviews: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!listing) return fail(GUIDE_ERRORS.LISTING_NOT_FOUND, 404);
    return ok(listing);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireGuidePartner();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    const { id } = await params;
    const existing = await getOwnListing(actor.id, actor.partnerId, id);
    if (!existing) return fail(GUIDE_ERRORS.LISTING_NOT_FOUND, 404);

    const body = (await req.json()) as ListingUpdateInput & { status?: unknown };
    if ("status" in body) return fail("status cannot be updated by guide", 400);
    if (body.languages && !Array.isArray(body.languages)) {
      return fail("languages array bo'lishi kerak", 400);
    }
    if (body.images && !Array.isArray(body.images)) {
      return fail("images array bo'lishi kerak", 400);
    }

    const minHours = body.minHours ?? existing.minHours;
    const maxHours = body.maxHours ?? existing.maxHours;
    if (minHours > maxHours) {
      return fail(GUIDE_ERRORS.INVALID_TIME_RANGE, 400);
    }

    const pricePerHour = body.pricePerHour ?? Number(existing.pricePerHour);
    const updated = await prisma.guideListing.update({
      where: { id: existing.id },
      data: {
        title: body.title,
        description: body.description,
        meetingPoint: body.meetingPoint,
        category: body.category,
        language: body.languages?.[0] ?? undefined,
        languages: body.languages,
        pricePerHour: body.pricePerHour,
        minHours: body.minHours,
        maxHours: body.maxHours,
        maxGroupSize: body.maxGroupSize,
        images: body.images,
        region: body.region,
        duration: body.duration,
        pricePerDay: pricePerHour * Math.max(minHours, 1),
      },
    });

    return ok(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireGuidePartner();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    const { id } = await params;
    const listing = await getOwnListing(actor.id, actor.partnerId, id);
    if (!listing) return fail(GUIDE_ERRORS.LISTING_NOT_FOUND, 404);

    const activeBookings = await prisma.guideBooking.count({
      where: {
        listingId: listing.id,
        status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
      },
    });
    if (activeBookings > 0) {
      return fail(GUIDE_ERRORS.LISTING_HAS_ACTIVE_BOOKINGS, 400);
    }

    await prisma.guideListing.delete({ where: { id: listing.id } });
    return ok({ id: listing.id });
  } catch (error) {
    return handleApiError(error);
  }
}
