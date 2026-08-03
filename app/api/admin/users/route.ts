import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

const roleSchema = z.enum([
  "super_admin",
  "admin",
  "user",
  "taxi",
  "taxi_partner",
  "hotel_manager",
  "guide",
  "restaurant_manager",
  "home_stay_partner",
  "support",
  "cleaner",
  "receptionist",
  "waiter",
  "hotel_staff",
]);

const createUserSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(191),
  phone: z.string().trim().min(5).max(32),
  role: roleSchema,
  password: z.string().min(8).max(128),
});

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
    const actor = await requireRole(["admin", "super_admin"]);
    const parsed = createUserSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Barcha maydonlarni to'g'ri to'ldiring" },
        { status: 400 },
      );
    }
    const { first_name, last_name, email, phone, role, password } = parsed.data;

    // Only super_admin may mint admin-level accounts.
    if (
      (role === "super_admin" || role === "admin") &&
      actor.role !== "super_admin"
    ) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
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

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "USER_CREATED_BY_ADMIN",
        entity: "User",
        entityId: user.id,
        newData: { role: user.role, email: user.email },
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

