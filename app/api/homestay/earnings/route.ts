import { NextResponse } from "next/server";
import { loadPartnerEarningsHybrid } from "@/lib/earnings/loadPartnerEarningsHybrid";
import {
  handleApiError,
  hasActiveListing,
  onboardingResponse,
  requireHomeStayHost,
} from "@/app/api/homestay/host/_utils";

/**
 * Homestay host earnings — mirrors GET /api/hotel/earnings hybrid pattern.
 * Ledger balances + PartnerEarning HOMESTAY line items.
 */
export async function GET() {
  try {
    const actor = await requireHomeStayHost();
    if (!(await hasActiveListing(actor.id))) {
      return onboardingResponse();
    }

    const payload = await loadPartnerEarningsHybrid({
      partnerUserId: actor.id,
      bookingType: "HOMESTAY",
    });

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
