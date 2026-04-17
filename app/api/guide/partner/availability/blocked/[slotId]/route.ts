import { prisma } from "@/lib/prisma";
import { GUIDE_ERRORS } from "@/lib/guide/errors";
import { fail, handleApiError, hasActiveListing, ok, onboardingResponse, requireGuidePartner } from "../../../_utils";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slotId: string }> },
) {
  try {
    const actor = await requireGuidePartner();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    const { slotId } = await params;

    const slot = await prisma.guideBlockedSlot.findFirst({
      where: { id: slotId, guideId: actor.id },
      select: { id: true },
    });
    if (!slot) return fail(GUIDE_ERRORS.BLOCKED_SLOT_NOT_FOUND, 404);

    await prisma.guideBlockedSlot.delete({ where: { id: slot.id } });
    return ok({ id: slot.id });
  } catch (error) {
    return handleApiError(error);
  }
}
