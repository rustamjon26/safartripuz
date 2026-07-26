import { NextResponse } from "next/server";
import { bookingService } from "@/src/modules/booking";

/**
 * Optional HTTP entry for external cron.
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

  const result = await bookingService.expireHolds(100);
  return NextResponse.json({ ok: true, ...result });
}
