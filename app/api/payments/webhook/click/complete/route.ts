import { NextResponse } from "next/server";
import { parseClickShopHttpBody, processClickShop } from "@/src/modules/payment";

const PATH = "/api/payments/webhook/click/complete";

export async function POST(req: Request) {
  const parsed = await parseClickShopHttpBody(req, PATH);
  if (!parsed.ok) {
    return NextResponse.json(parsed.errorBody);
  }
  return NextResponse.json(
    await processClickShop({
      body: parsed.body,
      rawBody: parsed.rawBody,
      path: PATH,
      headers: parsed.headers,
    }),
  );
}
