import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import {
  demotePartnerIfRoleLeft,
  ensureApprovedGuidePartner,
  ensureApprovedTaxiPartner,
  roleNeedsApprovedPartner,
} from "@/lib/partner";
import {
  isHotelStaffPlatformRole,
  platformRoleToJobRole,
} from "@/lib/hotel/staffPlatformRole";
import { StaffNotFoundError, staffService } from "@/src/modules/staff";

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
  /** Optional HotelStaff link for frontline staff roles. */
  hotelId: z.string().min(1).optional().nullable(),
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

    // Heal stale Partner rows left behind by older role-assign logic.
    const healed = await Promise.all(
      items.map(async (u) => {
        const displayName =
          `${u.first_name} ${u.last_name}`.trim() || u.email;

        if (
          !roleNeedsApprovedPartner(u.role) &&
          u.partnerProfile?.status === "approved"
        ) {
          await demotePartnerIfRoleLeft(prisma, u.id, u.role);
          return {
            ...u,
            partnerProfile: {
              ...u.partnerProfile,
              status: "pending",
            },
          };
        }

        const isTaxi = u.role === "taxi" || u.role === "taxi_partner";
        if (
          isTaxi &&
          u.partnerProfile &&
          (u.partnerProfile.type !== "taxi" ||
            u.partnerProfile.status !== "approved")
        ) {
          const partner = await ensureApprovedTaxiPartner(prisma, {
            userId: u.id,
            displayName,
            contactEmail: u.email,
            contactPhone: u.phone,
          });
          return {
            ...u,
            partnerProfile: {
              id: partner.id,
              type: partner.type,
              status: partner.status,
            },
          };
        }

        if (
          u.role === "guide" &&
          u.partnerProfile &&
          (u.partnerProfile.type !== "guide" ||
            u.partnerProfile.status !== "approved")
        ) {
          const partner = await ensureApprovedGuidePartner(prisma, {
            userId: u.id,
            displayName,
            contactEmail: u.email,
            contactPhone: u.phone,
          });
          return {
            ...u,
            partnerProfile: {
              id: partner.id,
              type: partner.type,
              status: partner.status,
            },
          };
        }

        return u;
      }),
    );

    return NextResponse.json({ items: healed, total }, { status: 200 });
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
    const { first_name, last_name, email, phone, role, password, hotelId } =
      parsed.data;

    // Only super_admin may mint admin-level accounts.
    if (
      (role === "super_admin" || role === "admin") &&
      actor.role !== "super_admin"
    ) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (hotelId && !isHotelStaffPlatformRole(role)) {
      return NextResponse.json(
        {
          message:
            "hotelId faqat cleaner / receptionist / waiter / hotel_staff uchun",
        },
        { status: 400 },
      );
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

    let hotelStaff = null;
    if (hotelId && isHotelStaffPlatformRole(role)) {
      hotelStaff = await staffService.adminLinkUserToHotel(user.id, {
        hotelId,
        role: platformRoleToJobRole(role),
        reassign: true,
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "USER_CREATED_BY_ADMIN",
        entity: "User",
        entityId: user.id,
        newData: {
          role: user.role,
          email: user.email,
          hotelId: hotelId ?? null,
          hotelStaffId: hotelStaff?.id ?? null,
        },
      },
    });

    return NextResponse.json({ user, hotelStaff }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    if (e instanceof StaffNotFoundError || msg === "HOTEL_NOT_FOUND") {
      return NextResponse.json(
        { message: e instanceof Error ? e.message : "Mehmonxona topilmadi" },
        { status: 404 },
      );
    }
    console.error(e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

