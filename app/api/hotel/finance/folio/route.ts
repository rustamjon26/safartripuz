import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";
import { Money } from "@/src/shared/money";

const createFolioItemSchema = z.object({
  bookingId: z.string().min(1),
  category: z.enum(["ROOM", "MINIBAR", "RESTAURANT", "DAMAGES", "OTHER"]).default("ROOM"),
  description: z.string().trim().min(1).max(500),
  /** Som, up to 2 decimal places. */
  amount: z.union([
    z.number().positive().finite(),
    z.string().regex(/^\d+(\.\d{1,2})?$/),
  ]),
});

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const parsed = createFolioItemSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }
    const amountStr = String(parsed.data.amount);

    // Charge only bookings that belong to this hotel.
    const booking = await prisma.hotelBooking.findFirst({
      where: { id: parsed.data.bookingId, hotelId: ctx.hotel.id },
      select: { id: true },
    });
    if (!booking) {
      return NextResponse.json({ message: "Booking topilmadi" }, { status: 404 });
    }

    const item = await prisma.folioItem.create({
      data: {
        hotelId: ctx.hotel.id,
        bookingId: booking.id,
        category: parsed.data.category,
        description: parsed.data.description,
        amount: new Prisma.Decimal(amountStr),
        amountTiyin: Money.fromSomNumber(amountStr).toTiyin(),
        isPaid: false,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("[hotel/finance/folio]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
