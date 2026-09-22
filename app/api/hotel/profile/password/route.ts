import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import bcrypt from "bcryptjs";
import { checkRateLimit } from "@/lib/rateLimit";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export async function PATCH(req: Request) {
  try {
    const { id: userId } = await requireUser();
    if (!(await checkRateLimit(`password:${userId}`, 5, 10 * 60_000))) {
      return NextResponse.json(
        { message: "Juda ko'p urinish. 10 daqiqadan so'ng qayta urining." },
        { status: 429 },
      );
    }
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Yangi parol kamida 8 belgi bo'lishi kerak" },
        { status: 400 },
      );
    }
    const { currentPassword, newPassword } = parsed.data;

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
