import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/authz";
import { feedbackService } from "@/src/modules/feedback";

const bodySchema = z.object({
  limitPerSource: z.number().int().min(1).max(500).optional().default(100),
});

/** Backfill support inbox from existing review tables (idempotent). */
export async function POST(req: Request) {
  try {
    await requireRole(["support", "admin", "super_admin"]);
    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }

    const result = await feedbackService.syncFromSources(parsed.data.limitPerSource);
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
