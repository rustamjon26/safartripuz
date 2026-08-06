import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { normalizeUzPhone } from "@/src/shared/phone";

const schema = z.object({
  hotelName: z.string().trim().min(2),
  city: z.string().trim().min(2),
  address: z.string().trim().min(5),
  contactEmail: z.string().trim().email(),
  contactPhone: z.string().trim().min(9).max(40),
  note: z.string().trim().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    if (actor.role !== "user") {
      return NextResponse.json(
        {
          message:
            "Faqat oddiy foydalanuvchi (user) ariza topshira oladi. Hozirgi rol: " +
            actor.role,
        },
        { status: 403 },
      );
    }

    const json = await req.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          message:
            parsed.error.issues[0]?.message ?? "Ma'lumotlar noto‘g‘ri to‘ldirilgan",
        },
        { status: 400 },
      );
    }

    const contactPhone = normalizeUzPhone(parsed.data.contactPhone);
    if (!contactPhone) {
      return NextResponse.json(
        {
          message:
            "Telefon formati noto‘g‘ri. Masalan: +998901234567 yoki 901234567",
        },
        { status: 400 },
      );
    }

    const existing = await prisma.partner.findUnique({
      where: { userId: actor.id },
      select: { id: true, status: true, type: true },
    });
    if (existing) {
      return NextResponse.json(
        {
          message: `Sizda allaqachon ${existing.type} partner arizasi bor (${existing.status})`,
        },
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
        contactPhone,
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
      return NextResponse.json(
        { message: "Avval tizimga kiring" },
        { status: 401 },
      );
    }
    console.error("[partners/apply/hotel] failed", e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

