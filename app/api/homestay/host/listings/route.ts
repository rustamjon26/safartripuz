import { z } from "zod";
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

/** Location is mandatory — taxi and discovery match listings by proximity. */
const LOCATION_REQUIRED =
  "Lokatsiya majburiy. Iltimos, xaritadan joyni tanlang (latitude va longitude).";

const listingCreateSchema = z.object({
  title: z.string().trim().min(1).max(191),
  description: z.string().trim().min(1).max(5000),
  address: z.string().trim().min(1).max(500),
  city: z.string().trim().min(1).max(191),
  region: z.string().trim().min(1).max(191),
  latitude: z.number({ error: LOCATION_REQUIRED }).min(-90).max(90),
  longitude: z.number({ error: LOCATION_REQUIRED }).min(-180).max(180),
  pricePerNight: z.number().positive().finite(),
  maxGuests: z.number().int().positive().max(100),
  rooms: z.number().int().nonnegative().max(100),
  beds: z.number().int().nonnegative().max(100),
  bathrooms: z.number().int().nonnegative().max(100),
  amenities: z.array(z.string().trim().min(1).max(191)).max(100),
  images: z.array(z.string().trim().min(1).max(2000)).max(50),
});

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

    const parsed = listingCreateSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Validatsiya xatosi", 400);
    }
    const body = parsed.data;

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
