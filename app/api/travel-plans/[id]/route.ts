import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await ctx.params;

    const plan = await prisma.travelPlan.findFirst({
      where: { id, userId: actor.id },
      include: {
        items: true,
        tourPackage: {
          select: { title: true, imageUrl: true }
        }
      }
    });

    if (!plan) {
      return NextResponse.json({ message: "Sayohat topilmadi" }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
