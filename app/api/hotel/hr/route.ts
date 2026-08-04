import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";
import {
  isProtectedPlatformRole,
  jobRoleToPlatformRole,
} from "@/lib/hotel/staffPlatformRole";

const jobRoleSchema = z.enum(["RECEPTION", "CLEANER", "WAITER", "MANAGER"]);

const createStaffSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
  role: jobRoleSchema,
  email: z.string().trim().email().max(191),
  /** Manager-chosen login password; if omitted a temporary one is generated. */
  password: z.string().min(8).max(72).optional(),
});

const patchStaffSchema = z
  .object({
    id: z.string().min(1),
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().max(100).optional().nullable(),
    phone: z.string().trim().max(32).optional().nullable(),
    role: jobRoleSchema.optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(8).max(72).optional(),
  })
  .refine(
    (v) =>
      v.firstName !== undefined ||
      v.lastName !== undefined ||
      v.phone !== undefined ||
      v.role !== undefined ||
      v.isActive !== undefined ||
      v.password !== undefined,
    { message: "Kamida bitta maydon yuborilishi kerak" },
  );

function randomTempPassword(): string {
  return `St@ff${Math.random().toString(36).slice(-8)}`;
}

export async function GET(): Promise<NextResponse> {
  try {
    const actor = await requireRole(["hotel_manager", "admin", "super_admin"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) {
      return NextResponse.json({ message: "Hotel not found" }, { status: 404 });
    }

    const staff = await prisma.hotelStaff.findMany({
      where: { hotelId: ctx.hotel.id },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ staff }, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Server error";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const actor = await requireRole(["hotel_manager", "admin", "super_admin"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) {
      return NextResponse.json({ message: "Hotel not found" }, { status: 404 });
    }

    const parsed = createStaffSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 },
      );
    }

    const { firstName, lastName, phone, role, email } = parsed.data;
    const emailNorm = email.toLowerCase();
    const rawPassword = parsed.data.password?.trim() || randomTempPassword();
    const passwordHash = await bcrypt.hash(rawPassword, 12);
    const passwordWasGenerated = !parsed.data.password?.trim();

    const existingStaff = await prisma.hotelStaff.findFirst({
      where: {
        hotelId: ctx.hotel.id,
        user: { email: emailNorm },
      },
      select: { id: true },
    });
    if (existingStaff) {
      return NextResponse.json(
        { message: "Bu email allaqachon shu mehmonxonaga biriktirilgan" },
        { status: 409 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email: emailNorm } });

      if (!user) {
        user = await tx.user.create({
          data: {
            first_name: firstName,
            last_name: lastName || "",
            email: emailNorm,
            phone: phone || `+998${Math.floor(Math.random() * 1_000_000_000)}`,
            password: passwordHash,
            role: jobRoleToPlatformRole(role),
          },
        });
      } else {
        if (isProtectedPlatformRole(user.role)) {
          throw new Error("PROTECTED_USER");
        }
        const linkedElsewhere = await tx.hotelStaff.findFirst({
          where: { userId: user.id, hotelId: { not: ctx.hotel.id } },
          select: { id: true },
        });
        if (linkedElsewhere) {
          throw new Error("USER_OTHER_HOTEL");
        }
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            role: jobRoleToPlatformRole(role),
            password: passwordHash,
            first_name: firstName,
            last_name: lastName || user.last_name,
            phone: phone || user.phone,
          },
        });
      }

      const staff = await tx.hotelStaff.create({
        data: {
          hotelId: ctx.hotel.id,
          userId: user.id,
          firstName,
          lastName: lastName || null,
          phone: phone || null,
          role,
          isActive: true,
        },
      });

      return { staff, rawPassword };
    });

    return NextResponse.json(
      {
        staff: result.staff,
        generatedPassword: result.rawPassword,
        passwordWasGenerated,
      },
      { status: 201 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "PROTECTED_USER") {
      return NextResponse.json(
        { message: "Bu email admin/manager akkaunti — xodim sifatida ulab bo‘lmaydi" },
        { status: 400 },
      );
    }
    if (msg === "USER_OTHER_HOTEL") {
      return NextResponse.json(
        { message: "Bu foydalanuvchi boshqa mehmonxonaga biriktirilgan" },
        { status: 409 },
      );
    }
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    console.error("HR Create Error:", error);
    return NextResponse.json(
      { message: "Server xatosi yoki email band" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request): Promise<NextResponse> {
  try {
    const actor = await requireRole(["hotel_manager", "admin", "super_admin"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) {
      return NextResponse.json({ message: "Hotel not found" }, { status: 404 });
    }

    const parsed = patchStaffSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 },
      );
    }

    const { id, password, ...data } = parsed.data;
    const passwordHash = password
      ? await bcrypt.hash(password, 12)
      : null;

    const staff = await prisma.$transaction(async (tx) => {
      const existing = await tx.hotelStaff.findFirst({
        where: { id, hotelId: ctx.hotel.id },
        select: { id: true, userId: true },
      });
      if (!existing) throw new Error("NOT_FOUND");

      const updated = await tx.hotelStaff.update({
        where: { id: existing.id },
        data: {
          ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
          ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
          ...(data.role !== undefined ? { role: data.role } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
      });

      if (existing.userId) {
        const linked = await tx.user.findUnique({
          where: { id: existing.userId },
          select: { role: true },
        });
        if (linked && !isProtectedPlatformRole(linked.role)) {
          await tx.user.update({
            where: { id: existing.userId },
            data: {
              ...(data.role !== undefined
                ? { role: jobRoleToPlatformRole(String(data.role)) }
                : {}),
              ...(passwordHash ? { password: passwordHash } : {}),
            },
          });
        } else if (passwordHash) {
          throw new Error("PROTECTED_PASSWORD");
        }
      }

      return updated;
    });

    return NextResponse.json(
      {
        staff,
        ...(password ? { passwordUpdated: true } : {}),
      },
      { status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ message: "Xodim topilmadi" }, { status: 404 });
    }
    if (msg === "PROTECTED_PASSWORD") {
      return NextResponse.json(
        { message: "Himoyalangan akkaunt parolini o‘zgartirib bo‘lmaydi" },
        { status: 400 },
      );
    }
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request): Promise<NextResponse> {
  try {
    const actor = await requireRole(["hotel_manager", "admin", "super_admin"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) {
      return NextResponse.json({ message: "Hotel not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ message: "ID missing" }, { status: 400 });
    }

    const staff = await prisma.hotelStaff.findFirst({
      where: { id, hotelId: ctx.hotel.id },
      select: { userId: true },
    });

    if (!staff) {
      return NextResponse.json({ message: "Staff not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.hotelStaff.delete({ where: { id } });
      // Soft-detach: demote login if it was a staff platform role (do not hard-delete User).
      if (staff.userId) {
        const linked = await tx.user.findUnique({
          where: { id: staff.userId },
          select: { role: true },
        });
        if (linked && !isProtectedPlatformRole(linked.role)) {
          await tx.user.update({
            where: { id: staff.userId },
            data: { role: "user", isBlocked: true },
          });
        }
      }
    });

    return NextResponse.json({ message: "Xodim o'chirildi" }, { status: 200 });
  } catch (error) {
    console.error("Staff Delete Error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
