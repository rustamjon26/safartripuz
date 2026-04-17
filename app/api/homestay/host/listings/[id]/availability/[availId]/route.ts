import { prisma } from "@/lib/prisma";
import {
  fail,
  hasActiveListing,
  handleApiError,
  onboardingResponse,
  ok,
  requireHomeStayHost,
  writeAuditLog,
} from "../../../../_utils";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; availId: string }> },
) {
  try {
    const actor = await requireHomeStayHost();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    const { id, availId } = await params;

    const listing = await prisma.homeStayListing.findFirst({
      where: { id, hostId: actor.id },
      select: { id: true },
    });
    if (!listing) return fail("Listing not found", 404);

    const block = await prisma.homeStayAvailability.findFirst({
      where: { id: availId, listingId: listing.id },
    });
    if (!block) return fail("Availability block not found", 404);

    await prisma.homeStayAvailability.delete({ where: { id: block.id } });
    await writeAuditLog({
      actorId: actor.id,
      action: "HOMESTAY_AVAILABILITY_UNBLOCKED",
      entity: "HomeStayAvailability",
      entityId: block.id,
      oldData: {
        listingId: block.listingId,
        startDate: block.startDate,
        endDate: block.endDate,
        reason: block.reason,
      },
    });

    return ok({ id: block.id });
  } catch (error) {
    return handleApiError(error);
  }
}
