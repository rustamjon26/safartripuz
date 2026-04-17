import { prisma } from "@/lib/prisma";
import { GUIDE_ERRORS } from "@/lib/guide/errors";
import { fail, handleApiError, hasActiveListing, ok, onboardingResponse, requireGuidePartner } from "../_utils";
import type { GuideCategory } from "@prisma/client";

type ListingCreateInput = {
  title?: string;
  description?: string;
  category?: GuideCategory;
  languages?: string[];
  pricePerHour?: number;
  minHours?: number;
  maxHours?: number;
  maxGroupSize?: number;
  images?: string[];
  meetingPoint?: string;
  region?: string;
  duration?: string;
};

export async function GET() {
  try {
    const actor = await requireGuidePartner();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    const listings = await prisma.guideListing.findMany({
      where: { hostId: actor.id, partnerId: actor.partnerId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { bookings: true } },
        reviews: { select: { rating: true } },
      },
    });

    const data = listings.map((listing) => {
      const ratingCount = listing.reviews.length;
      const avgRating =
        ratingCount === 0
          ? null
          : listing.reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount;

      return {
        ...listing,
        bookingCount: listing._count.bookings,
        avgRating,
        reviews: undefined,
        _count: undefined,
      };
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
    const body = (await req.json()) as ListingCreateInput;

    if (
      !body.title ||
      !body.description ||
      !body.category ||
      body.pricePerHour === undefined ||
      body.minHours === undefined ||
      body.maxHours === undefined ||
      body.maxGroupSize === undefined ||
      !body.meetingPoint
    ) {
      return fail("Missing required fields", 400);
    }

    if (!Array.isArray(body.languages) || body.languages.length === 0) {
      return fail("languages array required", 400);
    }
    if (!Array.isArray(body.images)) {
      return fail("images must be array", 400);
    }
    if (body.minHours > body.maxHours) {
      return fail(GUIDE_ERRORS.INVALID_TIME_RANGE, 400);
    }

    const listing = await prisma.guideListing.create({
      data: {
        partnerId: actor.partnerId,
        hostId: actor.id,
        title: body.title,
        description: body.description,
        meetingPoint: body.meetingPoint,
        language: body.languages[0],
        languages: body.languages,
        category: body.category,
        region: body.region ?? null,
        duration: body.duration ?? null,
        pricePerDay: body.pricePerHour * Math.max(body.minHours, 1),
        pricePerHour: body.pricePerHour,
        minHours: body.minHours,
        maxHours: body.maxHours,
        maxGroupSize: body.maxGroupSize,
        images: body.images,
        status: "PENDING",
      },
    });

    return ok(listing, 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid `prisma.guideListing.create")) {
      return fail(GUIDE_ERRORS.LISTING_NOT_FOUND, 400);
    }
    return handleApiError(error);
  }
}
