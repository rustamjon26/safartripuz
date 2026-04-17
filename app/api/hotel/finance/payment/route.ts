import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const json = await req.json();
    
    // Create payment in transaction and update paid amount of the booking
    const result = await prisma.$transaction(async (tx) => {
       const pay = await tx.hotelPayment.create({
          data: {
             hotelId: ctx.hotel.id,
             bookingId: json.bookingId,
             amount: json.amount,
             method: json.method || "CASH"
          }
       });

       const b = await tx.hotelBooking.findUnique({ where: { id: json.bookingId } });
       if (b) {
          await tx.hotelBooking.update({
             where: { id: b.id },
             data: { paidAmount: Number(b.paidAmount) + Number(json.amount) }
          });
       }

       return pay;
    });

    return NextResponse.json({ payment: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
