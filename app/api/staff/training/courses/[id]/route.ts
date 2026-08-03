import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { staffService } from "@/src/modules/staff";
import { mapStaffError, STAFF_ROLES } from "../../../_utils";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole([...STAFF_ROLES]);
    const { id } = await ctx.params;
    const data = await staffService.getCourse(actor.id, id);
    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    return mapStaffError(e);
  }
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole([...STAFF_ROLES]);
    const { id } = await ctx.params;
    const data = await staffService.enroll(actor.id, id);
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return mapStaffError(e);
  }
}
