import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  /** Required when the account already has a password. */
  currentPassword: z.string().optional().default(""),
  newPassword: z
    .string()
    .min(8, "Yangi parol kamida 8 belgi bo‘lishi kerak")
    .max(128),
});

function hasPasswordHash(password: string | null | undefined): boolean {
  return Boolean(password && password.length > 0);
}

export async function PATCH(req: Request) {
  try {
    const actor = await requireUser();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: parsed.error.issues[0]?.message ?? "Validation error",
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { password: true },
    });
    if (!user) {
      return NextResponse.json(
        { message: "Foydalanuvchi topilmadi" },
        { status: 404 },
      );
    }

    const hasExisting = hasPasswordHash(user.password);

    if (hasExisting) {
      if (!parsed.data.currentPassword) {
        return NextResponse.json(
          { message: "Joriy parolni kiriting" },
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
    }
    // else: Google/OAuth account with empty password — allow first-time set.

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({
      where: { id: actor.id },
      data: { password: passwordHash },
    });

    return NextResponse.json(
      {
        message: hasExisting
          ? "Parol yangilandi"
          : "Parol o‘rnatildi — endi email/parol bilan ham kirishingiz mumkin",
        setOnly: !hasExisting,
      },
      { status: 200 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    console.error("[user/profile/password] failed", e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

/** Does this account already have a password? (for UI: hide current-password field) */
export async function GET() {
  try {
    const actor = await requireUser();
    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { password: true },
    });
    if (!user) {
      return NextResponse.json(
        { message: "Foydalanuvchi topilmadi" },
        { status: 404 },
      );
    }
    return NextResponse.json({
      hasPassword: hasPasswordHash(user.password),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
