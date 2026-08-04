import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import {
  ensureApprovedHotelManagerSetup,
  getApprovedHotelContextByUserId,
} from "@/lib/hotel";

export async function GET() {
  try {
    const { id: userId, role } = await requireUser();

    let ctx = await getApprovedHotelContextByUserId(userId);

    // Self-heal: admin gave hotel_manager but Partner was pending / Hotel missing.
    if (!ctx && role === "hotel_manager") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
        },
      });
      if (user) {
        const displayName =
          `${user.first_name} ${user.last_name}`.trim() || user.email;
        try {
          await ensureApprovedHotelManagerSetup({
            userId,
            displayName,
            contactEmail: user.email,
            contactPhone: user.phone,
          });
          ctx = await getApprovedHotelContextByUserId(userId);
        } catch (healErr) {
          console.error("[hotel/me] ensure hotel setup failed", healErr);
        }
      }
    }

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
