import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "super_admin"]);

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const take = Math.min(Number(searchParams.get("take") ?? 50), 200);
    const skip = Math.max(Number(searchParams.get("skip") ?? 0), 0);

    const where =
      q.length > 0
        ? {
            OR: [
              { email: { contains: q } },
              { phone: { contains: q } },
              { first_name: { contains: q } },
              { last_name: { contains: q } },
            ],
          }
        : {};

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          partnerProfile: { select: { id: true, type: true, status: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ items, total }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireRole(["admin", "super_admin"]);
    const body = await req.json();
    const { first_name, last_name, email, phone, role, password } = body;

    // Basic validation
    if (!first_name || !last_name || !email || !phone || !password || !role) {
      return NextResponse.json({ message: "Barcha maydonlarni to'ldiring" }, { status: 400 });
    }

    // Check unique
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });
    if (existing) {
      const field = existing.email === email ? "Email" : "Telefon";
      return NextResponse.json({ message: `Ushbu ${field} allaqachon ro'yxatdan o'tgan` }, { status: 400 });
    }

    const passwordHash = await import("bcryptjs").then(b => b.hash(password, 12));

    const user = await prisma.user.create({
      data: {
        first_name,
        last_name,
        email: email.toLowerCase(),
        phone,
        role,
        password: passwordHash,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

