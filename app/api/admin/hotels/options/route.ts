import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { staffService } from "@/src/modules/staff";

/** Compact hotel list for admin staff-link selects. */
export async function GET(): Promise<NextResponse> {
  try {
    await requireRole(["admin", "super_admin"]);
    const hotels = await staffService.adminListHotelsForSelect();
    return NextResponse.json({ hotels }, { status: 200 });
  } catch (e) {
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
    console.error("[admin-hotel-options]", e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
