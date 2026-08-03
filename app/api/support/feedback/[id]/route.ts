import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import {
  FeedbackNotFoundError,
  FeedbackStatusError,
  feedbackService,
  patchTicketSchema,
} from "@/src/modules/feedback";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["support", "admin", "super_admin"]);
    const { id } = await ctx.params;
    const ticket = await feedbackService.get(id);
    return NextResponse.json({ ticket }, { status: 200 });
  } catch (e) {
    return mapError(e);
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["support", "admin", "super_admin"]);
    const { id } = await ctx.params;
    const json = await req.json();
    const parsed = patchTicketSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }
    const ticket = await feedbackService.patch(id, parsed.data);
    return NextResponse.json({ ticket }, { status: 200 });
  } catch (e) {
    return mapError(e);
  }
}

function mapError(e: unknown) {
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
