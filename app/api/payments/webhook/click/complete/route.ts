import { clickHttpHandler } from "@/src/modules/payment";

export async function POST(req: Request) {
  return clickHttpHandler(req, { path: "/api/payments/webhook/click/complete" });
}
