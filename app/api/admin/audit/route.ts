import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "super_admin"]);

    const { searchParams } = new URL(req.url);
    const take = Math.min(Number(searchParams.get("take") ?? 50), 200);
    const skip = Math.max(Number(searchParams.get("skip") ?? 0), 0);

    const action = (searchParams.get("action") ?? "").trim();
    const entity = (searchParams.get("entity") ?? "").trim();

    const where: Record<string, unknown> = {};
    if (action) where.action = { contains: action };
    if (entity) where.entity = { contains: entity };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          oldData: true,
          newData: true,
          ip: true,
          userAgent: true,
          createdAt: true,
          actor: {
            select: {
              id: true,
              email: true,
              role: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ items, total }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

