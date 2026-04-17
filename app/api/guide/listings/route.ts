import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getApprovedPartnerContextByUserId } from "@/lib/partner";

const createSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(2000).optional(),
  language: z.string().trim().min(2).max(32),
  languages: z.array(z.string().trim().min(2).max(32)).optional(),
  category: z
    .enum(["CITY_TOUR", "NATURE", "HISTORY", "ADVENTURE", "FOOD", "CUSTOM"])
    .optional(),
  region: z.string().trim().max(80).optional(),
  duration: z.string().trim().max(80).optional(),
  pricePerDay: z.coerce.number().positive(),
  pricePerHour: z.coerce.number().positive().optional(),
  isActive: z.boolean().optional().default(true),
});

export async function GET(req: Request) {
  try {
    const actor = await requireRole(["guide"]);
    const partner = await getApprovedPartnerContextByUserId(actor.id, "guide");
    if (!partner) {
      return NextResponse.json(
        { message: "Tasdiqlangan guide partner topilmadi" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20")));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.guideListing.findMany({
      where: { partnerId: partner.id },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        language: true,
        region: true,
        duration: true,
        pricePerDay: true,
        isActive: true,
        createdAt: true,
      },
    }),
      prisma.guideListing.count({ where: { partnerId: partner.id } }),
    ]);

    return NextResponse.json(
      {
        data: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      { status: 200 },
    );
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

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["guide"]);
    const partner = await getApprovedPartnerContextByUserId(actor.id, "guide");
    if (!partner) {
      return NextResponse.json(
        { message: "Tasdiqlangan guide partner topilmadi" },
        { status: 404 },
      );
    }

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }

    const item = await prisma.guideListing.create({
      data: {
        partnerId: partner.id,
        hostId: actor.id,
        title: parsed.data.title,
        description: parsed.data.description ?? parsed.data.title,
        meetingPoint: null,
        language: parsed.data.language.toLowerCase(),
        languages: parsed.data.languages?.length
          ? parsed.data.languages.map((l) => l.toLowerCase())
          : [parsed.data.language.toLowerCase()],
        category: parsed.data.category ?? "CITY_TOUR",
        region: parsed.data.region || null,
        duration: parsed.data.duration || null,
        pricePerDay: parsed.data.pricePerDay,
        pricePerHour: parsed.data.pricePerHour ?? parsed.data.pricePerDay,
        minHours: 1,
        maxHours: 8,
        maxGroupSize: 10,
        images: [],
        status: parsed.data.isActive ? "ACTIVE" : "INACTIVE",
        isActive: parsed.data.isActive,
      },
      select: {
        id: true,
        title: true,
        language: true,
        region: true,
        duration: true,
        pricePerDay: true,
        isActive: true,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
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
