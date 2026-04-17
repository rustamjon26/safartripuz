import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const status = searchParams.get("status") ?? "";
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Number(searchParams.get("limit") ?? "20"));

    const where: any = {};
    if (status) where.status = status as any;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { city: { contains: q } },
        { address: { contains: q, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.hotel.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          partner: {
            include: {
              user: { select: { first_name: true, last_name: true, email: true } },
            },
          },
          _count: { select: { bookings: true, rooms: true } },
        },
      }),
      prisma.hotel.count({ where }),
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
    const { partnerId, name, totalRooms, city, address, contactEmail, contactPhone, status } = body;

    if (!partnerId || !name || !city) {
      return NextResponse.json({ message: "Majburiy maydonlar to'ldirilmagan" }, { status: 400 });
    }

    // Check if partner exists and is type hotel
    const partner = await prisma.partner.findFirst({
       where: { id: partnerId, type: "hotel" },
       include: { hotel: true }
    });
    if (!partner) return NextResponse.json({ message: "Noto'g'ri hamkor (Partner not found)" }, { status: 404 });
    if (partner.hotel) return NextResponse.json({ message: "Ushbu hamkorning mehmonxonasi allaqachon mavjud" }, { status: 400 });

    const hotel = await prisma.hotel.create({
      data: {
        partnerId,
        name,
        totalRooms: Number(totalRooms ?? 0),
        city,
        address,
        contactEmail,
        contactPhone,
        status: status ?? "draft",
      },
    });

    return NextResponse.json({ hotel }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
