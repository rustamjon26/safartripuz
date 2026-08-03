import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import {
  feedbackService,
  listFeedbackQuerySchema,
} from "@/src/modules/feedback";

export async function GET(req: Request) {
  try {
    await requireRole(["support", "admin", "super_admin"]);
    const url = new URL(req.url);
    const parsed = listFeedbackQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      channel: url.searchParams.get("channel") ?? undefined,
      rating: url.searchParams.get("rating") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await feedbackService.list(parsed.data);
    return NextResponse.json(result, { status: 200 });
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
