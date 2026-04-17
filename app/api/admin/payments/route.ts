import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "";
    const provider = searchParams.get("provider") ?? "";
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Number(searchParams.get("limit") ?? "20"));

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (provider) where.provider = provider;

    const [items, total, stats] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          travelPlan: { select: { destination: true, user: { select: { first_name: true, last_name: true, email: true } } } },
        },
      }),
      prisma.payment.count({ where }),
      prisma.payment.groupBy({
        by: ["status"],
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    return NextResponse.json({ items, total, page, limit, stats });
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
