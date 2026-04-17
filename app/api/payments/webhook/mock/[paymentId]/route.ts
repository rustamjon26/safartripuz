import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

export async function POST(req: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  try {
    const actor = await requireUser();
    const { paymentId } = await params;
    
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });
    
    if (!payment) return NextResponse.json({ error: "To'lov topilmadi" }, { status: 404 });
    if (payment.status === "SUCCESS") {
      return NextResponse.json({ message: "Allaqachon to'langan" }, { status: 400 });
    }
    
    const travelPlan = await prisma.travelPlan.findFirst({
       where: { id: payment.travelPlanId, userId: actor.id }
    });
    if (!travelPlan) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    // Mark as paid
    const updated = await prisma.$transaction(async (tx) => {
       const p = await tx.payment.update({
          where: { id: payment.id },
          data: { status: "SUCCESS", paidAt: new Date() }
       });
       
       const next = await tx.travelPlan.update({
         where: { id: travelPlan.id },
         data: { status: "CONFIRMED" },
         select: { id: true, status: true, totalAmount: true }
       });

       await tx.hotelBooking.updateMany({
         where: { note: { contains: travelPlan.id }, status: "PENDING" },
         data: { status: "CONFIRMED" }
       });

       const pendingHomeStayBookings = await tx.homeStayBooking.findMany({
         where: {
           travelPlanId: travelPlan.id,
           status: "PENDING",
         },
         select: {
           id: true,
           listingId: true,
           checkIn: true,
           checkOut: true,
         },
       });

       if (pendingHomeStayBookings.length) {
         await tx.homeStayBooking.updateMany({
           where: { id: { in: pendingHomeStayBookings.map((b) => b.id) } },
           data: { status: "CONFIRMED" },
         });

         for (const booking of pendingHomeStayBookings) {
           const existingAvailability = await tx.homeStayAvailability.findFirst({
             where: {
               OR: [
                 { bookingId: booking.id },
                 {
                   listingId: booking.listingId,
                   startDate: booking.checkIn,
                   endDate: booking.checkOut,
                   reason: "BOOKED",
                 },
               ],
             },
             select: { id: true },
           });

           if (existingAvailability) {
             await tx.homeStayAvailability.update({
               where: { id: existingAvailability.id },
               data: { bookingId: booking.id },
             });
             continue;
           }

           await tx.homeStayAvailability.create({
             data: {
               listingId: booking.listingId,
               bookingId: booking.id,
               startDate: booking.checkIn,
               endDate: booking.checkOut,
               reason: "BOOKED",
             },
           });
         }
       }

       const pendingGuideBookings = await tx.guideBooking.findMany({
         where: {
           travelPlanId: travelPlan.id,
           status: "PENDING",
         },
         select: { id: true },
       });
       if (pendingGuideBookings.length) {
         await tx.guideBooking.updateMany({
           where: { id: { in: pendingGuideBookings.map((b) => b.id) } },
           data: { status: "CONFIRMED" },
         });
         await tx.guideBookingLog.createMany({
           data: pendingGuideBookings.map((booking) => ({
             bookingId: booking.id,
             actorId: actor.id,
             actorRole: "system",
             fromStatus: "PENDING",
             toStatus: "CONFIRMED",
             note: "Confirmed after payment success",
           })),
         });
       }

       await tx.auditLog.create({
         data: {
           actorId: actor.id,
           action: "PAYMENT_SUCCESS",
           entity: "Payment",
           entityId: p.id,
           newData: { status: "SUCCESS", amount: p.amount }
         }
       });

       return { next, payment: p };
    });

    return NextResponse.json({ message: "Tolov muvaffaqiyatli qabul qilindi", ...updated });
  } catch {
     return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
