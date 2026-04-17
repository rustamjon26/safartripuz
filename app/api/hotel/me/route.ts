import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";

export async function GET() {
  try {
    const { id: userId } = await requireUser();

    const ctx = await getApprovedHotelContextByUserId(userId);
    if (!ctx) {
      return NextResponse.json(
        { message: "Sizga mehmonxona biriktirilmagan. Iltimos, admin bilan bog'laning." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      hotel: ctx.hotel,
      isStaff: ctx.isStaff,
      staffRecord: ctx.staffRecord,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Seans muddati tugagan" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
