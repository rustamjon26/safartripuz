import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

const schema = z.object({
  startDate: z.string().datetime(),
  pax: z.number().int().min(1).max(20),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    const json = await req.json();
    const parsed = schema.safeParse(json);
    
    if (!parsed.success) {
      return NextResponse.json({ message: "Noto'g'ri ma'lumot kiritildi" }, { status: 400 });
    }
    
    const { startDate, pax } = parsed.data;
    const { id } = await params;
    
    const tour = await prisma.tourPackage.findUnique({
      where: { id }
    });
    
    if (!tour) {
       return NextResponse.json({ message: "Sayohat paketi topilmadi" }, { status: 404 });
    }
    
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + tour.days);
    
    const totalAmount = Number(tour.price) * pax;
    
    const plan = await prisma.travelPlan.create({
      data: {
        userId: actor.id,
        tourPackageId: tour.id,
        destination: tour.destination,
        startDate: start,
        endDate: end,
        pax,
        status: "PENDING_PAYMENT",
        totalAmount,
        note: `Tayyor paket: ${tour.title}`
      }
    });
    
    await prisma.auditLog.create({
       data: {
         actorId: actor.id,
         action: "TOUR_PACKAGE_PURCHASED",
         entity: "TravelPlan",
         entityId: plan.id,
         newData: {
           totalAmount,
           pax,
           startDate,
           tourId: tour.id
         }
       }
    });
    
    return NextResponse.json({ message: "Sayohat paketi muvaffaqiyatli band qilindi", planId: plan.id }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Tizimga kiring" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
