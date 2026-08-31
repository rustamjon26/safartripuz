import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { patchShiftSchema, staffService } from "@/src/modules/staff";
import { mapStaffError, STAFF_ROLES } from "../../_utils";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole([...STAFF_ROLES]);
    const { id } = await ctx.params;
    const json = await req.json();
    const parsed = patchShiftSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }
    const shift = await staffService.patchShift(actor.id, id, parsed.data.status);
    return NextResponse.json({ shift }, { status: 200 });
  } catch (e) {
    return mapStaffError(e);
  }
}
