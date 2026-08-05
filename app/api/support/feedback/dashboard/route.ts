import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import {
  dashboardQuerySchema,
  feedbackService,
} from "@/src/modules/feedback";

export async function GET(req: Request) {
  try {
    await requireRole(["support", "admin", "super_admin"]);

    const url = new URL(req.url);
    const parsed = dashboardQuerySchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validatsiya xatosi", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const dashboard = await feedbackService.dashboard(parsed.data.days);
    return NextResponse.json(
      { dashboard },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
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
    console.error("[support/feedback/dashboard]", e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
