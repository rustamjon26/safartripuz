import { prisma } from "@/lib/prisma";
import {
  fail,
  hasActiveListing,
  handleApiError,
  onboardingResponse,
  ok,
  requireHomeStayHost,
  writeAuditLog,
} from "../../_utils";

type ListingUpdateInput = {
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
  verificationNote?: string | null;
};

async function getHostListing(actorId: string, listingId: string) {
  return prisma.homeStayListing.findFirst({
    where: { id: listingId, hostId: actorId },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireHomeStayHost();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    const { id } = await params;

    const listing = await prisma.homeStayListing.findFirst({
      where: { id, hostId: actor.id },
      include: {
        availabilities: { orderBy: { startDate: "asc" } },
        reviews: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!listing) return fail("Listing not found", 404);
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
    const actor = await requireHomeStayHost();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    const { id } = await params;
    const existing = await getHostListing(actor.id, id);
    if (!existing) return fail("Listing not found", 404);

    const body = (await req.json()) as ListingUpdateInput;
    if ("status" in body) return fail("status cannot be updated by host", 400);

    const updated = await prisma.homeStayListing.update({
      where: { id: existing.id },
      data: {
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
        verificationNote: body.verificationNote,
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "HOMESTAY_LISTING_UPDATED",
      entity: "HomeStayListing",
      entityId: updated.id,
      oldData: {
        title: existing.title,
        city: existing.city,
        pricePerNight: existing.pricePerNight,
      },
      newData: {
        title: updated.title,
        city: updated.city,
        pricePerNight: updated.pricePerNight,
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
    const actor = await requireHomeStayHost();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    const { id } = await params;
    const listing = await getHostListing(actor.id, id);
    if (!listing) return fail("Listing not found", 404);

    const activeBookings = await prisma.homeStayBooking.count({
      where: {
        listingId: listing.id,
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
      },
    });
    if (activeBookings > 0) {
      return fail("Cannot delete listing with active bookings", 400);
    }

    await prisma.homeStayListing.delete({ where: { id: listing.id } });
    await writeAuditLog({
      actorId: actor.id,
      action: "HOMESTAY_LISTING_DELETED",
      entity: "HomeStayListing",
      entityId: listing.id,
      oldData: { title: listing.title, city: listing.city },
    });

    return ok({ id: listing.id });
  } catch (error) {
    return handleApiError(error);
  }
}
