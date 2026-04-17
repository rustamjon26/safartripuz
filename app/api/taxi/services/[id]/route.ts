import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getApprovedPartnerContextByUserId } from "@/lib/partner";

const patchSchema = z
  .object({
    title: z.string().trim().min(2).max(120).optional(),
    serviceType: z
      .enum(["INTERCITY_TRANSFER", "HOTEL_TRANSFER", "TOUR_DAILY_TRANSPORT"])
      .optional(),
    price: z.coerce.number().positive().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Kamida bitta maydon yuborilishi kerak",
  });

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole(["taxi"]);
    const partner = await getApprovedPartnerContextByUserId(actor.id, "taxi");
    if (!partner) {
      return NextResponse.json(
        { message: "Tasdiqlangan taxi partner topilmadi" },
        { status: 404 },
      );
    }

    const { id } = await ctx.params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }

    const exists = await prisma.taxiService.findFirst({
      where: { id, partnerId: partner.id },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ message: "Service topilmadi" }, { status: 404 });
    }

    const item = await prisma.taxiService.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        title: true,
        serviceType: true,
        price: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ item }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
