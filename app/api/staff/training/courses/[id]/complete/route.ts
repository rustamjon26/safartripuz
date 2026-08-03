import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { completeModuleSchema, staffService } from "@/src/modules/staff";
import { mapStaffError, STAFF_ROLES } from "../../../../_utils";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole([...STAFF_ROLES]);
    const { id } = await ctx.params;
    const json = await req.json();
    const parsed = completeModuleSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }
    const data = await staffService.completeModule(
      actor.id,
      id,
      parsed.data.moduleId,
    );
    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    return mapStaffError(e);
  }
}
