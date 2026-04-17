import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { id } = await ctx.params;
    const body = await req.json();
    const { type, status, displayName, bio, contactEmail, contactPhone, note } = body;

    const partner = await prisma.partner.update({
      where: { id },
      data: {
        type,
        status,
        displayName,
        bio,
        contactEmail,
        contactPhone,
        note,
      },
    });

    return NextResponse.json({ partner });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { id } = await ctx.params;
    await prisma.partner.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
