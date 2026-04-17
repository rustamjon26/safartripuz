import { prisma } from "@/lib/prisma";
import {
  fail,
  hasActiveListing,
  handleApiError,
  onboardingResponse,
  ok,
  requireHomeStayHost,
  writeAuditLog,
} from "../../../_utils";

type AvailabilityInput = {
  startDate?: string;
  endDate?: string;
  reason?: "BOOKED" | "HOST_BLOCKED" | "MAINTENANCE";
};

async function getHostListingId(actorId: string, listingId: string) {
  const listing = await prisma.homeStayListing.findFirst({
    where: { id: listingId, hostId: actorId },
    select: { id: true },
  });
  return listing?.id ?? null;
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
    const listingId = await getHostListingId(actor.id, id);
    if (!listingId) return fail("Listing not found", 404);

    const ranges = await prisma.homeStayAvailability.findMany({
      where: { listingId },
      orderBy: { startDate: "asc" },
    });

    return ok(ranges);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireHomeStayHost();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    const { id } = await params;
    const listingId = await getHostListingId(actor.id, id);
    if (!listingId) return fail("Listing not found", 404);

    const body = (await req.json()) as AvailabilityInput;
    if (!body.startDate || !body.endDate || !body.reason) {
      return fail("startDate, endDate and reason are required", 400);
    }

    const start = new Date(body.startDate);
    const end = new Date(body.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return fail("Invalid date range", 400);
    }
    if (start > end) return fail("startDate must be before endDate", 400);

    const overlap = await prisma.homeStayAvailability.findFirst({
      where: {
        listingId,
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { id: true },
    });
    if (overlap) return fail("Date range overlaps existing block", 400);

    const availability = await prisma.homeStayAvailability.create({
      data: {
        listingId,
        startDate: start,
        endDate: end,
        reason: body.reason,
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "HOMESTAY_AVAILABILITY_BLOCKED",
      entity: "HomeStayAvailability",
      entityId: availability.id,
      newData: {
        listingId,
        startDate: availability.startDate,
        endDate: availability.endDate,
        reason: availability.reason,
      },
    });

    return ok(availability, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
