import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

export async function GET(req: Request) {
  try {
    const actor = await requireUser();
    
    // We fetch payments associated with TravelPlans belonging to the actor
    const payments = await prisma.payment.findMany({
      where: {
        travelPlan: {
          userId: actor.id
        }
      },
      include: {
        travelPlan: {
          select: {
            destination: true,
            tourPackage: {
              select: { title: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(payments);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}
