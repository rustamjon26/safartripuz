import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

export async function PATCH(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await ctx.params;

    const notif = await prisma.notification.update({
      where: { id, userId: actor.id },
      data: { readAt: new Date() },
    });

    return NextResponse.json(notif);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: "Xabar o'qilgan deb belgilashda xatolik" }, { status: 500 });
  }
}
