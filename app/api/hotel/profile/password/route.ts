import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import bcrypt from "bcryptjs";

export async function PATCH(req: Request) {
  try {
    const { id: userId } = await requireUser();
    const { currentPassword, newPassword } = await req.json();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true }
    });

    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ message: "Eski parol noto'g'ri" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash }
    });

    return NextResponse.json({ message: "Parol muvaffaqiyatli o'zgartirildi" });
  } catch (e) {
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
