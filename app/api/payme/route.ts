import { paymeHttpHandler } from "@/src/modules/payment";

/** Merchant API — hotel Booking + PaymeTransaction (account.booking_id). */
export async function POST(req: Request) {
  return paymeHttpHandler(req, {
    accountMode: "booking_id",
    path: "/api/payme",
  });
}
