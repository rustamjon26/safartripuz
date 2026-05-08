import { NextResponse } from "next/server";
import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { id } = await params;
    const body = await req.json();
    const { first_name, last_name, email, phone, role, isBlocked } = body as Record<
      string,
      unknown
    >;

    const update: Prisma.UserUpdateInput = {};
    if (first_name !== undefined) update.first_name = first_name as string;
    if (last_name !== undefined) update.last_name = last_name as string;
    if (email !== undefined) update.email = email as string;
    if (phone !== undefined) update.phone = phone as string;
    if (role !== undefined) update.role = role as Role;
    if (isBlocked !== undefined) {
      update.isBlocked = isBlocked as boolean;

      if (isBlocked === true) {
        await prisma.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: update,
    });

    return NextResponse.json({ user });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["super_admin"]);
    const { id } = await params;

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
