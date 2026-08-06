import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";
import {
  marketingService,
  patchHotelPromoSchema,
  PromoNotFoundError,
} from "@/src/modules/marketing";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const hotelCtx = await getApprovedHotelContextByUserId(actor.id);
    if (!hotelCtx) {
      return NextResponse.json({ message: "Hotel not found" }, { status: 404 });
    }

    const parsed = patchHotelPromoSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validatsiya xatosi", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { id } = await ctx.params;
    const promo = await marketingService.patchPromo(
      hotelCtx.hotel.id,
      id,
      parsed.data,
    );
    return NextResponse.json({ promo }, { status: 200 });
  } catch (e) {
    return mapError(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const hotelCtx = await getApprovedHotelContextByUserId(actor.id);
    if (!hotelCtx) {
      return NextResponse.json({ message: "Hotel not found" }, { status: 404 });
    }

    const { id } = await ctx.params;
    await marketingService.deletePromo(hotelCtx.hotel.id, id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return mapError(e);
  }
}

function mapError(e: unknown) {
  // A promo belonging to another hotel is indistinguishable from a missing one.
  if (e instanceof PromoNotFoundError) {
    return NextResponse.json({ message: e.message }, { status: 404 });
  }
  const msg = e instanceof Error ? e.message : "Server error";
  if (msg === "UNAUTHORIZED") {
    return NextResponse.json(
      { message: "Seans muddati tugagan. Qayta kiring." },
      { status: 401 },
    );
  }
  if (msg === "FORBIDDEN") {
    return NextResponse.json({ message: "Bu amal uchun ruxsat yo'q." }, { status: 403 });
  }
  console.error("[hotel/promos/:id]", e);
  return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
}
