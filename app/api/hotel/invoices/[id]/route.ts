import { NextResponse } from "next/server";
import { invoiceService, patchInvoiceStatusSchema } from "@/src/modules/invoice";
import { mapHotelOpsError, requireHotelOps } from "../../_ops-utils";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { hotelId } = await requireHotelOps();
    const { id } = await ctx.params;
    const invoice = await invoiceService.get(hotelId, id);
    return NextResponse.json({ invoice });
  } catch (e) {
    return mapHotelOpsError(e);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { hotelId } = await requireHotelOps();
    const { id } = await ctx.params;
    const body: unknown = await req.json();
    const parsed = patchInvoiceStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.message },
        { status: 400 },
      );
    }
    const invoice = await invoiceService.transition(
      hotelId,
      id,
      parsed.data.status,
    );
    return NextResponse.json({ invoice });
  } catch (e) {
    return mapHotelOpsError(e);
  }
}
