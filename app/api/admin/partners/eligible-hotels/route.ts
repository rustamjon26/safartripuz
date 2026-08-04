import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";

export async function GET() {
  try {
    await requireRole(["admin", "super_admin"]);

    // Hotel partners without a Hotel yet (approved or pending — admin can attach during onboarding).
    const eligiblePartners = await prisma.partner.findMany({
      where: {
        type: "hotel",
        status: { in: ["approved", "pending"] },
        hotel: null,
      },
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({ items: eligiblePartners });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
