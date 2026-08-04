import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { feedbackService, reportsQuerySchema } from "@/src/modules/feedback";

export async function GET(req: Request) {
  try {
    await requireRole(["support", "admin", "super_admin"]);

    const url = new URL(req.url);
    const parsed = reportsQuerySchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validatsiya xatosi", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const reports = await feedbackService.reports(parsed.data.days);
    return NextResponse.json({ reports }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    console.error("[support/feedback/reports]", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
