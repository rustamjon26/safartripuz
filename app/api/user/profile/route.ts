import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  first_name: z.string().trim().min(1).max(100).optional(),
  last_name: z.string().trim().max(100).optional(),
  phone: z.string().trim().min(5).max(32).optional(),
});

export async function PUT(req: Request) {
  try {
    const { id } = await requireUser();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          message:
            parsed.error.issues[0]?.message ?? "Validation error",
        },
        { status: 400 },
      );
    }
    const body = parsed.data;

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { first_name: true, last_name: true, email: true, phone: true },
    });
    if (!existing) {
      return NextResponse.json({ message: "Foydalanuvchi topilmadi" }, { status: 404 });
    }

    let first_name = existing.first_name;
    let last_name = existing.last_name;

    if (body.name) {
      const parts = body.name.split(/\s+/);
      first_name = parts[0] ?? first_name;
      last_name = parts.length > 1 ? parts.slice(1).join(" ") : last_name;
    }
    if (body.first_name) first_name = body.first_name;
    if (body.last_name !== undefined) last_name = body.last_name;

    if (!first_name.trim() || !last_name.trim()) {
      return NextResponse.json(
        { message: "Ism va familiya to'liq bo'lishi kerak" },
        { status: 400 },
      );
    }

    let phone = existing.phone;
    if (body.phone) {
      const next = body.phone;
      const taken = await prisma.user.findFirst({
        where: { phone: next, NOT: { id } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json(
          { message: "Bu telefon raqami band" },
          { status: 409 },
        );
      }
      phone = next;
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone,
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true,
        hotelStaff: { select: { role: true } },
      },
    });

    return NextResponse.json({ user }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
