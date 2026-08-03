import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";

const createPaymentSchema = z.object({
  bookingId: z.string().min(1),
  /** Som, up to 2 decimal places, as string or number. */
  amount: z.union([
    z.number().positive().finite(),
    z.string().regex(/^\d+(\.\d{1,2})?$/),
  ]),
  method: z.enum(["CASH", "CARD", "TRANSFER"]).default("CASH"),
});

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const parsed = createPaymentSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }
    // Decimal via string — no float math on money.
    const amount = new Prisma.Decimal(String(parsed.data.amount));
    if (amount.lte(0)) {
      return NextResponse.json({ message: "Summa noto'g'ri" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Booking MUST belong to this hotel — no cross-hotel writes.
      const booking = await tx.hotelBooking.findFirst({
        where: { id: parsed.data.bookingId, hotelId: ctx.hotel.id },
        select: { id: true },
      });
      if (!booking) return null;

      const pay = await tx.hotelPayment.create({
        data: {
          hotelId: ctx.hotel.id,
          bookingId: booking.id,
          amount,
          method: parsed.data.method,
        },
      });

      // Atomic increment — safe under concurrent POSTs, no read-modify-write.
      await tx.hotelBooking.update({
        where: { id: booking.id },
        data: { paidAmount: { increment: amount } },
      });

      return pay;
    });

    if (!result) {
      return NextResponse.json({ message: "Booking topilmadi" }, { status: 404 });
    }

    return NextResponse.json({ payment: result }, { status: 201 });
  } catch (error) {
    console.error("[hotel/finance/payment]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
