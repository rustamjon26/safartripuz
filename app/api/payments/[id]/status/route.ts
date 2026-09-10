import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalUser } from "@/lib/authz";
import { paymentService } from "@/src/modules/payment";

const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/);

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const parsed = idSchema.safeParse((await ctx.params).id);
  if (!parsed.success) {
    return NextResponse.json({ outcome: "not_found" });
  }
  const actor = await getOptionalUser();
  const view = await paymentService.getReturnView(parsed.data, actor?.id ?? null);
  return NextResponse.json(view);
}
