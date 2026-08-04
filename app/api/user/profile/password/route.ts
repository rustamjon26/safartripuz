import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, "Yangi parol kamida 8 belgi bo‘lishi kerak")
    .max(128),
});

export async function PATCH(req: Request) {
  try {
    const actor = await requireUser();
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

    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { password: true },
    });
    if (!user) {
      return NextResponse.json({ message: "Foydalanuvchi topilmadi" }, { status: 404 });
    }

    // Google/OAuth accounts may have an empty password hash.
    if (!user.password) {
      return NextResponse.json(
        {
          message:
            "Bu hisobda parol yo‘q (Google orqali kirilgan). Parol o‘rnatish tez orada qo‘shiladi.",
        },
        { status: 400 },
      );
    }

    const ok = await bcrypt.compare(
      parsed.data.currentPassword,
      user.password,
    );
    if (!ok) {
      return NextResponse.json(
        { message: "Joriy parol noto‘g‘ri" },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({
      where: { id: actor.id },
      data: { password: passwordHash },
    });

    return NextResponse.json({ message: "Parol yangilandi" }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
