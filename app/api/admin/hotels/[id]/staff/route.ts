import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import {
  adminLinkHotelStaffSchema,
  adminPatchHotelStaffSchema,
  StaffNotFoundError,
  staffService,
} from "@/src/modules/staff";

type Ctx = { params: Promise<{ id: string }> };

function mapAdminStaffError(e: unknown): NextResponse {
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
  if (msg === "USER_NOT_FOUND") {
    return NextResponse.json(
      { message: "Foydalanuvchi topilmadi" },
      { status: 404 },
    );
  }
  if (msg === "FIRST_NAME_REQUIRED") {
    return NextResponse.json(
      { message: "Yangi xodim uchun ism majburiy" },
      { status: 400 },
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
          "Bu foydalanuvchi boshqa mehmonxonaga biriktirilgan. Qayta biriktirish uchun reassign=true yuboring.",
      },
      { status: 409 },
    );
  }
  if (msg === "HOTEL_NOT_FOUND" || msg === "STAFF_NOT_FOUND") {
    return NextResponse.json({ message: "Topilmadi" }, { status: 404 });
  }
  console.error("[admin-hotel-staff]", e);
  return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
}

export async function GET(_req: Request, ctx: Ctx): Promise<NextResponse> {
  try {
    await requireRole(["admin", "super_admin"]);
    const { id: hotelId } = await ctx.params;
    const staff = await staffService.adminListHotelStaff(hotelId);
    return NextResponse.json({ staff }, { status: 200 });
  } catch (e) {
    return mapAdminStaffError(e);
  }
}

export async function POST(req: Request, ctx: Ctx): Promise<NextResponse> {
  try {
    await requireRole(["admin", "super_admin"]);
    const { id: hotelId } = await ctx.params;
    const parsed = adminLinkHotelStaffSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: parsed.error.issues[0]?.message ?? "Validatsiya xatosi",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await staffService.adminLinkHotelStaff(hotelId, parsed.data);
    return NextResponse.json(result, { status: result.createdUser ? 201 : 200 });
  } catch (e) {
    return mapAdminStaffError(e);
  }
}

export async function PATCH(req: Request, ctx: Ctx): Promise<NextResponse> {
  try {
    await requireRole(["admin", "super_admin"]);
    await ctx.params; // hotel id in path — staff may move via body.hotelId
    const parsed = adminPatchHotelStaffSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: parsed.error.issues[0]?.message ?? "Validatsiya xatosi",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { staffId, ...patch } = parsed.data;
    const staff = await staffService.adminPatchHotelStaff({ staffId, ...patch });
    return NextResponse.json({ staff }, { status: 200 });
  } catch (e) {
    return mapAdminStaffError(e);
  }
}

export async function DELETE(req: Request, ctx: Ctx): Promise<NextResponse> {
  try {
    await requireRole(["admin", "super_admin"]);
    await ctx.params;
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId") ?? searchParams.get("id");
    if (!staffId) {
      return NextResponse.json({ message: "staffId kerak" }, { status: 400 });
    }
    await staffService.adminUnlinkHotelStaff(staffId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return mapAdminStaffError(e);
  }
}
