import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import bcrypt from "bcryptjs";
import type { PartnerStatus, PartnerType, Role } from "@prisma/client";

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const status = searchParams.get("status") ?? "";
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? "20"));

    const where: any = {};
    if (status) where.status = status as PartnerStatus;
    if (q) {
      where.OR = [
        { displayName: { contains: q, mode: "insensitive" } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { user: { first_name: { contains: q, mode: "insensitive" } } },
        { user: { last_name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.partner.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              first_name: true,
              last_name: true,
              role: true,
            },
          },
        },
      }),
      prisma.partner.count({ where }),
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
    const { userId, type, displayName, bio, contactEmail, contactPhone, status, newUser } = body;

    // 1. Determine Role based on Partner Type
    const roleMapping: Record<string, Role> = {
      hotel: "hotel_manager",
      guide: "guide",
      taxi: "taxi",
      restaurant: "restaurant_manager",
    };
    const targetRole: Role = roleMapping[type] || "user";

    // Case A: Create New User + Partner Profile (Atomic)
    if (newUser) {
      const { first_name, last_name, email, phone, password } = newUser;
      
      if (!first_name || !email || !password) {
        return NextResponse.json({ message: "Yangi foydalanuvchi ma'lumotlari yetarli emas" }, { status: 400 });
      }

      // Check uniqueness
      const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { phone }] }
      });
      if (existing) {
        return NextResponse.json({ message: "Email yoki telefon allaqachon mavjud" }, { status: 400 });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            first_name,
            last_name,
            email,
            phone,
            password: passwordHash,
            role: targetRole,
          },
        });

        const partner = await tx.partner.create({
          data: {
            userId: user.id,
            type,
            displayName: displayName || `${first_name} ${last_name}`,
            bio,
            contactEmail: contactEmail || email,
            contactPhone: contactPhone || phone,
            status: status || "approved",
          },
        });

        return { user, partner };
      });

      return NextResponse.json(result, { status: 201 });
    }

    // Case B: Link Existing User (Original logic upgraded with role update)
    if (!userId) {
      return NextResponse.json({ message: "UserId yoki newUser majburiy" }, { status: 400 });
    }

    const existingPartner = await prisma.partner.findUnique({ where: { userId } });
    if (existingPartner) {
      return NextResponse.json({ message: "Ushbu foydalanuvchida allaqachon hamkorlik profili mavjud" }, { status: 400 });
    }

    const partner = await prisma.$transaction(async (tx) => {
      // Update role for existing user to match partner type
      await tx.user.update({
        where: { id: userId },
        data: { role: targetRole }
      });

      return tx.partner.create({
        data: {
          userId,
          type,
          displayName,
          bio,
          contactEmail,
          contactPhone,
          status: status || "approved",
        },
      });
    });

    return NextResponse.json({ partner }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
