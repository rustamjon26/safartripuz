import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import {
  FeedbackNotFoundError,
  FeedbackStatusError,
  feedbackService,
  replyBodySchema,
} from "@/src/modules/feedback";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole(["support", "admin", "super_admin"]);
    const { id } = await ctx.params;
    const json = await req.json();
    const parsed = replyBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }

    const ticket = await feedbackService.reply({
      ticketId: id,
      authorUserId: actor.id,
      body: parsed.data.body,
    });
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (e) {
    if (e instanceof FeedbackNotFoundError) {
      return NextResponse.json({ message: e.message }, { status: 404 });
    }
    if (e instanceof FeedbackStatusError) {
      return NextResponse.json({ message: e.message }, { status: 409 });
    }
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
