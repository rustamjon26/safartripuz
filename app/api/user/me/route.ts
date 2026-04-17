import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { id } = await requireUser();
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true,
        hotelStaff: {
          select: { role: true }
        }
      },
    });

    if (!user) {
      return NextResponse.json({ message: "Foydalanuvchi topilmadi" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
