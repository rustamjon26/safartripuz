import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";

export async function GET() {
  try {
    await requireRole(["admin", "super_admin"]);

    // Fetch users who don't have a partner profile yet
    const eligibleUsers = await prisma.user.findMany({
      where: {
        partnerProfile: null 
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
      },
      orderBy: { first_name: "asc" }
    });

    return NextResponse.json({ items: eligibleUsers });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
