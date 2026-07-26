import { paymeHttpHandler } from "@/src/modules/payment";

/** Travel-plan Payment stack (account.order_id). */
export async function POST(req: Request) {
  return paymeHttpHandler(req, {
    accountMode: "order_id",
    path: "/api/payments/webhook/payme",
  });
}
