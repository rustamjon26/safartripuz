import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { feedbackService } from "@/src/modules/feedback";

export async function GET() {
  try {
    await requireRole(["support", "admin", "super_admin"]);
    const overview = await feedbackService.overview();
    return NextResponse.json({ overview }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
