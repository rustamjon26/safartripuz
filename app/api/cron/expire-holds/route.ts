import { NextResponse } from "next/server";
import { bookingService } from "@/src/modules/booking";
import { expirePendingTaxiOrders } from "@/lib/taxi/expireOrders";
import { expireGuideBookings } from "@/lib/guide/expireBookings";

/**
 * Optional HTTP entry for external cron. Mirrors scripts/expire-booking-holds.ts,
 * which is what PM2 actually runs.
 * Authorize with Authorization: Bearer $CRON_SECRET
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ message: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const holds = await bookingService.expireHolds(100);
  const taxi = await expirePendingTaxiOrders(100);
  const guide = await expireGuideBookings(100);
  return NextResponse.json({ ok: true, ...holds, taxi, guide });
}
