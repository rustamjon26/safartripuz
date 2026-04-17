import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getApprovedPartnerContextByUserId } from "@/lib/partner";

const patchSchema = z
  .object({
    title: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().min(2).max(2000).optional(),
    meetingPoint: z.string().trim().max(255).nullable().optional(),
    language: z.string().trim().min(2).max(32).optional(),
    languages: z.array(z.string().trim().min(2).max(32)).optional(),
    category: z
      .enum(["CITY_TOUR", "NATURE", "HISTORY", "ADVENTURE", "FOOD", "CUSTOM"])
      .optional(),
    region: z.string().trim().max(80).nullable().optional(),
    duration: z.string().trim().max(80).nullable().optional(),
    pricePerDay: z.coerce.number().positive().optional(),
    pricePerHour: z.coerce.number().positive().optional(),
    minHours: z.coerce.number().int().positive().optional(),
    maxHours: z.coerce.number().int().positive().optional(),
    maxGroupSize: z.coerce.number().int().positive().optional(),
    images: z.array(z.string()).optional(),
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
    const actor = await requireRole(["guide"]);
    const partner = await getApprovedPartnerContextByUserId(actor.id, "guide");
    if (!partner) {
      return NextResponse.json(
        { message: "Tasdiqlangan guide partner topilmadi" },
        { status: 404 },
      );
    }

    const { id } = await ctx.params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }

    const exists = await prisma.guideListing.findFirst({
      where: { id, partnerId: partner.id },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ message: "Listing topilmadi" }, { status: 404 });
    }

    const item = await prisma.guideListing.update({
      where: { id },
      data: {
        ...parsed.data,
        description: parsed.data.description,
        meetingPoint: parsed.data.meetingPoint,
        language: parsed.data.language?.toLowerCase(),
        languages: parsed.data.languages?.map((l) => l.toLowerCase()),
      },
      select: {
        id: true,
        title: true,
        language: true,
        region: true,
        duration: true,
        pricePerDay: true,
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
