import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import {
  adminLinkUserToHotelSchema,
  StaffNotFoundError,
  staffService,
} from "@/src/modules/staff";

type Ctx = { params: Promise<{ id: string }> };

function mapError(e: unknown): NextResponse {
  if (e instanceof StaffNotFoundError) {
    return NextResponse.json({ message: e.message }, { status: 404 });
  }
  const msg = e instanceof Error ? e.message : "";
  if (msg === "UNAUTHORIZED") {
    return NextResponse.json(
      { message: "Seans muddati tugagan. Qayta kiring." },
      { status: 401 },
    );
  }
  if (msg === "FORBIDDEN") {
    return NextResponse.json(
      { message: "Bu amal uchun ruxsat yo'q." },
      { status: 403 },
    );
  }
  if (msg === "PROTECTED_USER") {
    return NextResponse.json(
      {
        message:
          "Bu akkaunt admin/support — xodim sifatida ulab bo‘lmaydi",
      },
      { status: 400 },
    );
  }
  if (msg === "USER_OTHER_HOTEL") {
    return NextResponse.json(
      {
        message:
          "Bu foydalanuvchi boshqa mehmonxonaga biriktirilgan",
      },
      { status: 409 },
    );
  }
  console.error("[admin-user-hotel-staff]", e);
  return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
}

export async function GET(_req: Request, ctx: Ctx): Promise<NextResponse> {
  try {
    await requireRole(["admin", "super_admin"]);
    const { id: userId } = await ctx.params;
    const staff = await staffService.adminGetUserHotelStaff(userId);
    return NextResponse.json({ staff }, { status: 200 });
  } catch (e) {
    return mapError(e);
  }
}

export async function PUT(req: Request, ctx: Ctx): Promise<NextResponse> {
  try {
    await requireRole(["admin", "super_admin"]);
    const { id: userId } = await ctx.params;
    const parsed = adminLinkUserToHotelSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: parsed.error.issues[0]?.message ?? "Validatsiya xatosi",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const staff = await staffService.adminLinkUserToHotel(userId, parsed.data);
    return NextResponse.json({ staff }, { status: 200 });
  } catch (e) {
    return mapError(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx): Promise<NextResponse> {
  try {
    await requireRole(["admin", "super_admin"]);
    const { id: userId } = await ctx.params;
    const existing = await staffService.adminGetUserHotelStaff(userId);
    if (!existing) {
      return NextResponse.json(
        { message: "HotelStaff profil topilmadi" },
        { status: 404 },
      );
    }
    await staffService.adminUnlinkHotelStaff(existing.id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return mapError(e);
  }
}
