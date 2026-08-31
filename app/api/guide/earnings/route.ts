import { NextResponse } from "next/server";
import { loadPartnerEarningsHybrid } from "@/lib/earnings/loadPartnerEarningsHybrid";
import {
  handleApiError,
  hasActiveListing,
  onboardingResponse,
  requireGuidePartner,
} from "@/app/api/guide/partner/_utils";

/**
 * Guide partner earnings — mirrors GET /api/hotel/earnings hybrid pattern.
 * Ledger balances + PartnerEarning GUIDE line items.
 * PE.partnerId / ledger payable ownerId = guide User id (not Partner row id).
 */
export async function GET() {
  try {
    const actor = await requireGuidePartner();
    if (!(await hasActiveListing(actor.id))) {
      return onboardingResponse();
    }

    const payload = await loadPartnerEarningsHybrid({
      partnerUserId: actor.id,
      bookingType: "GUIDE",
    });

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
