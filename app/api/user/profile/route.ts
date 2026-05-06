import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

type Body = {
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
};

export async function PUT(req: Request) {
  try {
    const { id } = await requireUser();
    const body = (await req.json()) as Body;

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { first_name: true, last_name: true, email: true, phone: true },
    });
    if (!existing) {
      return NextResponse.json({ message: "Foydalanuvchi topilmadi" }, { status: 404 });
    }

    let first_name = existing.first_name;
    let last_name = existing.last_name;

    if (typeof body.name === "string" && body.name.trim()) {
      const parts = body.name.trim().split(/\s+/);
      first_name = parts[0] ?? first_name;
      last_name = parts.length > 1 ? parts.slice(1).join(" ") : last_name;
    }
    if (typeof body.first_name === "string" && body.first_name.trim()) {
      first_name = body.first_name.trim();
    }
    if (typeof body.last_name === "string") {
      last_name = body.last_name.trim();
    }

    if (!first_name.trim() || !last_name.trim()) {
      return NextResponse.json({ message: "Ism va familiya to'liq bo'lishi kerak" }, { status: 400 });
    }

    let phone = existing.phone;
    if (typeof body.phone === "string" && body.phone.trim()) {
      const next = body.phone.trim();
      const taken = await prisma.user.findFirst({
        where: { phone: next, NOT: { id } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json({ message: "Bu telefon raqami band" }, { status: 409 });
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
