import { prisma } from "@/lib/prisma";
import {
  fail,
  hasActiveListing,
  handleApiError,
  onboardingResponse,
  ok,
  requireHomeStayHost,
  writeAuditLog,
} from "../_utils";

type ListingInput = {
  title?: string;
  description?: string;
  address?: string;
  city?: string;
  region?: string;
  latitude?: number | null;
  longitude?: number | null;
  pricePerNight?: number;
  maxGuests?: number;
  rooms?: number;
  beds?: number;
  bathrooms?: number;
  amenities?: string[];
  images?: string[];
};

function isValidLat(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= -90 && v <= 90;
}
function isValidLng(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= -180 && v <= 180;
}

export async function GET() {
  try {
    const actor = await requireHomeStayHost();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();

    const listings = await prisma.homeStayListing.findMany({
      where: { hostId: actor.id },
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

    const page = 1;
    const limit = data.length || 10;
    const total = data.length;
    return ok({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : 1,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireHomeStayHost();
    const body = (await req.json()) as ListingInput;

    if (
      !body.title ||
      !body.description ||
      !body.address ||
      !body.city ||
      !body.region ||
      body.pricePerNight === undefined ||
      body.maxGuests === undefined ||
      body.rooms === undefined ||
      body.beds === undefined ||
      body.bathrooms === undefined
    ) {
      return fail("Missing required fields", 400);
    }

    if (!Array.isArray(body.amenities) || !Array.isArray(body.images)) {
      return fail("amenities and images must be arrays", 400);
    }

    // Location is mandatory — used for taxi/discovery matching by proximity.
    if (!isValidLat(body.latitude) || !isValidLng(body.longitude)) {
      return fail(
        "Lokatsiya majburiy. Iltimos, xaritadan joyni tanlang (latitude va longitude).",
        400,
      );
    }

    // Listings are auto-approved on creation — no admin moderation step.
    // Admins can still suspend or block listings later via /admin/homestay/listings.
    const listing = await prisma.homeStayListing.create({
      data: {
        hostId: actor.id,
        title: body.title,
        description: body.description,
        address: body.address,
        city: body.city,
        region: body.region,
        latitude: body.latitude,
        longitude: body.longitude,
        pricePerNight: body.pricePerNight,
        maxGuests: body.maxGuests,
        rooms: body.rooms,
        beds: body.beds,
        bathrooms: body.bathrooms,
        amenities: body.amenities,
        images: body.images,
        status: "ACTIVE",
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "HOMESTAY_LISTING_CREATED",
      entity: "HomeStayListing",
      entityId: listing.id,
      newData: {
        title: listing.title,
        city: listing.city,
        status: listing.status,
      },
    });

    return ok(listing, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
