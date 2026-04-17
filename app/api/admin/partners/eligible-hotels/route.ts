import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch partners of type 'hotel' who don't have a record in the 'Hotel' model yet.
    const eligiblePartners = await prisma.partner.findMany({
      where: {
        type: "hotel",
        status: "approved",
        hotel: null 
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
    console.error(e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
