import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { sendMessageSchema, staffService } from "@/src/modules/staff";
import { mapStaffError, STAFF_ROLES } from "../../../../_utils";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole([...STAFF_ROLES]);
    const { id } = await ctx.params;
    const data = await staffService.listMessages(actor.id, id);
    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    return mapStaffError(e);
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole([...STAFF_ROLES]);
    const { id } = await ctx.params;
    const json = await req.json();
    const parsed = sendMessageSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }
    const message = await staffService.sendMessage(
      actor.id,
      id,
      parsed.data.body,
    );
    return NextResponse.json({ message }, { status: 201 });
  } catch (e) {
    return mapStaffError(e);
  }
}
