import { NextResponse } from "next/server";
import { revokeRefreshTokens, tokenVersionBump } from "@/lib/auth/session-stamp";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import bcrypt from "bcryptjs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { id } = await params;
    const { password } = await req.json();

    if (!password || password.length < 6) {
      return NextResponse.json(
        { message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { password: passwordHash, ...tokenVersionBump() },
      });
      await revokeRefreshTokens(tx, id);
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
