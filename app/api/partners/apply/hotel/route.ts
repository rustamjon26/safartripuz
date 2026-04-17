import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

const schema = z.object({
  hotelName: z.string().trim().min(2),
  city: z.string().trim().min(2),
  address: z.string().trim().min(5),
  contactEmail: z.string().trim().email(),
  contactPhone: z.string().trim().regex(/^\+998\d{9}$/),
  note: z.string().trim().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    if (actor.role !== "user") {
      return NextResponse.json(
        { message: "Faqat user rolidagi foydalanuvchi ariza topshira oladi" },
        { status: 403 },
      );
    }

    const json = await req.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }

    const existing = await prisma.partner.findUnique({
      where: { userId: actor.id },
      select: { id: true, status: true, type: true },
    });
    if (existing) {
      return NextResponse.json(
        { message: "Sizda allaqachon partner ariza/profil mavjud" },
        { status: 409 },
      );
    }

    const partner = await prisma.partner.create({
      data: {
        type: "hotel",
        status: "pending",
        userId: actor.id,
        displayName: parsed.data.hotelName,
        contactEmail: parsed.data.contactEmail,
        contactPhone: parsed.data.contactPhone,
        meta: {
          city: parsed.data.city,
          address: parsed.data.address,
        },
        note: parsed.data.note ?? null,
      },
      select: {
        id: true,
        type: true,
        status: true,
        displayName: true,
        contactEmail: true,
        contactPhone: true,
        meta: true,
        note: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "PARTNER_APPLICATION_SUBMITTED",
        entity: "Partner",
        entityId: partner.id,
        newData: {
          type: partner.type,
          status: partner.status,
          displayName: partner.displayName,
        },
      },
    });

    return NextResponse.json({ partner }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

