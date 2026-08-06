import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";
import {
  createHotelPromoSchema,
  marketingService,
  PromoCodeTakenError,
} from "@/src/modules/marketing";

export async function GET() {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const data = await marketingService.listPromos(ctx.hotel.id);
    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    return mapError(e);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const parsed = createHotelPromoSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validatsiya xatosi", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const promo = await marketingService.createPromo(ctx.hotel.id, parsed.data);
    return NextResponse.json({ promo }, { status: 201 });
  } catch (e) {
    return mapError(e);
  }
}

function mapError(e: unknown) {
  if (e instanceof PromoCodeTakenError) {
    return NextResponse.json({ message: e.message }, { status: 409 });
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
  console.error("[hotel/promos]", e);
  return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
}
