import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const status = searchParams.get("status") ?? "all";
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Number(searchParams.get("limit") ?? "10"));

    const where: any = {};
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { destination: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ];
    }
    
    if (status !== "all") {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      prisma.tourPackage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.tourPackage.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireRole(["admin", "super_admin"]);
    const body = await req.json();
    const { title, description, destination, days, nights, price, category, imageUrl, highlights, status } = body;

    if (!title || !description || !destination || !days || !nights || !price || !category) {
      return NextResponse.json({ message: "Majburiy maydonlar to'ldirilmagan" }, { status: 400 });
    }

    const processedHighlights = Array.isArray(highlights) ? highlights : (highlights?.split(',').map((h: string) => h.trim()) || []);

    const tour = await prisma.tourPackage.create({
      data: {
        title,
        description,
        destination,
        days: Number(days),
        nights: Number(nights),
        price: Number(price),
        category,
        imageUrl: imageUrl ?? null,
        highlights: processedHighlights, 
        status: status ?? "active",
      },
    });

    return NextResponse.json({ tour }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
